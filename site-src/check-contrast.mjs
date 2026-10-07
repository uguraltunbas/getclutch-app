// Contrast gate for the website's two editions — the site's copy of the app's
// scripts/check-contrast.mts, run on static/site.css itself.
//
//   node site-src/check-contrast.mjs [--verbose]
//
// Reads the Night tokens (the first :root block), the Day tokens (the
// /*@day*/ block: :root:not([data-theme=dark]) and its .gl glass rule) and
// asserts the pairs below in both editions: text 4.5:1 (WCAG AA), the small
// mono labels (--ink3, on paper and on glass) 7:1, marks and outlines 3:1.
// rgba values are composited onto their ground before measuring. The build
// imports checkContrast() and fails on any pair under its floor; team
// swatches (build.mjs) are checked here too, 3:1 on every ground they sit on.
// Zero dependencies.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function parse(color) {
  const c = String(color).trim();
  let m = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) {
    const h = m[1].length === 3 ? m[1].replace(/./g, "$&$&") : m[1];
    const n = parseInt(h, 16);
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], a: 1 };
  }
  m = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/i);
  if (m) return { rgb: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] };
  throw new Error(`check-contrast: can't read the colour "${c}"`);
}

const over = (fg, bg) => { const f = parse(fg); return f.rgb.map((v, i) => Math.round(v * f.a + bg[i] * (1 - f.a))); };

function luminance(rgb) {
  const lin = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}

/** Contrast of `fg` drawn on `bg`; `bg` itself may be translucent over `base` (the page). */
export function ratio(fg, bg, base = "#000000") {
  const ground = over(bg, parse(base).rgb);
  const a = luminance(over(fg, ground)), b = luminance(ground);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** `--name:value` declarations of the first rule whose selector is exactly `selector`. */
function block(css, selector) {
  const at = css.indexOf(`${selector}{`);
  if (at < 0) throw new Error(`check-contrast: no "${selector}" rule in the stylesheet`);
  const body = css.slice(at + selector.length + 1, css.indexOf("}", at));
  const out = {};
  for (const d of body.split(";")) {
    const m = d.match(/^\s*--([\w-]+)\s*:\s*([\s\S]+?)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

/** The token sets: Night (page and glass are the same tones), Day page, Day glass. */
export function editions(css) {
  css = css.replace(/\/\*(?!@)[\s\S]*?\*\//g, "");
  const night = block(css, ":root");
  const day = { ...night, ...block(css, ":root:not([data-theme=dark])") };
  const dayGlass = { ...day, ...block(css, ":root:not([data-theme=dark]) .gl") };
  return { night, nightGlass: night, day, dayGlass };
}

const PAGE = ["paper", "panel"];
const TEXT = ["ink", "ink2", "amberText", "linkHi", "hot", "win"]; // --ink3 has its own, higher floor
const PAIRS = {
  // On the paper and its cards.
  page: [
    ...TEXT.flatMap((fg) => PAGE.map((bg) => ({ fg, bg, min: 4.5 }))),
    ...PAGE.map((bg) => ({ fg: "ink3", bg, min: 7, note: "small mono labels: AAA" })),
    ...PAGE.map((bg) => ({ fg: "dim", bg, min: 3, note: "big dim digits and dashes only" })),
    ...PAGE.map((bg) => ({ fg: "rule3", bg, min: 3, note: "ghost button outline" })),
    ...PAGE.map((bg) => ({ fg: "led", bg, min: 1.1, note: "unlit segment: a shape, not gone" })),
    ...PAGE.map((bg) => ({ fg: "amber", bg, min: 3, note: "amber marks on night paper", only: "night" })),
    { fg: "onAmber", bg: "amber", min: 4.5, note: "label on amber (buttons, tags)" },
    { fg: "onAmber", bg: "amberHi", min: 4.5, note: "label on amber, hovered" },
  ],
  // On the glass (.gl): the scoreboard, STOP PRESS, the LIVE chip — dark in both editions.
  glass: [
    ...["ink", "ink2", "amberText", "hot", "win"].map((fg) => ({ fg, bg: "panel", min: 4.5 })),
    { fg: "ink3", bg: "panel", min: 7, note: "small mono labels on glass: AAA" },
    { fg: "dim", bg: "panel", min: 3, note: "the big dim number" },
    { fg: "amber", bg: "panel", min: 3, note: "lit segment" },
    { fg: "ink", bg: "panel", min: 3, note: "the market's segment" },
    { fg: "led", bg: "panel", min: 1.1, note: "unlit segment" },
    { fg: "rule3", bg: "panel", min: 3, note: "ghost call button outline" },
    { fg: "onAmber", bg: "amber", min: 4.5, note: "call button / STOP PRESS label" },
  ],
};

/**
 * Every pair in both editions, plus each team swatch on every ground it is
 * drawn on. `swatches`: [{ team, night, day }] (day = the Day shade, or the
 * night one when it holds). Returns { lines, failures }.
 */
export function checkContrast(css, { swatches = [] } = {}) {
  const ed = editions(css);
  const lines = [], failures = [];
  const add = (ok, line) => { lines.push(`${ok ? "ok  " : "FAIL"} ${line}`); if (!ok) failures.push(line); };
  for (const name of ["night", "day"]) {
    for (const [where, pairs] of Object.entries(PAIRS)) {
      const t = where === "page" ? ed[name] : ed[`${name}Glass`];
      for (const p of pairs) {
        if (p.only && p.only !== name) continue;
        if (!(p.fg in t) || !(p.bg in t)) { add(false, `${name} ${where}: --${p.fg} or --${p.bg} is not a token`); continue; }
        const r = ratio(t[p.fg], t[p.bg], t.paper);
        add(r >= p.min, `${name.padEnd(5)} ${where.padEnd(5)} ${("--" + p.fg).padEnd(12)} on --${p.bg.padEnd(8)} ${r.toFixed(2).padStart(5)} (min ${p.min})${p.note ? "  " + p.note : ""}`);
      }
    }
  }
  const grounds = [
    ["night paper", "night", ed.night.paper], ["night card", "night", ed.night.panel],
    ["day paper", "day", ed.day.paper], ["day card", "day", ed.day.panel], ["day glass", "day", ed.dayGlass.panel],
  ];
  for (const s of swatches) {
    const each = grounds.map(([label, which, g]) => [label, s[which], ratio(s[which], g)]);
    const low = each.reduce((a, b) => (b[2] < a[2] ? b : a));
    add(low[2] >= 3, `team  ${s.team.padEnd(5)} night ${s.night} day ${s.day}  lowest ${low[2].toFixed(2)} on ${low[0]} (min 3)`);
  }
  return { lines, failures, editions: ed };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const here = dirname(fileURLToPath(import.meta.url));
  const { lines, failures } = checkContrast(readFileSync(join(here, "static", "site.css"), "utf8"));
  for (const l of lines) if (process.argv.includes("--verbose") || l.startsWith("FAIL")) console.log(l);
  if (failures.length) { console.error(`\n${failures.length} contrast pair(s) under their floor.`); process.exit(1); }
  console.log(`contrast: ${lines.length} pairs pass in both editions`);
}
