// The publishers: the word list copy, the guard, each platform's words, the
// switches, the once-per-platform ledger and cap, and every platform's calls
// against a stand-in fetch (no network). `node --test reels-src/test/*.test.mjs`
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { teamOf } from "../facts.mjs";
import { bannedIn, checkPost } from "../publish/guard.mjs";
import { blueskyPost, captionsFor, wordsOf } from "../publish/captions.mjs";
import { publishReels, settings, summaryHtml } from "../publish/publish.mjs";
import { memoryStore, posted, record, releaseStore, seal, sentInDay, unseal } from "../publish/store.mjs";
import { MANIFEST, SOURCE, VENDOR, mobileDir, render, verify } from "../publish/vendor-words.mjs";
import { youtube } from "../publish/platforms/youtube.mjs";
import { bluesky } from "../publish/platforms/bluesky.mjs";
import { facebook } from "../publish/platforms/facebook.mjs";
import { instagram, threads } from "../publish/platforms/meta.mjs";
import { redact } from "../publish/platforms/http.mjs";
import { run, tgCaption, variantFor, VARIANTS, readInputs } from "../make.mjs";

const GSW = teamOf({ abbreviation: "GSW", name: "Golden State Warriors", city: "San Francisco", nickname: "Warriors", primary_color: "#1D428A" });
const SAS = teamOf({ abbreviation: "SAS", name: "San Antonio Spurs", city: "San Antonio", nickname: "Spurs", primary_color: "#C4CED4" });
const POR = teamOf({ abbreviation: "POR", name: "Portland Trail Blazers", city: "Portland", nickname: "Trail Blazers", primary_color: "#E03A3E" });
const tonight = { kind: "tonight", key: "tonight:2026-11-13:g1", home: SAS, away: GSW, pick: "SAS", pickHome: true, pct: 84, tip: "9:30 PM ET", day: "Fri, Nov 13", sealedAt: "10:01 AM ET", preseason: false, reason: { title: "The injury report", line: "Golden State without Jimmy Butler, Stephen Curry and 3 more" } };
const missed = { kind: "graded", key: "graded:2026-11-12:g0", home: SAS, away: GSW, pick: "SAS", pickHome: true, other: "GSW", pct: 71, homeScore: 101, awayScore: 109, correct: false, day: "Thu, Nov 12", record: { right: 128, wrong: 46, n: 174, rate: 73.6 } };
const held = { ...missed, homeScore: 118, awayScore: 104, correct: true };

// ── the word list copy ───────────────────────────────────────────────────
test("the app's word list copy: never edited by hand, and current wherever the app's source is on disk", (t) => {
  const vendored = readFileSync(VENDOR, "utf8"), manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  assert.deepEqual(verify({ vendored, manifest }), []);
  assert.match(verify({ vendored: vendored + "// x\n", manifest })[0], /edited by hand/);
  const dir = mobileDir();
  if (!dir) { t.diagnostic("clutch-mobile is not on this machine (CI): the drift check runs on the Mac and in clutch-verify"); return; }
  const ts = readFileSync(resolve(dir, SOURCE), "utf8");
  assert.deepEqual(verify({ vendored, manifest, ts }), [], "the app's list changed: node reels-src/publish/vendor-words.mjs");
  // a change in the app's list is caught
  const changed = ts.replace('{ id: "parlay"', '{ id: "teaser", re: /\\bteasers?\\b/i },\n  { id: "parlay"');
  assert.match(verify({ vendored, manifest, ts: changed })[0], /changed since the copy/);
  assert.equal(render(ts), vendored);
});

// ── the guard ────────────────────────────────────────────────────────────
test("the guard: the app's words (with the ones the site's copy lacks), the site's, and public claims", () => {
  assert.ok(bannedIn("Back the Spurs tonight").includes("back_a_side"));
  assert.ok(bannedIn("beat the house").includes("the_house"));
  assert.ok(bannedIn("the closing line moved").includes("closing_line"));
  assert.ok(bannedIn("A guaranteed winner").includes("guarantee"));
  assert.ok(bannedIn("Clutch beats the market").includes("beats_the_market"));
  assert.ok(bannedIn("Make money with Clutch").includes("money"));
  assert.ok(bannedIn("the odds say").includes("odds"));
  assert.ok(bannedIn("100% right").includes("100%"));
  assert.deepEqual(bannedIn("Go back to Tonight. The lock screen widget."), []);
  assert.deepEqual(checkPost({ title: "fine", tags: ["NBA", "parlay"] }).hits, ["tags: parlay"]);
});

