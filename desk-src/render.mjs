// Clutch launch pack v2 — renderer.
//
// Drives headless Chrome over the DevTools protocol (Node's own WebSocket,
// no dependencies) and turns the pages in this folder into PNG cards and
// MP4 videos.
//
//   node render.mjs cards  <job.json>   each {page, query, out, w, h} → PNG
//   node render.mjs video  <job.json>   each {page, query, out, w, h, fps, dur} → MP4
//
// A video page exposes window.renderFrame(t) (seconds) and window.DURATION;
// every frame is drawn from t alone, so a render is deterministic and
// never depends on how fast this Mac is. Frames are piped straight into
// ffmpeg (H.264, yuv420p, CRF 17) — nothing is written per frame.

import { spawn } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9300 + Math.floor(Math.random() * 500);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  const profile = join(process.env.TMPDIR ?? "/tmp", `clutch-render-${PORT}`);
  const proc = spawn(CHROME, [
    "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    "--allow-file-access-from-files", "--hide-scrollbars", "--force-device-scale-factor=1",
    "--disable-gpu-vsync", "--no-first-run", "--no-default-browser-check", "--mute-audio",
    "--font-render-hinting=none", ...(process.env.CI ? ["--no-sandbox", "--disable-dev-shm-usage"] : []), "about:blank",
  ], { stdio: "ignore" });
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return { proc, ws: page.webSocketDebuggerUrl };
    } catch { /* not up yet */ }
    await sleep(100);
  }
  proc.kill();
  throw new Error("Chrome did not start");
}

function client(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  const waiters = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    } else if (msg.method) {
      for (const w of waiters.slice()) if (w.method === msg.method) { waiters.splice(waiters.indexOf(w), 1); w.res(msg.params); }
    }
  };
  const ready = new Promise((r) => (ws.onopen = r));
  return {
    ready,
    send(method, params = {}) {
      return new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
    },
    once(method) { return new Promise((res) => waiters.push({ method, res })); },
    close() { ws.close(); },
  };
}

async function open(cdp, job) {
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: job.w, height: job.h, deviceScaleFactor: 1, mobile: false });
  const file = resolve(HERE, job.page);
  const url = pathToFileURL(file).href + (job.query ? `?${job.query}` : "");
  const loaded = cdp.once("Page.loadEventFired");
  await cdp.send("Page.navigate", { url });
  await loaded;
  const r = await cdp.send("Runtime.evaluate", { expression: "document.fonts.ready.then(() => (window.READY ? window.READY() : true)).then(() => document.fonts.size)", awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`page error in ${job.page}?${job.query}: ${JSON.stringify(r.exceptionDetails).slice(0, 400)}`);
}

async function evalOrThrow(cdp, expression) {
  const r = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`${expression}: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
  return r.result?.value;
}

async function shot(cdp, format = "png", quality) {
  const r = await cdp.send("Page.captureScreenshot", { format, ...(quality ? { quality } : {}), fromSurface: true, captureBeyondViewport: false });
  return Buffer.from(r.data, "base64");
}

async function cards(cdp, jobs) {
  for (const job of jobs) {
    await open(cdp, job);
    await evalOrThrow(cdp, "window.renderFrame ? window.renderFrame(window.STILL ?? 0) : 0");
    await sleep(30);
    const png = await shot(cdp, "png");
    mkdirSync(dirname(resolve(HERE, job.out)), { recursive: true });
    writeFileSync(resolve(HERE, job.out), png);
    console.log("card", job.out);
  }
}

async function video(cdp, job) {
  await open(cdp, job);
  const fps = job.fps ?? 30;
  const dur = job.dur ?? (await evalOrThrow(cdp, "window.DURATION"));
  const frames = Math.round(dur * fps);
  const out = resolve(HERE, job.out);
  mkdirSync(dirname(out), { recursive: true });
  const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(fps), "-i", "-",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "medium", "-movflags", "+faststart", "-r", String(fps), out],
    { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exit ${c}`)))));
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    await evalOrThrow(cdp, `window.renderFrame(${(i / fps).toFixed(5)})`);
    const buf = await shot(cdp, "jpeg", 96);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  }
  ff.stdin.end();
  await done;
  console.log("video", job.out, `${frames} frames`, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (job.cover !== undefined) {
    await evalOrThrow(cdp, `window.renderFrame(${job.cover})`);
    const png = await shot(cdp, "png");
    writeFileSync(out.replace(/\.mp4$/, ".cover.png"), png);
  }
}

/** Still frames of a video page at chosen times, tiled into one contact sheet for review. */
async function stills(cdp, job) {
  await open(cdp, job);
  const out = resolve(HERE, job.out);
  mkdirSync(dirname(out), { recursive: true });
  const files = [];
  for (const t of job.times) {
    await evalOrThrow(cdp, `window.renderFrame(${t})`);
    const f = out.replace(/\.png$/, `_${String(t).replace(".", "_")}.png`);
    writeFileSync(f, await shot(cdp, "png"));
    files.push(f);
  }
  const n = files.length;
  const args = n === 1 ? ["-v", "error", "-y", "-i", files[0], "-vf", "scale=540:-1", out] : ["-v", "error", "-y", ...files.flatMap((f) => ["-i", f]), "-filter_complex",
    files.map((_, i) => `[${i}]scale=360:-1[s${i}]`).join(";") + ";" + files.map((_, i) => `[s${i}]`).join("") + `hstack=${n}`, out];
  await new Promise((res, rej) => spawn("ffmpeg", args, { stdio: "inherit" }).on("close", (c) => (c === 0 ? res() : rej(new Error("tile")))));
  console.log("stills", job.out);
}

const [mode, jobFile, only] = process.argv.slice(2);
let jobs = JSON.parse(readFileSync(resolve(process.cwd(), jobFile), "utf8"));
if (only) jobs = jobs.filter((j) => j.out.includes(only));
const { proc, ws } = await launch();
const cdp = client(ws);
await cdp.ready;
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
try {
  if (mode === "cards") await cards(cdp, jobs);
  else if (mode === "video") for (const j of jobs) await video(cdp, j);
  else if (mode === "stills") for (const j of jobs) await stills(cdp, j);
  else throw new Error(`unknown mode ${mode}`);
} finally {
  cdp.close();
  proc.kill();
}
