// The daily reels: two short vertical videos a day from Clutch's public
// numbers, each sent to Uğur on Telegram with its caption ready to paste into
// TikTok, YouTube Shorts, Instagram Reels and X. Posting stays his: nothing
// here signs in to a social network.
//
//   tonight  today's game of the night: Clutch's sealed number, the matchup,
//            the tip (ET), the biggest reason in plain words
//   graded   yesterday's game of the night as the Ledger graded it (held or
//            missed, misses shown as they are) and the season's record
//
//   node reels-src/make.mjs [--date 2026-11-13] [--only tonight|graded] [--out dir] [--dry] [--wait-seal 30]
//
// --date is the ET date of tonight's game (default: today in New York); the
// graded reel is the day before. --dry, or no TELEGRAM_BOT_TOKEN /
// TELEGRAM_CHAT_ID, renders and checks without sending: the files stay in
// --out (each reel's .mp4, a still .png and the caption .txt). --wait-seal N:
// when the morning seal isn't in yet, look again every 2 minutes for up to N
// minutes.
//
// Every word drawn and written goes through the site's word list
// (site-src/lib/betting.mjs) plus "100%" and claims against the market; a
// reel that fails it is not sent (Telegram gets a line saying why). The log
// names each reel and its checks, never a caption.
//
// Env: SUPABASE_ANON_KEY (the public key the site reads with), SUPABASE_URL
// (optional), TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (the radar's bot and
// Uğur's chat), CHROME_PATH (CI). In Actions the inputs come as INPUT_DATE /
// INPUT_ONLY, never through a shell line.

import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evalOrThrow, open, session, shot, video } from "../desk-src/render.mjs";
import { supabase } from "../site-src/lib/data.mjs";
import { etDate, shift } from "../site-src/lib/time.mjs";
import { reelFacts } from "./facts.mjs";
import { caption, checkWords } from "./words.mjs";

const SUPABASE_URL = "https://rgksgqnajvcsoftqncqe.supabase.co";
const PAGE = "../reels-src/reels.html"; // render.mjs opens pages from desk-src/
const SIZE = { w: 1080, h: 1920 };
const FPS = 30;
const MAX_MP4 = 45e6; // the bot API takes an upload up to 50 MB
const KINDS = ["graded", "tonight"];
const LABEL = { tonight: "🎬 Tonight's number", graded: "🎬 Graded" };

export function readInputs(argv = process.argv.slice(2), env = process.env) {
  const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  const date = String(arg("--date") ?? env.INPUT_DATE ?? "") || etDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("date: YYYY-MM-DD");
  const only = String(arg("--only") ?? env.INPUT_ONLY ?? "") || null;
  if (only && !KINDS.includes(only)) throw new Error(`only: one of ${KINDS.join(", ")}`);
  const wait = Number(arg("--wait-seal") ?? env.INPUT_WAIT_SEAL ?? 0);
  return {
    date, only, waitSeal: Number.isFinite(wait) ? Math.max(0, Math.min(wait, 60)) : 0,
    out: resolve(arg("--out") ?? join(env.RUNNER_TEMP || tmpdir(), "clutch-reels")),
    dry: argv.includes("--dry") || env.INPUT_DRY === "true",
  };
}

