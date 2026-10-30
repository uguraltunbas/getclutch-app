// The daily posts, made (t70): public facts (facts.mjs) → the share studio's
// drawing (page.html + vendor/studio.js, in headless Chrome through
// desk-src/render.mjs) → a 4:5 still (JPEG) and a 9:16 video (H.264, no
// sound) → the three checks (checks.mjs) → the radar, which shows them to
// Uğur on Telegram with [Publish] [Skip] (ingest.mjs).
//
//   node engine-src/make.mjs --series tonight,gotn --date 2026-10-31 [--extra '{"batch":"pretip"}'] [--out dir] [--dry]
//
// In Actions (content.yml) the inputs come as INPUT_SERIES / INPUT_DATE /
// INPUT_EXTRA, never through a shell line. --dry, or no RADAR_URL /
// CONTENT_KEY, draws and checks without sending: the files stay in --out.
// The log names each post and its checks, never a caption: until Uğur taps
// Publish, the words are his to keep or skip. (--runs-file, for a run on his
// Mac only: the game of the night's winners from a file instead of the
// content-gotn function.)

import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evalOrThrow, open, session, shot, video } from "../desk-src/render.mjs";
import { facts, publicFacts, SERIES, SUPABASE_URL } from "./facts.mjs";
import { fresh, sealed, words } from "./checks.mjs";
import { radar } from "./ingest.mjs";
import { supabase } from "../site-src/lib/data.mjs";

const PAGE = "../engine-src/page.html"; // render.mjs opens pages from desk-src/
const STILL = { w: 1080, h: 1350 };
const REEL = { w: 1080, h: 1920 };
const FPS = 30;
const MAX_JPEG = 950e3; // Bluesky takes an image up to 1 MB
const MAX_MP4 = 19e6; // the radar reads the video back from Telegram, whose bot API hands out files up to 20 MB
const BLUESKY_ROOM = 300; // characters in a Bluesky post, its link included

/** The link as the radar prints it under a Bluesky post (apps/radar src/content/utm.mjs `shown`). */
const shown = (path) => `clutchledger.com${(path || "/").replace(/\/$/, "")}`;

