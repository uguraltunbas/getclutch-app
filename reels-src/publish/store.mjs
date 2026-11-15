// Where the publishers keep what they did, and where a video sits when a
// platform fetches it by URL (Instagram, Threads): one prerelease of this
// public repository, tag `reels-state`, holding
//
//   ledger.json            every post: reel key × platform → done / pending / failed, id, url, time
//   tokens.enc             refreshed access tokens, AES-256-GCM under PUBLISH_STATE_KEY (optional)
//   <kind>-<date>.mp4      the day's reels (public anyway once posted), pruned after 14 days
//
// No commit to main, nothing in the site's build, no extra secret: the
// workflow's own GITHUB_TOKEN (contents: write) is enough.
//
// The ledger is the once-per-video-per-platform guard: a post is written
// `pending` before it is sent and `done` after, so a run that dies in between
// never posts the same reel twice (the pending row is reported for a look by
// hand); a post that failed cleanly is `failed` and is tried again next run.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export const STATE_TAG = "reels-state";
const KEEP_DAYS = 14;
const empty = () => ({ version: 1, posts: [] });

/** Has this reel gone (or maybe gone) to this platform? */
export const posted = (ledger, key, platform) => ledger.posts.some((p) => p.key === key && p.platform === platform && (p.state === "done" || p.state === "pending"));

/** Posts sent to a platform in the 24 hours before `now` (the platforms' limits are rolling days). */
export const sentInDay = (ledger, platform, now = Date.now()) =>
  ledger.posts.filter((p) => p.platform === platform && (p.state === "done" || p.state === "pending") && now - Date.parse(p.at) < 24 * 3600e3).length;

/** Sets the row for key × platform (one row each). */
export function record(ledger, row) {
  const i = ledger.posts.findIndex((p) => p.key === row.key && p.platform === row.platform);
  if (i >= 0) ledger.posts[i] = { ...ledger.posts[i], ...row };
  else ledger.posts.push(row);
  return ledger;
}

// ── tokens at rest ────────────────────────────────────────────────────────
const keyOf = (secret) => createHash("sha256").update(String(secret)).digest();
export function seal(obj, secret) {
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", keyOf(secret), iv);
  const body = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString("base64");
}
export function unseal(b64, secret) {
  const b = Buffer.from(String(b64), "base64");
  const d = createDecipheriv("aes-256-gcm", keyOf(secret), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8"));
}

/** For tests and dry runs: everything in memory; a video "URL" is a stand-in. */
export function memoryStore(ledger = empty(), tokens = {}) {
  const files = new Map();
  return {
    kind: "memory",
    files,
    async load() { return structuredClone(ledger); },
    async save(l) { ledger = structuredClone(l); },
    async hostVideo(name, bytes) { files.set(name, bytes.length); return `https://example.invalid/dry-run/${name}`; },
    async loadTokens() { return structuredClone(tokens); },
    async saveTokens(t) { tokens = structuredClone(t); },
    get ledger() { return ledger; },
  };
}

/** For a run on the Mac: the ledger in a local file (no tokens, no hosting). */
export function fileStore(path) {
  const m = memoryStore(existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : empty());
  return { ...m, kind: "file", async save(l) { await m.save(l); writeFileSync(path, JSON.stringify(l, null, 2) + "\n"); } };
}

/** The real one: a prerelease of `repo` (owner/name) through the REST API. */
export function releaseStore({ repo, token, secret = null, fetchImpl = fetch, now = () => Date.now() }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(String(repo ?? ""))) throw new Error("releaseStore: repo as owner/name");
  if (!token) throw new Error("releaseStore: no GITHUB_TOKEN");
  const api = `https://api.github.com/repos/${repo}`;
  const H = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "clutch-reels" };
  async function gh(url, init = {}) {
    const r = await fetchImpl(url, { ...init, headers: { ...H, ...(init.headers ?? {}) } });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`github ${init.method ?? "GET"} ${url.replace(api, "")}: HTTP ${r.status} ${(await r.text().catch(() => "")).slice(0, 160)}`);
    return r.status === 204 ? {} : r.json();
  }
  let rel = null;
  async function release() {
    if (rel) return rel;
    rel = await gh(`${api}/releases/tags/${STATE_TAG}`);
    rel ??= await gh(`${api}/releases`, { method: "POST", body: JSON.stringify({
      tag_name: STATE_TAG, name: "Daily reels · publishing state",
      body: "Kept by the Daily reels workflow (reels-src/publish): which reel went to which platform, and the reels themselves for the platforms that fetch a video by URL. Not a release of the site.",
      prerelease: true, make_latest: "false",
    }) });
    return rel;
  }
  const assetNamed = async (name) => (await gh(`${api}/releases/${(await release()).id}/assets?per_page=100`))?.find((a) => a.name === name) ?? null;
  async function readAsset(name) {
    const a = await assetNamed(name);
    if (!a) return null;
    const r = await fetchImpl(a.url, { headers: { ...H, Accept: "application/octet-stream" } });
    if (!r.ok) throw new Error(`github asset ${name}: HTTP ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  }
  async function putAsset(name, bytes, type) {
    const old = await assetNamed(name);
    if (old) await gh(`${api}/releases/assets/${old.id}`, { method: "DELETE" });
    const up = `https://uploads.github.com/repos/${repo}/releases/${(await release()).id}/assets?name=${encodeURIComponent(name)}`;
    const a = await gh(up, { method: "POST", body: bytes, headers: { "Content-Type": type } });
    return a.browser_download_url;
  }
  return {
    kind: "release",
    async load() { const b = await readAsset("ledger.json"); return b ? JSON.parse(b.toString("utf8")) : empty(); },
    async save(l) { await putAsset("ledger.json", Buffer.from(JSON.stringify(l, null, 2) + "\n"), "application/json"); },
    async hostVideo(name, bytes) {
      // the day's file, and the old ones gone (they were posted long ago)
      const list = (await gh(`${api}/releases/${(await release()).id}/assets?per_page=100`)) ?? [];
      for (const a of list) if (a.name.endsWith(".mp4") && now() - Date.parse(a.created_at) > KEEP_DAYS * 864e5) await gh(`${api}/releases/assets/${a.id}`, { method: "DELETE" });
      return putAsset(name, bytes, "video/mp4");
    },
    async loadTokens() {
      if (!secret) return {};
      const b = await readAsset("tokens.enc");
      try { return b ? unseal(b.toString("utf8"), secret) : {}; } catch { return {}; } // a new key: start again from the secrets
    },
    async saveTokens(t) { if (secret) await putAsset("tokens.enc", Buffer.from(seal(t, secret)), "application/octet-stream"); },
  };
}
