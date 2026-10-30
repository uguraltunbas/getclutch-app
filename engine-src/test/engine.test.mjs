// The content engine's public half (t70): the facts each post is drawn from,
// the three checks, the radar client, one run end to end with the drawing
// stubbed, and — with Chrome on the machine — the drawing itself: the same
// frame twice is the same picture, and every drawn word is read.
//
//   node --test engine-src/test/*.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { facts, gotnRuns, mondayOf, movedInput, slugOf } from "../facts.mjs";
import { fresh, RULES, sealed, words } from "../checks.mjs";
import { radar } from "../ingest.mjs";
import { readInputs, run } from "../make.mjs";
import { fakeDb, fakeRuns, G, LAST_NIGHT, NOW, rows, TODAY, weekSeals } from "./fixture.mjs";

const F = (r = rows(), runs = async () => fakeRuns()) => facts(fakeDb(r), { runs });
const H = 3600e3;
const movedExtra = { batch: "moved", game: G.nykPhi, player: "Joel Embiid", team: "PHI", status: "out", sealedHome: 0.4456, whatIfHome: 0.371, newsAt: "3:40 PM ET", source: "Injury report" };

// ── facts ──

test("dates and names: a week runs Monday to Sunday, a player's name becomes a key part", () => {
  assert.equal(mondayOf("2026-10-25"), "2026-10-19"); // Sunday
  assert.equal(mondayOf("2026-10-19"), "2026-10-19");
  assert.equal(mondayOf("2026-10-30"), "2026-10-26");
  assert.equal(slugOf("Luka Dončić"), "luka-doncic");
  assert.equal(slugOf("De'Aaron Fox"), "de-aaron-fox");
});

test("tonight: the games still ahead, each with its newest seal's number; the post ends at the first tip", async () => {
  const p = await F().plan("tonight", TODAY);
  assert.equal(p.key, `tonight:${TODAY}`);
  assert.equal(p.path, "/tonight/");
  assert.equal(p.expires, "2026-10-30T23:00:00+00:00");
  assert.deepEqual(p.facts.slate.map((g) => `${g.awayAbbr}@${g.homeAbbr}`), ["NYK@PHI", "CHA@WAS", "ATL@CLE"]); // the postponed game is out
  assert.equal(p.facts.slate[0].homeWinProb, 0.4456); // seal 21, not 20
  assert.equal(p.facts.slate[0].homeName, "76ers");
  assert.equal(p.facts.gotnId, G.nykPhi);
  assert.equal(p.facts.seal.sha256, "4".repeat(64));
  assert.equal(p.proof.seal.id, 21);
});

test("tonight: nothing sealed yet, or nothing left to tip, is nothing to post", async () => {
  const r = rows();
  r.receipts = r.receipts.filter((x) => x.slate_date !== TODAY);
  assert.match((await F(r).plan("tonight", TODAY)).empty, /no sealed numbers/);
  assert.match((await F().plan("tonight", LAST_NIGHT)).empty, /has tipped/);
  assert.match((await F().plan("tonight", "2026-11-05")).empty, /no games/);
});

test("the game of the night: its page, the runs' winners only, the seal holding it", async () => {
  let asked = null;
  const p = await F(rows(), async (d) => ((asked = d), fakeRuns())).plan("gotn", TODAY);
  assert.equal(asked, TODAY);
  assert.equal(p.key, `gotn:${TODAY}`);
  assert.equal(p.path, "/games/2026-10-30/nyk-at-phi/");
  assert.equal(p.expires, "2026-10-30T23:00:00+00:00");
  assert.deepEqual(Object.keys(p.facts.runs).sort(), ["ot_runs", "winners"]);
  assert.equal(p.facts.runs.winners.length, 2000);
  assert.equal(p.proof.seal.id, 21);
  assert.equal(p.proof.runs.game_id, G.nykPhi);
});