export function readInputs(argv = process.argv.slice(2), env = process.env) {
  const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  const series = String(arg("--series") ?? env.INPUT_SERIES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const date = String(arg("--date") ?? env.INPUT_DATE ?? "");
  const rawExtra = String(arg("--extra") ?? env.INPUT_EXTRA ?? "") || "{}";
  if (!series.length || series.some((s) => !SERIES.includes(s))) throw new Error(`series "${series.join(",")}": one or more of ${SERIES.join(", ")}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("date: YYYY-MM-DD");
  if (rawExtra.length > 2000) throw new Error("extra: too long");
  let extra;
  try { extra = JSON.parse(rawExtra); } catch { throw new Error("extra: not JSON"); }
  if (!extra || typeof extra !== "object" || Array.isArray(extra)) throw new Error("extra: not an object");
  return {
    series: [...new Set(series)], date, extra,
    out: resolve(arg("--out") ?? join(env.RUNNER_TEMP || tmpdir(), "clutch-content")),
    dry: argv.includes("--dry"),
    runsFile: arg("--runs-file") ?? null,
  };
}

/** The post drawn twice, as the 4:5 still and the 9:16 video, with every word each one drew. */
export async function draw(cdp, plan, dir) {
  const job = (part) => JSON.stringify({ series: plan.series, date: plan.date, facts: plan.facts, limit: BLUESKY_ROOM - 2 - [...shown(plan.path)].length, part });
  const made = await open(cdp, { page: PAGE, ...STILL, init: `window.setup(${job("still")})` });
  if (!made || made.empty) return null;
  await evalOrThrow(cdp, "window.renderFrame(0)");
  let jpeg = await shot(cdp, "jpeg", 86);
  if (jpeg.length > MAX_JPEG) jpeg = await shot(cdp, "jpeg", 70);
  if (jpeg.length > MAX_JPEG) throw new Error(`the still is ${jpeg.length} bytes, over ${MAX_JPEG}`);
  const lints = [await evalOrThrow(cdp, "window.lint()")];
  const mp4 = join(dir, `${plan.series}.mp4`);
  const reel = { page: PAGE, ...REEL, init: `window.setup(${job("reel")})`, out: mp4, fps: FPS, crf: 20 };
  await video(cdp, reel);
  if (statSync(mp4).size > MAX_MP4) await video(cdp, { ...reel, crf: 28 });
  if (statSync(mp4).size > MAX_MP4) throw new Error(`the video is ${statSync(mp4).size} bytes, over ${MAX_MP4}`);
  lints.push(await evalOrThrow(cdp, "window.lint()"));
  return { caption: made.caption, title: made.title ?? "", jpeg, mp4: readFileSync(mp4), lints };
}

/**
 * One run: every series asked for, each made, left out (with why), put off
 * (`later`: the radar tries again) or failed; then the report to the radar.
 */
export async function run({ series, date, extra, out, dry = false }, { F, R = null, now = () => Date.now(), log = console.log, chrome = session, drawImpl = draw } = {}) {
  mkdirSync(out, { recursive: true });
  const report = { batch: typeof extra.batch === "string" ? extra.batch.slice(0, 20) : null, date, made: [], empty: [], later: [], errors: [] };
  let browser = null;
  try {
    for (const name of series) {
      try {
        const plan = await F.plan(name, date, extra);
        if (plan.empty) { report.empty.push({ series: name, why: plan.empty }); log(`${name}: nothing to post (${plan.empty})`); continue; }
        const f = fresh(plan, now()), s = sealed(plan);
        if (f.wait) { report.later.push({ series: name, why: f.note }); log(`${name}: later (${f.note})`); continue; }
        if (f.late) { report.empty.push({ series: name, why: f.note }); log(`${name}: too late (${f.note})`); continue; }
        browser ??= await chrome();
        const d = await drawImpl(browser.cdp, plan, out);
        if (!d) { report.empty.push({ series: name, why: "the studio had nothing to draw" }); log(`${name}: nothing drawn`); continue; }
        const checks = [words(d.lints), f, s].map(({ name: n, ok, note }) => ({ name: n, ok, note }));
        const marks = checks.map((c) => `${c.ok ? "✓" : "✗"} ${c.name}`).join(" · ");
        const post = { series: name, date: plan.date, key: plan.key, caption: d.caption, checks, meta: { path: plan.path, alt: d.caption.long, title: d.title, expires: plan.expires } };
        if (dry || !R) {
          writeFileSync(join(out, `${name}.jpg`), d.jpeg);
          writeFileSync(join(out, `${name}.json`), JSON.stringify(post, null, 2));
          report.made.push({ series: name, key: plan.key, dry: true });
          log(`${name}: drawn, not sent (${marks})`);
          continue;
        }
        const r = await R.ingest(post);
        if (r.dup) { report.made.push({ series: name, id: r.id, dup: true }); log(`${name}: sent before (#${r.id}, ${r.state})`); continue; }
        for (const kind of r.order) await R.put(r.id, kind, kind === "photo" ? d.jpeg : d.mp4);
        report.made.push({ series: name, id: r.id });
        log(`${name}: sent #${r.id} (${marks})`);
      } catch (e) {
        report.errors.push({ series: name, error: String(e.message).slice(0, 300) });
        log(`${name}: failed (${e.message})`);
      }
    }
  } finally {
    browser?.close();
  }
  if (R && !dry) await R.report(report);
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const inputs = readInputs();
  let F;
  if (inputs.runsFile) {
    // a local run: the winners from a file (never in Actions: there the function answers them)
    const anon = process.env.SUPABASE_ANON_KEY;
    if (!anon) throw new Error("SUPABASE_ANON_KEY is not set");
    const r = JSON.parse(readFileSync(resolve(inputs.runsFile), "utf8"));
    F = facts(supabase(process.env.SUPABASE_URL || SUPABASE_URL, anon), { runs: async () => ({ ...r, runs: r.winners.length }) });
  } else {
    F = publicFacts();
  }
  const R = inputs.dry ? null : radar();
  if (!R && !inputs.dry) console.log("::notice::No RADAR_URL / CONTENT_KEY: drawn and checked, not sent.");
  const report = await run(inputs, { F, R });
  if (report.errors.length) process.exitCode = 1;
}