// ── the words ────────────────────────────────────────────────────────────
test("every platform's words: the hook first (number or outcome), within each platform's limits, clean", () => {
  for (const p of [tonight, missed, held, { ...tonight, home: POR, pick: "POR", preseason: true, reason: null }]) {
    const c = captionsFor(p);
    assert.ok(c.youtube.title.length <= 100 && c.youtube.title.endsWith(" #Shorts"), c.youtube.title);
    assert.ok(!/[<>]/.test(c.youtube.title));
    assert.ok(Buffer.byteLength(c.youtube.description) <= 5000);
    assert.ok(Buffer.byteLength(c.threads.text) <= 500);
    assert.ok([...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(c.bluesky.text)].length <= 300);
    assert.ok(c.instagram.caption.length <= 2200 && (c.instagram.caption.match(/#/g) ?? []).length <= 30);
    assert.ok((c.threads.text.match(/#\w+/g) ?? []).length === 1);
    for (const [k, w] of Object.entries(c)) assert.deepEqual(checkPost(wordsOf(w)).hits, [], k);
  }
  assert.match(captionsFor(tonight).youtube.title, /^Clutch: Spurs 84% to beat the Warriors tonight\. #Shorts$/);
  assert.match(captionsFor(missed).instagram.caption, /^Clutch gave the Warriors 29%\. They won 109–101\./);
  assert.match(captionsFor(held).threads.text, /^Clutch said 71%\. The Spurs won 118–104\./);
  assert.match(captionsFor(missed).youtube.description, /utm_source=youtube&utm_medium=reel&utm_campaign=graded/);
  assert.match(captionsFor(tonight).tiktok.caption, /#NBA #Warriors #Spurs/);
  assert.match(captionsFor({ ...tonight, home: POR, pick: "POR" }).tiktok.caption, /#TrailBlazers/);
});

test("Bluesky facets: links and tags at UTF-8 byte offsets", () => {
  const p = blueskyPost("Spurs 84% · tonight\nclutchledger.com\n#NBA #Spurs", { "clutchledger.com": "https://clutchledger.com/?utm_source=bluesky" });
  const bytes = Buffer.from(p.text);
  const at = (f) => bytes.subarray(f.index.byteStart, f.index.byteEnd).toString();
  assert.deepEqual(p.facets.map(at), ["clutchledger.com", "#NBA", "#Spurs"]);
  assert.equal(p.facets[0].features[0].uri, "https://clutchledger.com/?utm_source=bluesky");
  assert.equal(p.facets[1].features[0].tag, "NBA");
});

// ── switches, ledger, cap ────────────────────────────────────────────────
test("switches: off unless set; a dry run never turns publishing on", () => {
  assert.equal(settings({}).mode, "off");
  assert.equal(settings({ PUBLISH: "on" }).mode, "on");
  assert.equal(settings({ PUBLISH: "on" }, { dry: true }).mode, "dry");
  assert.equal(settings({ PUBLISH: "off" }, { dry: true }).mode, "off");
  assert.equal(settings({ PUBLISH: "yes" }).mode, "off");
  assert.deepEqual(settings({ PUBLISH_YOUTUBE: "on", PUBLISH_THREADS: "ON " }).on, { youtube: true, instagram: false, facebook: false, threads: true, bluesky: false });
  assert.equal(settings({}).cap, 2);
  assert.equal(settings({ PUBLISH_CAP: "99" }).cap, 10);
});

test("the ledger: a pending or done post counts as posted; the cap is a rolling day", () => {
  const l = { version: 1, posts: [] };
  record(l, { key: "a", platform: "youtube", state: "pending", at: "2026-11-15T15:00:00Z" });
  assert.ok(posted(l, "a", "youtube"));
  record(l, { key: "a", platform: "youtube", state: "failed" });
  assert.ok(!posted(l, "a", "youtube"));
  assert.equal(l.posts.length, 1);
  record(l, { key: "b", platform: "youtube", state: "done", at: "2026-11-15T15:00:00Z" });
  assert.equal(sentInDay(l, "youtube", Date.parse("2026-11-16T14:00:00Z")), 1);
  assert.equal(sentInDay(l, "youtube", Date.parse("2026-11-16T16:00:00Z")), 0);
});

test("tokens at rest: sealed with the key, unreadable without it", () => {
  const b = seal({ threads: { token: "abc" } }, "k1");
  assert.deepEqual(unseal(b, "k1"), { threads: { token: "abc" } });
  assert.throws(() => unseal(b, "k2"));
  assert.ok(!b.includes("abc"));
});

const reel = (plan) => ({ kind: plan.kind, key: plan.key, plan, mp4: Buffer.alloc(2048, 1), dur: 15 });
const fake = (name, { needsUrl = false, fail = null } = {}) => {
  const calls = [];
  return { calls, name, label: name, captions: "facebook", secrets: [`${name.toUpperCase()}_KEY`], needsUrl, preview: (w) => ({ w }),
    async publish(arg) { calls.push(arg); if (fail) throw new Error(fail); return { id: `${name}-${calls.length}`, url: `https://x/${name}/${calls.length}` }; } };
};

test("a live run: each reel once per platform, the cap, a held word, a failure tried again, a missing secret said", async () => {
  const A = fake("alpha"), B = fake("beta", { needsUrl: true }), C = fake("gamma", { fail: "boom" }), D = fake("delta");
  const env = { PUBLISH: "on", PUBLISH_ALPHA: "on", PUBLISH_BETA: "on", PUBLISH_GAMMA: "on", PUBLISH_DELTA: "on", PUBLISH_CAP: "1", ALPHA_KEY: "k", BETA_KEY: "k", GAMMA_KEY: "k" };
  const store = memoryStore();
  const plats = [A, B, C, D];
  const r1 = await publishReels([reel(missed), reel(tonight)], { env, store, platforms: plats, log: () => {}, now: Date.parse("2026-11-15T15:30:00Z") });
  const st = (p, k) => r1.rows.find((r) => r.platform === p && (k ? r.key === k : true));
  assert.equal(st("alpha", missed.key).status, "posted");
  assert.equal(st("alpha", tonight.key).status, "skipped"); // cap 1
  assert.match(st("alpha", tonight.key).why, /daily cap/);
  assert.equal(B.calls[0].url, "https://example.invalid/dry-run/graded-2026-11-12.mp4");
  assert.equal(st("gamma", missed.key).status, "failed");
  assert.match(st("delta").why, /no DELTA_KEY/);
  assert.equal(store.ledger.posts.find((p) => p.platform === "gamma").state, "failed");
  // the next day: alpha's graded reel is not posted again, gamma's is tried again
  const r2 = await publishReels([reel(missed)], { env, store, platforms: plats, log: () => {}, now: Date.parse("2026-11-16T16:00:00Z") });
  assert.equal(r2.rows.find((r) => r.platform === "alpha").why, "already posted");
  assert.equal(C.calls.length, 3); // a failure uses no cap: both reels were tried on day one, the graded one again on day two
  assert.equal(A.calls.length, 1);
  // a reel whose words fail the guard is held back everywhere and never sent
  const bad = { ...tonight, key: "tonight:x", reason: { title: "x", line: "the best bet on the board" } };
  const r3 = await publishReels([reel(bad)], { env: { ...env, PUBLISH_CAP: "5" }, store, platforms: [A], log: () => {} });
  assert.equal(r3.rows[0].status, "held");
  assert.equal(A.calls.length, 1);
  // a run that died after "pending" never posts that reel again
  record(store.ledger, { key: "tonight:y", platform: "alpha", state: "pending", at: new Date().toISOString() });
  const s2 = memoryStore(store.ledger);
  const r4 = await publishReels([reel({ ...tonight, key: "tonight:y" })], { env: { ...env, PUBLISH_CAP: "5" }, store: s2, platforms: [A], log: () => {} });
  assert.equal(r4.rows[0].why, "already posted");
  assert.match(summaryHtml(r1), /✅ alpha graded <a href="https:\/\/x\/alpha\/1">open<\/a>/);
});

test("a dry run: what each platform would get, nothing sent, even without secrets", async () => {
  const A = fake("alpha");
  const r = await publishReels([reel(tonight)], { env: { PUBLISH: "on", PUBLISH_ALPHA: "on" }, store: memoryStore(), platforms: [A], dry: true, log: () => {} });
  assert.equal(r.mode, "dry");
  assert.equal(r.rows[0].status, "dry");
  assert.match(r.rows[0].why, /no ALPHA_KEY yet/);
  assert.equal(A.calls.length, 0);
  assert.equal((await publishReels([reel(tonight)], { env: {}, store: memoryStore(), platforms: [A] })).rows.length, 0);
});

// ── each platform's calls, against a stand-in fetch ─────────────────────
function stub(routes) {
  const seen = [];
  const f = async (url, init = {}) => {
    seen.push({ url: String(url), init });
    const hit = routes.find(([re]) => re.test(String(url)));
    if (!hit) throw new Error(`no stub for ${url}`);
    const [, res] = hit;
    const v = typeof res === "function" ? res(String(url), init, seen) : res;
    const headers = new Headers(v.headers ?? {});
    return new Response(v.body === undefined ? JSON.stringify(v.json ?? {}) : v.body, { status: v.status ?? 200, headers });
  };
  f.seen = seen;
  return f;
}
const noSleep = async () => {};

test("YouTube: token from the refresh token, a resumable upload, public Short, made-for-kids said", async () => {
  const f = stub([
    [/oauth2\.googleapis\.com\/token/, { json: { access_token: "ya29.ACCESS" } }],
    [/upload\/youtube\/v3\/videos\?uploadType=resumable/, { headers: { location: "https://www.googleapis.com/upload/youtube/v3/videos?upload_id=U1" } }],
    [/upload_id=U1/, { json: { id: "VID123", status: { privacyStatus: "public" } } }],
  ]);
  const w = captionsFor(tonight).youtube;
  const r = await youtube.publish({ mp4: Buffer.alloc(10), words: w }, { env: { YT_CLIENT_ID: "c", YT_CLIENT_SECRET: "s", YT_REFRESH_TOKEN: "r" }, fetchImpl: f });
  assert.deepEqual([r.id, r.url, r.note], ["VID123", "https://youtube.com/shorts/VID123", null]);
  const meta = JSON.parse(f.seen[1].init.body);
  assert.equal(meta.status.privacyStatus, "public");
  assert.equal(meta.status.selfDeclaredMadeForKids, false);
  assert.equal(meta.snippet.title, w.title);
  assert.equal(f.seen[2].init.method, "PUT");
  assert.equal(f.seen[1].init.headers["X-Upload-Content-Length"], "10");
});

test("Bluesky: app password, service auth on the account's own server, video job, post with the video", async () => {
  const f = stub([
    [/createSession/, { json: { accessJwt: "JWT-AAAAAAAA", did: "did:plc:abc", handle: "getclutchledger.bsky.social", didDoc: { service: [{ id: "#atproto_pds", serviceEndpoint: "https://pds.example.host" }] } } }],
    [/getServiceAuth/, { json: { token: "SVC-TOKEN-1" } }],
    [/uploadVideo/, { json: { jobId: "J1", state: "JOB_STATE_CREATED" } }],
    [/getJobStatus/, (u, i, seen) => ({ json: { jobStatus: seen.filter((s) => /getJobStatus/.test(s.url)).length < 2 ? { state: "JOB_STATE_ENCODING" } : { state: "JOB_STATE_COMPLETED", blob: { $type: "blob", ref: { $link: "bafy" }, mimeType: "video/mp4", size: 10 } } } })],
    [/createRecord/, { json: { uri: "at://did:plc:abc/app.bsky.feed.post/3kpost", cid: "c" } }],
  ]);
  const r = await bluesky.publish({ mp4: Buffer.alloc(10), words: captionsFor(missed).bluesky, meta: { key: missed.key, width: 1080, height: 1920, alt: "alt" } }, { env: { BSKY_HANDLE: "h", BSKY_APP_PASSWORD: "pw-pw-pw-pw" }, fetchImpl: f, sleep: noSleep });
  assert.equal(r.url, "https://bsky.app/profile/getclutchledger.bsky.social/post/3kpost");
  assert.match(f.seen[1].url, /^https:\/\/pds\.example\.host\/xrpc\/com\.atproto\.server\.getServiceAuth\?aud=did%3Aweb%3Apds\.example\.host&lxm=com\.atproto\.repo\.uploadBlob/);
  assert.equal(f.seen[2].init.headers.Authorization, "Bearer SVC-TOKEN-1");
  const rec = JSON.parse(f.seen.at(-1).init.body).record;
  assert.equal(rec.embed.$type, "app.bsky.embed.video");
  assert.deepEqual(rec.embed.aspectRatio, { width: 1080, height: 1920 });
  assert.ok(rec.facets.length >= 2);
});

test("Facebook Reels: start, the bytes to rupload, finish as published; a slow processing is a note, never a retry", async () => {
  const routes = (statusJson) => stub([
    [/video_reels/, (u, init) => ({ json: new URLSearchParams(init.body).get("upload_phase") === "start" ? { video_id: "V9", upload_url: "https://rupload.facebook.com/video-upload/v27.0/V9" } : { success: true } })],
    [/rupload\.facebook\.com/, { json: { success: true } }],
    [/\/V9\?fields=status/, { json: statusJson }],
  ]);
  const env = { FB_PAGE_ID: "P1", FB_PAGE_TOKEN: "PAGE-TOKEN-123" };
  const f = routes({ status: { video_status: "ready" } });
  const r = await facebook.publish({ mp4: Buffer.alloc(10), words: captionsFor(tonight).facebook }, { env, fetchImpl: f, sleep: noSleep });
  assert.deepEqual([r.id, r.url, r.note], ["V9", "https://www.facebook.com/reel/V9", null]);
  assert.equal(f.seen[1].init.headers.Authorization, "OAuth PAGE-TOKEN-123");
  assert.equal(f.seen[1].init.headers.file_size, "10");
  const fin = new URLSearchParams(f.seen[2].init.body);
  assert.deepEqual([fin.get("upload_phase"), fin.get("video_state")], ["finish", "PUBLISHED"]);
  const bad = await facebook.publish({ mp4: Buffer.alloc(10), words: captionsFor(tonight).facebook }, { env, fetchImpl: routes({ status: { video_status: "error" } }), sleep: noSleep });
  assert.match(bad.note, /posted, but/);
});

test("Instagram and Threads: the video's direct address (no redirect), a container, processed, published", async () => {
  const mk = (host, field) => stub([
    [/github\.com\/.*releases\/download/, { status: 302, headers: { location: "https://release-assets.githubusercontent.com/signed/x.mp4?sig=1" } }],
    [/release-assets/, { status: 200 }],
    [/\/me\?fields=user_id/, { json: { user_id: "1789" } }],
    [new RegExp(`${host}.*/(media|threads)$`), { json: { id: "C1" } }],
    [/\/C1\?fields=/, (u, i, seen) => ({ json: { [field]: seen.filter((s) => /\/C1\?/.test(s.url)).length < 2 ? "IN_PROGRESS" : "FINISHED" } })],
    [/(media_publish|threads_publish)$/, { json: { id: "M1" } }],
    [/\/M1\?fields=permalink/, { json: { permalink: "https://www.instagram.com/reel/abc/" } }],
  ]);
  const url = "https://github.com/uguraltunbas/getclutch-app/releases/download/reels-state/graded-2026-11-12.mp4";
  const fi = mk("graph\\.instagram\\.com", "status_code");
  const ri = await instagram.publish({ url, words: captionsFor(missed).instagram }, { env: {}, token: "IGTOKEN-123", fetchImpl: fi, sleep: noSleep });
  assert.equal(ri.id, "M1");
  const ci = new URLSearchParams(fi.seen.find((s) => /1789\/media$/.test(s.url)).init.body);
  assert.deepEqual([ci.get("media_type"), ci.get("video_url")], ["REELS", "https://release-assets.githubusercontent.com/signed/x.mp4?sig=1"]);
  assert.match(fi.seen.find((s) => /1789\/media$/.test(s.url)).url, /graph\.instagram\.com\/v27\.0/);
  const ft = mk("graph\\.threads\\.com", "status");
  const rt = await threads.publish({ url, words: captionsFor(missed).threads }, { env: {}, token: "THTOKEN-123", fetchImpl: ft, sleep: noSleep });
  assert.equal(rt.id, "M1");
  const ct = ft.seen.find((s) => /graph\.threads\.com\/v1\.0\/me\/threads$/.test(s.url));
  assert.equal(new URLSearchParams(ct.init.body).get("media_type"), "VIDEO");
});

test("errors never carry a secret", () => {
  assert.equal(redact("bad token SECRET-123456 in url?access_token=zzz&x=1", ["SECRET-123456"]), "bad token <secret> in url?access_token=<secret>&x=1");
});

test("the state release: made once as a prerelease, the ledger read and written as an asset", async () => {
  let assets = [], made = null;
  const f = async (url, init = {}) => {
    const u = String(url), m = init.method ?? "GET";
    const J = (v, s = 200) => new Response(JSON.stringify(v), { status: s });
    if (/releases\/tags\/reels-state$/.test(u)) return made ? J(made) : J({}, 404);
    if (/\/releases$/.test(u) && m === "POST") { made = { id: 7, ...JSON.parse(init.body) }; return J(made, 201); }
    if (/releases\/7\/assets\?per_page/.test(u)) return J(assets);
    if (/uploads\.github\.com/.test(u)) { const name = new URL(u).searchParams.get("name"); const a = { id: assets.length + 1, name, url: `https://api/asset/${name}`, browser_download_url: `https://github.com/o/r/releases/download/reels-state/${name}`, body: Buffer.from(init.body), created_at: new Date().toISOString() }; assets.push(a); return J(a, 201); }
    if (/releases\/assets\/\d+$/.test(u) && m === "DELETE") { assets = assets.filter((a) => `${a.id}` !== u.split("/").pop()); return new Response(null, { status: 204 }); }
    if (/https:\/\/api\/asset\//.test(u)) return new Response(assets.find((a) => a.url === u).body);
    throw new Error(`unexpected ${m} ${u}`);
  };
  const s = releaseStore({ repo: "o/r", token: "ghs_x", secret: "k", fetchImpl: f });
  assert.deepEqual(await s.load(), { version: 1, posts: [] });
  assert.equal(made.prerelease, true);
  await s.save({ version: 1, posts: [{ key: "a", platform: "youtube", state: "done" }] });
  await s.save({ version: 1, posts: [{ key: "b", platform: "youtube", state: "done" }] });
  assert.equal(assets.filter((a) => a.name === "ledger.json").length, 1);
  assert.equal((await s.load()).posts[0].key, "b");
  assert.match(await s.hostVideo("graded-2026-11-12.mp4", Buffer.alloc(3)), /releases\/download\/reels-state\/graded-2026-11-12\.mp4$/);
  await s.saveTokens({ threads: { token: "T" } });
  assert.deepEqual(await s.loadTokens(), { threads: { token: "T" } });
  assert.ok(!assets.find((a) => a.name === "tokens.enc").body.toString().includes("\"T\""));
});

// ── the run: Telegram carries the TikTok caption, then where the reels went ──
test("a run with publishing: the TikTok caption under the video, then one line of where each reel went", async () => {
  const sent = [], lines = [];
  const T = { video: async (mp4, html) => sent.push(html), line: async (h) => lines.push(h) };
  const F = { graded: async () => missed, tonight: async () => tonight };
  const draw = async () => ({ mp4: Buffer.from("x"), png: Buffer.from("p"), texts: ["Spurs to win."], dur: 15 });
  const out = (await import("node:os")).tmpdir() + "/reels-pub-test";
  let got = null;
  const publish = async (made) => { got = made; return { mode: "on", rows: [{ platform: "youtube", key: made[0].key, status: "posted", url: "https://youtube.com/shorts/x" }] }; };
  const r = await run({ date: "2026-11-13", out, dry: false }, { F, T, draw, publish, chrome: async () => ({ cdp: null, close() {} }), log: () => {} });
  assert.deepEqual(got.map((m) => m.kind), ["graded", "tonight"]);
  assert.match(sent[0], /For TikTok/);
  assert.match(sent[0], /Clutch gave the Warriors 29%\. They won 109–101\./);
  assert.ok(sent[0].length <= 1024);
  assert.match(lines.at(-1), /Auto-posting[\s\S]*YouTube Shorts graded <a href/);
  assert.equal(r.failed.length, 0);
  assert.ok(existsSync(out + "/graded.tiktok.txt"));
  assert.ok(tgCaption(tonight, "a").length < 1024);
});

test("the hooks take turns by day, and a preview can ask for one", () => {
  for (const kind of ["tonight", "graded"]) {
    const a = variantFor(kind, "2026-11-15"), b = variantFor(kind, "2026-11-16"), c = variantFor(kind, "2026-11-17");
    assert.notEqual(a, b);
    assert.equal(a, c);
    assert.ok(VARIANTS[kind].includes(a));
  }
  assert.equal(readInputs(["--variant", "versus"], {}).variant, "versus");
  assert.throws(() => readInputs(["--variant", "x"], {}));
});