/** The bot: one video with its caption, or a line. Never logs the token. */
export function telegram(token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID, fetchImpl = fetch) {
  token = String(token ?? "").trim(); chat = String(chat ?? "").trim();
  if (!/^\d{6,}:[A-Za-z0-9_-]{30,}$/.test(token) || !/^-?\d{3,}$/.test(chat)) return null;
  async function call(method, body) {
    const r = await fetchImpl(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", body });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) throw new Error(`telegram ${method}: ${String(j.description ?? `HTTP ${r.status}`).replaceAll(token, "<token>").slice(0, 200)}`);
    return j.result;
  }
  return {
    async video(mp4, html, { duration }) {
      const f = new FormData();
      f.set("chat_id", chat);
      f.set("video", new Blob([mp4], { type: "video/mp4" }), "clutch-reel.mp4");
      f.set("caption", html);
      f.set("parse_mode", "HTML");
      f.set("width", String(SIZE.w)); f.set("height", String(SIZE.h)); f.set("duration", String(Math.round(duration)));
      f.set("supports_streaming", "true");
      return call("sendVideo", f);
    },
    async line(html) {
      const f = new FormData();
      f.set("chat_id", chat); f.set("text", html); f.set("parse_mode", "HTML"); f.set("disable_notification", "true");
      f.set("link_preview_options", JSON.stringify({ is_disabled: true }));
      return call("sendMessage", f);
    },
  };
}

const escHtml = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
/** The Telegram message under a reel: what it is, and the caption in a block that copies with one tap. */
export const tgCaption = (plan, cap) => `<b>${escHtml(LABEL[plan.kind])}</b> · ${escHtml(plan.day)} · ${escHtml(plan.away.abbr)} @ ${escHtml(plan.home.abbr)}\nTap the block to copy the caption:\n<pre>${escHtml(cap)}</pre>`;

/** One reel drawn: the MP4, a still PNG and every word it showed. */
export async function drawReel(cdp, plan, dir) {
  const init = `window.setup(${JSON.stringify(plan)})`;
  const made = await open(cdp, { page: PAGE, ...SIZE, init });
  await evalOrThrow(cdp, `window.renderFrame(${made.still})`);
  const png = await shot(cdp, "png");
  const raw = join(dir, `${plan.kind}.raw.mp4`), mp4 = join(dir, `${plan.kind}.mp4`);
  const job = { page: PAGE, ...SIZE, init, out: raw, fps: FPS, crf: 16 };
  await video(cdp, job);
  await phoneMp4(raw, mp4, 18);
  if (statSync(mp4).size > MAX_MP4) await phoneMp4(raw, mp4, 26);
  rmSync(raw, { force: true });
  if (statSync(mp4).size > MAX_MP4) throw new Error(`the video is ${statSync(mp4).size} bytes, over ${MAX_MP4}`);
  const texts = await evalOrThrow(cdp, "window.texts()");
  return { mp4: readFileSync(mp4), png, texts, dur: made.dur };
}

/**
 * The file the apps take everywhere: the frames come in as JPEG (full range),
 * so they are set to the TV range every phone app expects (yuv420p, BT.709),
 * H.264 High 4.1, the index at the front.
 */
function phoneMp4(src, out, crf) {
  return new Promise((res, rej) => {
    const p = spawn("ffmpeg", ["-v", "error", "-y", "-i", src, "-vf", "scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p",
      "-c:v", "libx264", "-profile:v", "high", "-level", "4.1", "-crf", String(crf), "-preset", "medium",
      "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
      "-movflags", "+faststart", "-an", out], { stdio: ["ignore", "inherit", "inherit"] });
    p.on("close", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exit ${c}`))));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A run: each reel planned, drawn, checked and sent (or kept, on a dry run). */
export async function run({ date, only, out, dry, waitSeal = 0 }, { F, T = null, log = console.log, chrome = session, draw = drawReel } = {}) {
  mkdirSync(out, { recursive: true });
  const report = { made: [], skipped: [], failed: [] };
  const plans = { graded: () => F.graded(shift(date, -1)), tonight: () => F.tonight(date) };
  let browser = null;
  try {
    for (const kind of KINDS.filter((k) => !only || k === only)) {
      try {
        let plan = await plans[kind]();
        for (let waited = 0; plan.wait && kind === "tonight" && waited < waitSeal; waited += 2) {
          log(`${kind}: waiting (${plan.wait})`);
          await sleep(120e3);
          plan = await plans[kind]();
        }
        if (plan.empty || plan.wait) {
          const why = plan.empty ?? `not yet: ${plan.wait}`;
          report.skipped.push({ kind, why });
          log(`${kind}: nothing to make (${why})`);
          if (T && !dry) await T.line(`<b>${escHtml(LABEL[kind])}</b> · no reel today (${escHtml(why)})`);
          continue;
        }
        const cap = caption(plan);
        browser ??= await chrome();
        const d = await draw(browser.cdp, plan, out);
        const words = checkWords(d.texts, cap);
        writeFileSync(join(out, `${kind}.png`), d.png);
        writeFileSync(join(out, `${kind}.txt`), cap + "\n");
        writeFileSync(join(out, `${kind}.json`), JSON.stringify({ ...plan, checks: words }, null, 2));
        if (!words.ok) {
          report.failed.push({ kind, why: words.hits.join("; ") });
          log(`${kind}: ✗ words (${words.hits.join("; ")})`);
          if (T && !dry) await T.line(`⚠️ <b>${escHtml(LABEL[kind])}</b> held back: ${escHtml(words.hits.join("; "))}`);
          continue;
        }
        if (!T || dry) { report.made.push({ kind, sent: false }); log(`${kind}: drawn, not sent (✓ words · ${(d.mp4.length / 1e6).toFixed(1)} MB · ${d.dur}s)`); continue; }
        await T.video(d.mp4, tgCaption(plan, cap), { duration: d.dur });
        report.made.push({ kind, sent: true });
        log(`${kind}: sent (✓ words · ${(d.mp4.length / 1e6).toFixed(1)} MB · ${d.dur}s)`);
      } catch (e) {
        report.failed.push({ kind, why: String(e.message).slice(0, 300) });
        log(`${kind}: failed (${e.message})`);
        if (T && !dry) await T.line(`⚠️ <b>${escHtml(LABEL[kind])}</b> failed: ${escHtml(String(e.message).slice(0, 200))}`).catch(() => {});
      }
    }
  } finally {
    browser?.close();
  }
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const inputs = readInputs();
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!anon) throw new Error("SUPABASE_ANON_KEY is not set");
  const F = reelFacts(supabase(process.env.SUPABASE_URL || SUPABASE_URL, anon));
  const T = inputs.dry ? null : telegram();
  if (!T && !inputs.dry) console.log("::notice::No TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID: drawn and checked, not sent.");
  const report = await run(inputs, { F, T });
  if (report.failed.length) process.exitCode = 1;
}