test("the game of the night: none picked, or tipped already, and the function isn't asked", async () => {
  const r = rows();
  r.snapshots[`predictions/today/${TODAY}`].body.clutch_pick_of_day = null;
  const never = async () => assert.fail("content-gotn asked");
  assert.match((await F(r, never).plan("gotn", TODAY)).empty, /no game of the night/);
  const t = rows();
  t.games.find((g) => g.id === G.nykPhi).status = "in_progress";
  assert.match((await F(t, never).plan("gotn", TODAY)).empty, /has tipped/);
});

test("receipts: last night's calls, cut to what the drawing reads, and the night's last seal", async () => {
  const p = await F().plan("receipts", LAST_NIGHT);
  assert.equal(p.key, `receipts:${LAST_NIGHT}`);
  assert.equal(p.path, "/ledger/");
  assert.equal(p.expires, "2026-10-30T20:00:00.000Z");
  assert.equal(p.facts.calls.length, 2);
  assert.deepEqual(Object.keys(p.facts.calls[0]).sort(), ["claimed_pct", "correct", "final", "game_date", "game_id", "matchup", "pick", "season_type", "tip_utc"]);
  assert.equal(p.facts.seal.sha256, "2".repeat(64)); // seal 11; the reveal (12) isn't a seal
  assert.match((await F().plan("receipts", "2026-11-05")).empty, /nothing graded/);
});

