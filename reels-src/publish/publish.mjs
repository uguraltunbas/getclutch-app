// The publishers behind one door: each reel the run made and checked goes to
// every platform that is switched on, at most once per platform, within a
// daily cap, after its words pass the guard. A dry run prints exactly what
// each platform would get and sends nothing.
//
// Switches (repository variables, all off unless set):
//   PUBLISH            off | dry | on        the master switch
//   PUBLISH_YOUTUBE, PUBLISH_INSTAGRAM, PUBLISH_THREADS, PUBLISH_FACEBOOK, PUBLISH_BLUESKY   on | off
//   PUBLISH_CAP        posts per platform per rolling 24 h (default 2: one reel of each kind)
// Secrets: each publisher names its own (platforms/*.mjs); a platform without
// them is skipped and said so. PUBLISH_STATE_KEY seals refreshed tokens.
import { captionsFor, lines, wordsOf } from "./captions.mjs";
import { checkPost } from "./guard.mjs";
import { bluesky } from "./platforms/bluesky.mjs";
import { facebook } from "./platforms/facebook.mjs";
import { instagram, threads } from "./platforms/meta.mjs";
import { youtube } from "./platforms/youtube.mjs";
import { posted, record, sentInDay } from "./store.mjs";
import { createHash } from "node:crypto";

export const PLATFORMS = [youtube, instagram, facebook, threads, bluesky];
const REFRESH_EVERY = 7 * 864e5;
const fp = (s) => createHash("sha256").update(String(s)).digest("hex").slice(0, 16);

/** The switches as the run reads them. `dry` (the run's --dry) wins over everything. */
export function settings(env = process.env, { dry = false, platforms = PLATFORMS } = {}) {
  const master = String(env.PUBLISH ?? "off").trim().toLowerCase();
  const mode = dry ? (master === "off" ? "off" : "dry") : ["on", "dry"].includes(master) ? master : "off";
  const on = Object.fromEntries(platforms.map((p) => [p.name, String(env[`PUBLISH_${p.name.toUpperCase()}`] ?? "").trim().toLowerCase() === "on"]));
  const cap = Math.max(0, Math.min(10, Number.parseInt(env.PUBLISH_CAP ?? "2", 10) || 2));
  return { mode, on, cap };
}

/** A token for a refreshing platform: the sealed one if it came from today's secret, else the secret; refreshed weekly when it can be kept. */
async function tokenFor(p, { env, store, tokens, now, fetchImpl, log }) {
  const secret = env[p.secrets[0]];
  let entry = tokens[p.name];
  if (entry && entry.seed !== fp(secret)) entry = null; // the secret was replaced by hand: it is the newer one
  const current = entry?.token ?? secret;
  if (!p.refresh || !env.PUBLISH_STATE_KEY || (entry && now - entry.refreshedAt < REFRESH_EVERY)) return current;
  try {
    const r = await p.refresh(current, { fetchImpl });
    tokens[p.name] = { token: r.token, refreshedAt: now, expiresAt: r.expiresAt, seed: fp(secret) };
    await store.saveTokens(tokens);
    log(`${p.name}: token refreshed (good to ${new Date(r.expiresAt).toISOString().slice(0, 10)})`);
    return r.token;
  } catch (e) {
    log(`${p.name}: token not refreshed (${e.message}); using the current one`);
    return current;
  }
}

/**
 * reels: [{ kind, key, plan, mp4: Buffer, dur }]. Returns one row per reel ×
 * platform that was considered: { platform, key, status, why?, url?, would? }
 * with status posted | dry | skipped | held | failed.
 */