test("the week: Monday to Sunday once it is over, keyed by its Monday", async () => {
  const r = rows();
  r.receipts.push(...weekSeals());
  const p = await F(r).plan("week", "2026-10-25");
  assert.equal(p.date, "2026-10-19");
  assert.equal(p.key, "week:2026-10-19");
  assert.equal(p.facts.calls.length, 10);
  assert.equal(p.proof.complete, true);
  assert.deepEqual(p.proof.dates, ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-24", "2026-10-25"]);
  const early = await F(r).plan("week", "2026-10-22");
  assert.match(early.empty, /isn't over/);
  assert.equal(early.date, "2026-10-19");
});

test("the week: a Ledger list cut short of Monday says so", async () => {
  const r = rows();
  const body = r.snapshots["ledger/calls"].body;
  body.calls = body.calls.filter((c) => c.game_date >= "2026-10-21");
  body.total = body.calls.length + 40;
  assert.equal((await F(r).plan("week", "2026-10-25")).proof.complete, false);
});

test("the number moved: the radar's What-If beside the public seal's number, on the game's page", async () => {
  const p = await F().plan("moved", TODAY, { ...movedExtra, sealedHome: 0.45 });
  assert.equal(p.key, `moved:${TODAY}:${G.nykPhi}:joel-embiid`);
  assert.equal(p.path, "/games/2026-10-30/nyk-at-phi/");
  assert.equal(p.facts.moved.sealedHome, 0.4456); // the seal's, not the radar's copy
  assert.equal(p.proof.radarHome, 0.45);
  assert.equal(p.facts.moved.whatIfHome, 0.371);
  assert.equal(p.proof.whatifAt, "2026-10-30T19:03:27Z");
});

test("the number moved: the radar's facts are read before a word of them is drawn", async () => {
  for (const bad of [
    { game: "x" }, { player: "Joel 3mbiid" }, { player: "<b>Joel</b>" }, { status: "probable" }, { team: "phi" },
    { whatIfHome: 1.2 }, { sealedHome: "0.4" },
  ]) assert.ok(movedInput({ ...movedExtra, ...bad }).error, JSON.stringify(bad));
  assert.equal(movedInput({ ...movedExtra, newsAt: "soon" }).newsAt, null);
  assert.equal(movedInput({ ...movedExtra, source: "Shams <script>" }).source, "Shams script");
  await assert.rejects(F().plan("moved", TODAY, { ...movedExtra, team: "BOS" }), /doesn't play/);
  await assert.rejects(F().plan("moved", TODAY, { ...movedExtra, game: G.cleAtl }), /isn't on/);
});

test("a second game between the same sides on one date gets the site's -2 page", async () => {
  const r = rows();
  r.games.push({ ...r.games.find((g) => g.id === G.nykPhi), id: "00000000-0000-4000-8000-000000000099", game_time_utc: "2026-10-31T02:00:00+00:00" });
  const gs = await F(r).games(TODAY);
  assert.deepEqual(gs.filter((g) => g.awayAbbr === "NYK").map((g) => g.path), ["/games/2026-10-30/nyk-at-phi/", "/games/2026-10-30/nyk-at-phi-2/"]);
});

test("content-gotn: asked with the key in a header, answered with winners; the key never shows in an error", async () => {
  const key = "k".repeat(48);
  let seen = null;
  const ok = async (url, init) => ((seen = { url, init }), new Response(JSON.stringify({ game_id: G.nykPhi, runs: 3, winners: "HAH", ot_runs: 1, computed_at: "2026-10-30T19:02:30Z" })));
  const r = await gotnRuns({ url: "https://db.test/", anon: "anon", key, date: TODAY, fetchImpl: ok });
  assert.equal(seen.url, "https://db.test/functions/v1/content-gotn");
  assert.equal(seen.init.headers["x-content-key"], key);
  assert.deepEqual(JSON.parse(seen.init.body), { date: TODAY });
  assert.deepEqual(r, { game_id: G.nykPhi, runs: 3, winners: "HAH", ot_runs: 1, computed_at: "2026-10-30T19:02:30Z" });
  const no = async () => new Response(JSON.stringify({ error: "bad key" }), { status: 401 });
  await assert.rejects(gotnRuns({ url: "https://db.test", anon: "anon", key, date: TODAY, fetchImpl: no }), (e) => !e.message.includes(key) && /401/.test(e.message));
  const odd = async () => new Response(JSON.stringify({ game_id: G.nykPhi, winners: "HAXH" }));
  await assert.rejects(gotnRuns({ url: "https://db.test", anon: "anon", key, date: TODAY, fetchImpl: odd }), /without the runs/);
  await assert.rejects(gotnRuns({ url: "https://db.test", anon: "anon", key: "", date: TODAY, fetchImpl: ok }), /not set/);
});

// ── checks ──

const plan = async (series, date = TODAY, extra = movedExtra, r = rows()) => F(r).plan(series, date, extra);

test("words: nothing to hide passes; a drawn or written sportsbook word fails, and so does a page that drew nothing", () => {
  const clean = { drawn: [], caption: [], words: ["Clutch", "Knicks 55%"] };
  assert.equal(words([clean, clean]).ok, true);
  assert.match(words([clean, { ...clean, drawn: ["parlay"] }]).note, /drawn: "parlay"/);
  assert.match(words([{ ...clean, caption: ["spread"] }]).note, /caption: "spread"/);
  assert.match(words([clean, { drawn: [], caption: [], words: [] }]).note, /no drawn words/);
  assert.equal(words([]).ok, false);
});

test("sealed: the number drawn is a seal's on the chain: its hash, the one before it", async () => {
  const p = await plan("tonight");
  assert.equal(sealed(p).ok, true);
  assert.match(sealed({ ...p, proof: { ...p.proof, seal: null } }).note, /no seal/);
  assert.match(sealed({ ...p, proof: { ...p.proof, seal: { ...p.proof.seal, sha256: "abc" } } }).note, /sha256/);
  assert.match(sealed({ ...p, proof: { ...p.proof, seal: { ...p.proof.seal, prev_sha256: null } } }).note, /before it/);
});

test("sealed: a week needs a seal for every night it graded; a moved post the newest seal's number", async () => {
  const r = rows();
  r.receipts.push(...weekSeals(["2026-10-20", "2026-10-21", "2026-10-24", "2026-10-25"]));
  const w = await plan("week", "2026-10-25", {}, r);
  assert.match(sealed(w).note, /no seal for 2026-10-22/);
  const ok = await plan("moved");
  assert.equal(sealed(ok).ok, true);
  const stale = await plan("moved", TODAY, { ...movedExtra, sealedHome: 0.47 });
  assert.match(sealed(stale).note, /newest seal/);
});

test("fresh, before tip: today's seal, the right game's 2,000 runs, 20 minutes to spare", async () => {
  const t = await plan("tonight");
  assert.equal(fresh(t, NOW).ok, true);
  assert.equal(fresh(t, Date.parse("2026-10-30T22:45:00Z")).late, true);
  const yesterdays = { ...t, proof: { ...t.proof, seal: { ...t.proof.seal, committed_at: "2026-10-29T19:02:00+00:00" } } };
  assert.match(fresh(yesterdays, NOW).note, /25 hours old/); // a seal job that didn't run today
  const g = await plan("gotn");
  assert.equal(fresh(g, NOW).ok, true);
  assert.match(fresh({ ...g, proof: { ...g.proof, runs: { ...g.proof.runs, game_id: G.chaWas } } }, NOW).note, /another game/);
  assert.match(fresh({ ...g, proof: { ...g.proof, runs: { ...g.proof.runs, runs: 1000 } } }, NOW).note, /1000 runs/);
  assert.match(fresh({ ...g, proof: { ...g.proof, runs: { ...g.proof.runs, computed_at: "2026-10-28T19:00:00Z" } } }, NOW).note, /hours old/);
  assert.equal(fresh({ ...g, proof: { ...g.proof, runs: { ...g.proof.runs, computed_at: null } } }, NOW).ok, false); // an unreadable time is never fresh
  const m = await plan("moved");
  assert.equal(fresh(m, NOW).ok, true);
  assert.match(fresh({ ...m, proof: { ...m.proof, whatifAt: null } }, NOW).note, /no What-If/);
  assert.equal(fresh(m, Date.parse("2026-10-30T22:50:00Z")).late, true);
});

test("fresh, after the games: every final in, the Ledger computed after them, or wait and try again", async () => {
  const r = await plan("receipts", LAST_NIGHT);
  assert.equal(fresh(r, NOW).ok, true);
  const open = { ...r, proof: { ...r.proof, games: [...r.proof.games, { id: "x", status: "live", tipUtc: "2026-10-30T02:30:00Z" }] } };
  assert.equal(fresh(open, NOW).wait, true);
  const early = { ...r, proof: { ...r.proof, ledgerAt: "2026-10-30T05:00:00Z" } }; // the last tip + 3 h
  assert.equal(fresh(early, NOW).wait, true);
  assert.equal(RULES.graded, 4 * H);
  const rr = rows();
  rr.receipts.push(...weekSeals());
  const w = await plan("week", "2026-10-25", {}, rr);
  assert.equal(fresh(w, NOW).ok, true);
  const cut = fresh({ ...w, proof: { ...w.proof, complete: false } }, NOW);
  assert.equal(cut.ok, false);
  assert.equal(cut.wait, undefined); // a list cut short won't fill itself in: held back, not retried
});

// ── the radar client ──

test("the radar client: the key in a header, never in an error; nothing to send to without a door", async () => {
  assert.equal(radar({ url: "", key: "k" }), null);
  assert.equal(radar({ url: "https://radar.test", key: "" }), null);
  const key = "s".repeat(40);
  const calls = [];
  const R = radar({ url: "https://radar.test/", key, fetchImpl: async (url, init) => (calls.push({ url, init }), url.endsWith("/run") ? new Response(JSON.stringify({ error: "no" }), { status: 403 }) : new Response(JSON.stringify({ id: 7, order: ["video", "photo"] }))) });
  assert.deepEqual(await R.ingest({ a: 1 }), { id: 7, order: ["video", "photo"] });
  await R.put(7, "video", new Uint8Array([1, 2]));
  assert.equal(calls[0].url, "https://radar.test/content/in");
  assert.equal(calls[0].init.headers["x-content-key"], key);
  assert.equal(calls[1].url, "https://radar.test/content/in/7/video");
  assert.equal(calls[1].init.headers["content-type"], "video/mp4");
  await assert.rejects(R.report({}), (e) => /403/.test(e.message) && !e.message.includes(key));
});

// ── a run ──

test("inputs: the workflow's three, read and checked; nothing else is trusted", () => {
  const env = { INPUT_SERIES: "tonight, gotn,tonight", INPUT_DATE: TODAY, INPUT_EXTRA: '{"batch":"pretip"}', RUNNER_TEMP: "/tmp/x" };
  const i = readInputs([], env);
  assert.deepEqual(i.series, ["tonight", "gotn"]);
  assert.deepEqual(i.extra, { batch: "pretip" });
  assert.equal(i.out, "/tmp/x/clutch-content");
  assert.equal(readInputs([], { ...env, INPUT_EXTRA: "" }).extra.batch, undefined);
  assert.throws(() => readInputs([], { ...env, INPUT_SERIES: "tonight;rm -rf" }), /series/);
  assert.throws(() => readInputs([], { ...env, INPUT_DATE: "2026-10-30; x" }), /date/);
  assert.throws(() => readInputs([], { ...env, INPUT_EXTRA: "[1]" }), /object/);
  assert.throws(() => readInputs([], { ...env, INPUT_EXTRA: "{" }), /JSON/);
});

const fakeDraw = (lint = { drawn: [], caption: [], words: ["Clutch"] }) => async (_cdp, p) => ({
  caption: { short: `${p.series} short`, long: `${p.series} long` }, title: p.series, jpeg: Buffer.from("jpeg"), mp4: Buffer.from("mp4"), lints: [lint, lint],
});

function fakeRadar({ dup = false } = {}) {
  const log = [];
  return {
    log,
    ingest: async (post) => (log.push(["ingest", post]), dup ? { id: 3, dup: true, state: "published" } : { id: 9, order: post.series === "gotn" ? ["photo", "video"] : ["video", "photo"] }),
    put: async (id, kind, bytes) => log.push(["put", id, kind, bytes.toString()]),
    report: async (r) => log.push(["report", r]),
  };
}

const runWith = (inputs, o = {}) => run({ out: mkdtempSync(join(tmpdir(), "engine-")), dry: false, ...inputs }, { F: F(o.rows, o.runs), R: o.R, now: () => o.now ?? NOW, log: () => {}, chrome: async () => ({ cdp: null, close() {} }), drawImpl: o.draw ?? fakeDraw() });

test("a run sends each post, then its files in the radar's order, then one report", async () => {
  const R = fakeRadar();
  const rep = await runWith({ series: ["tonight", "gotn"], date: TODAY, extra: { batch: "pretip" } }, { R });
  const [first, ...rest] = R.log;
  assert.equal(first[0], "ingest");
  assert.equal(first[1].key, `tonight:${TODAY}`);
  assert.deepEqual(first[1].checks.map((c) => `${c.name}:${c.ok}`), ["words:true", "fresh:true", "sealed:true"]);
  assert.equal(first[1].meta.alt, "tonight long");
  assert.deepEqual(rest.slice(0, 2), [["put", 9, "video", "mp4"], ["put", 9, "photo", "jpeg"]]);
  assert.deepEqual(rest.slice(3, 5), [["put", 9, "photo", "jpeg"], ["put", 9, "video", "mp4"]]); // gotn: the video carries the buttons
  assert.deepEqual(R.log.at(-1), ["report", rep]);
  assert.deepEqual(rep, { batch: "pretip", date: TODAY, made: [{ series: "tonight", id: 9 }, { series: "gotn", id: 9 }], empty: [], later: [], errors: [] });
});

test("a run: a post sent before isn't sent again; a held-back one still goes, marked", async () => {
  const R = fakeRadar({ dup: true });
  const rep = await runWith({ series: ["tonight"], date: TODAY, extra: {} }, { R });
  assert.deepEqual(R.log.map((x) => x[0]), ["ingest", "report"]);
  assert.deepEqual(rep.made, [{ series: "tonight", id: 3, dup: true }]);
  const R2 = fakeRadar();
  await runWith({ series: ["tonight"], date: TODAY, extra: {} }, { R: R2, draw: fakeDraw({ drawn: ["bet"], caption: [], words: ["bet"] }) });
  assert.deepEqual(R2.log[0][1].checks[0], { name: "words", ok: false, note: 'drawn: "bet"' });
});

test("a run: not graded yet waits, too close to tip is left out, a failure is reported; none of them is drawn", async () => {
  const R = fakeRadar();
  const r = rows();
  r.snapshots["ledger/calls"].at = "2026-10-30T04:00:00Z";
  const never = async () => assert.fail("drawn");
  const rep = await runWith({ series: ["receipts", "moved"], date: LAST_NIGHT, extra: { batch: "recap" } }, { R, rows: r, draw: never });
  assert.deepEqual(rep.later, [{ series: "receipts", why: "the Ledger hasn't graded the whole night yet" }]);
  assert.match(rep.errors[0].error, /no moved facts|bad game id/);
  const late = await runWith({ series: ["tonight"], date: TODAY, extra: {} }, { R: fakeRadar(), now: Date.parse("2026-10-30T22:50:00Z"), draw: never });
  assert.match(late.empty[0].why, /under 20 minutes/);
});

test("a dry run draws and checks, keeps the files, and sends nothing", async () => {
  const out = mkdtempSync(join(tmpdir(), "engine-dry-"));
  const R = fakeRadar();
  const rep = await run({ series: ["receipts"], date: LAST_NIGHT, extra: {}, out, dry: true }, { F: F(), R, now: () => NOW, log: () => {}, chrome: async () => ({ cdp: null, close() {} }), drawImpl: fakeDraw() });
  assert.deepEqual(R.log, []);
  assert.deepEqual(rep.made, [{ series: "receipts", key: `receipts:${LAST_NIGHT}`, dry: true }]);
  assert.equal(readFileSync(join(out, "receipts.jpg"), "utf8"), "jpeg");
  assert.equal(JSON.parse(readFileSync(join(out, "receipts.json"), "utf8")).meta.title, "receipts");
});

// ── the drawing (needs Chrome: macOS's, or CHROME_PATH on the runner) ──

const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const noChrome = !existsSync(CHROME) && "no Chrome on this machine";

test("every post draws the same picture twice, reads every word it drew, and none is a sportsbook word", { skip: noChrome, timeout: 120e3 }, async () => {
  const { session, open, evalOrThrow, shot } = await import("../../desk-src/render.mjs");
  const r = rows();
  r.receipts.push(...weekSeals());
  const plans = [
    await F(r).plan("tonight", TODAY), await F(r).plan("gotn", TODAY), await F(r).plan("receipts", LAST_NIGHT),
    await F(r).plan("moved", TODAY, movedExtra), await F(r).plan("week", "2026-10-25"),
  ];
  const { cdp, close } = await session();
  const frame = async (p, part, t, extra = {}) => {
    const made = await open(cdp, { page: "../engine-src/page.html", w: 1080, h: part === "reel" ? 1920 : 1350, init: `window.setup(${JSON.stringify({ series: p.series, date: p.date, facts: { ...p.facts, ...extra }, limit: 250, part })})` });
    await evalOrThrow(cdp, `window.renderFrame(${t})`);
    return { made, png: await shot(cdp, "png"), lint: await evalOrThrow(cdp, "window.lint()") };
  };
  try {
    for (const p of plans) {
      const a = await frame(p, "still", 0), b = await frame(p, "still", 0);
      assert.ok(a.png.equals(b.png), `${p.series}: the still drew differently twice`);
      assert.ok(a.made.caption.short.length > 0 && a.made.title, `${p.series}: no caption or title`);
      assert.ok(a.lint.words.length > 3, `${p.series}: drew almost nothing`);
      assert.deepEqual([a.lint.drawn, a.lint.caption], [[], []], `${p.series}: ${a.lint.drawn} ${a.lint.caption}`);
      const c = await frame(p, "reel", 2.5), d = await frame(p, "reel", 2.5);
      assert.ok(c.made.duration >= 10, `${p.series}: a ${c.made.duration}s video`);
      assert.ok(c.png.equals(d.png), `${p.series}: the video's frame at 2.5s drew differently twice`);
    }
    const m = plans[3];
    const planted = await frame(m, "still", 0, { moved: { ...m.facts.moved, player: "Parlay Jones" } });
    assert.ok(planted.lint.drawn.includes("parlay"), "a drawn sportsbook word went unread");
  } finally {
    close();
  }
});