export async function publishReels(reels, { env = process.env, store, platforms = PLATFORMS, fetchImpl = fetch, log = console.log, now = Date.now(), dry = false, sleep } = {}) {
  const cfg = settings(env, { dry, platforms });
  const rows = [];
  if (cfg.mode === "off" || !reels.length) return { mode: cfg.mode, rows };
  const ledger = await store.load();
  const tokens = cfg.mode === "on" ? await store.loadTokens() : {};
  const hosted = new Map();
  for (const p of platforms) {
    if (!cfg.on[p.name]) { rows.push({ platform: p.name, key: "*", status: "skipped", why: "switched off" }); continue; }
    const missing = p.secrets.filter((k) => !String(env[k] ?? "").trim());
    if (missing.length && cfg.mode === "on") { rows.push({ platform: p.name, key: "*", status: "skipped", why: `no ${missing.join(", ")}` }); continue; }
    let token = null;
    for (const r of reels) {
      const row = { platform: p.name, key: r.key };
      if (posted(ledger, r.key, p.name)) { rows.push({ ...row, status: "skipped", why: "already posted" }); continue; }
      if (sentInDay(ledger, p.name, now) >= cfg.cap) { rows.push({ ...row, status: "skipped", why: `daily cap (${cfg.cap})` }); continue; }
      const words = captionsFor(r.plan)[p.captions ?? p.name];
      const check = checkPost(wordsOf(words));
      if (!check.ok) { rows.push({ ...row, status: "held", why: check.hits.join("; ") }); log(`${p.name} ${r.key}: held back (${check.hits.join("; ")})`); continue; }
      const meta = { key: r.key, kind: r.kind, width: 1080, height: 1920, duration: r.dur, alt: `${lines(r.plan).hook} A short animated card from Clutch.` };
      if (cfg.mode === "dry") {
        rows.push({ ...row, status: "dry", would: { file: `${r.kind}.mp4 (${(r.mp4.length / 1e6).toFixed(1)} MB, ${r.dur}s)`, ...(p.needsUrl ? { video_url: "the state release's copy" } : {}), ...p.preview(words) }, ...(missing.length ? { why: `no ${missing.join(", ")} yet` } : {}) });
        continue;
      }
      try {
        token ??= await tokenFor(p, { env, store, tokens, now, fetchImpl, log });
        let url = null;
        if (p.needsUrl) {
          if (!hosted.has(r.key)) hosted.set(r.key, await store.hostVideo(`${r.key.split(":").slice(0, 2).join("-")}.mp4`, r.mp4));
          url = hosted.get(r.key);
        }
        record(ledger, { key: r.key, platform: p.name, state: "pending", at: new Date(now).toISOString() });
        await store.save(ledger);
        const res = await p.publish({ mp4: r.mp4, url, words, meta }, { env, token, fetchImpl, sleep });
        record(ledger, { key: r.key, platform: p.name, state: "done", id: res.id, url: res.url, at: new Date(now).toISOString(), ...(res.note ? { note: res.note } : {}) });
        await store.save(ledger);
        rows.push({ ...row, status: "posted", url: res.url, why: res.note ?? undefined });
        log(`${p.name} ${r.key}: posted${res.note ? ` (${res.note})` : ""}`);
      } catch (e) {
        const why = String(e.message).slice(0, 300);
        const i = ledger.posts.findIndex((x) => x.key === r.key && x.platform === p.name);
        if (i >= 0 && ledger.posts[i].state === "pending") record(ledger, { key: r.key, platform: p.name, state: "failed", error: why });
        await store.save(ledger).catch(() => {});
        rows.push({ ...row, status: "failed", why });
        log(`${p.name} ${r.key}: failed (${why})`);
      }
    }
  }
  return { mode: cfg.mode, rows };
}

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const NAME = Object.fromEntries(PLATFORMS.map((p) => [p.name, p.label]));

/** The Telegram line after a run: where each reel went. Empty when nothing was tried. */
export function summaryHtml({ mode, rows }) {
  const tried = rows.filter((r) => r.status !== "skipped" || r.why !== "switched off");
  if (mode === "off" || !tried.length) return "";
  const mark = { posted: "✅", dry: "🧪", skipped: "⏭", held: "⛔", failed: "⚠️" };
  const out = [`<b>📣 Auto-posting</b>${mode === "dry" ? " (dry run: nothing sent)" : ""}`];
  for (const r of tried) {
    const what = r.key === "*" ? "" : ` ${esc(r.key.split(":")[0])}`;
    const link = r.url ? ` <a href="${esc(r.url)}">open</a>` : "";
    out.push(`${mark[r.status] ?? "·"} ${esc(NAME[r.platform] ?? r.platform)}${what}${link}${r.why ? ` · ${esc(r.why)}` : ""}`);
  }
  return out.join("\n");
}
