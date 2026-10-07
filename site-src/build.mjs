// clutchledger.com — the public website, built from live public data.
//
//   node site-src/build.mjs --out _site_v2 [--date 2026-10-03] [--days 7]
//                           [--save-data f.json] [--load-data f.json]
//
// Game pages: every game of the season so far (a shared link never breaks);
// --days N limits them to the last N nights for a quick local build.
//
// Reads with the public anon key what the free app shows (lib/data.mjs says
// exactly which rows), writes static HTML + one CSS file (both editions, Night
// and Day) + the theme, live and guide scripts + WOFF2 fonts + sitemap.xml, robots.txt,
// 404.html, _headers and _redirects, then checks every page: no betting word
// (the app's list), a unique title and description, a canonical, sizes in
// budget, and both editions' contrast (check-contrast.mjs). Any failure exits
// non-zero and nothing is deployed. Zero dependencies (Node 22+).
//
// Env: SUPABASE_URL, SUPABASE_ANON_KEY (required unless --load-data),
// SITE_DATE (the ET date to build for; default today in New York),
// WEB_APP_LIVE (true once app.clutchledger.com is open: the "play" links and
// the browser copy turn on; until then they point at the iPhone app),
// WEB_LAUNCH_PRO_UNTIL (an ISO date: with WEB_APP_LIVE, the Launch Pass copy —
// Pro free on the web until that date — shows while the date is ahead on New
// York's clock; then the plain web-app copy comes back at the next build),
// APP_STORE_PT (App Store Connect's provider token: App Store links then
// carry pt= and ct=site-<kind of page>, counted in App Analytics › Campaigns).

import { mkdirSync, writeFileSync, readFileSync, rmSync, copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { supabase, loadAll } from "./lib/data.mjs";
import { buildModel } from "./lib/model.mjs";
import { etDate, seasonOf } from "./lib/time.mjs";
import { FONTS, ORIGIN, WEB_APP_LIVE, WIN_TOTALS_RULES_URL, DESCRIPTION_MAX, LAUNCH_INPUT, LAUNCH_VALID, LAUNCH_UNTIL, LAUNCH_DAY } from "./lib/html.mjs";
import { ttfToWoff2 } from "./lib/woff2.mjs";
import { swatchOn } from "./lib/swatch.mjs";
import { checkContrast, editions } from "./check-contrast.mjs";
import { scanPages, selfTest } from "./lib/betting.mjs";
import { homePage } from "./lib/pages/home.mjs";
import { gamePage, nightPage } from "./lib/pages/game.mjs";
import { ledgerPage, receiptsPage } from "./lib/pages/paper.mjs";
import { howPage, pricingPage, termsPage, privacyPage, refundsPage, supportPage } from "./lib/pages/about.mjs";
import { teamPages, notFoundPage } from "./lib/pages/teams.mjs";
import { TERMS, PRIVACY, REFUNDS, SUPPORT, LEGAL_UPDATED } from "./content/legal.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUT = resolve(arg("--out", join(ROOT, "_site_v2")));
const TODAY = arg("--date", process.env.SITE_DATE || etDate());
// The season's first possible game day (its games start in early October; August is safely before).
const SEASON_FROM = `${seasonOf(TODAY).slice(0, 4)}-08-01`;
const DAYS = arg("--days") ? Number(arg("--days")) : Math.max(1, Math.round((Date.parse(TODAY) - Date.parse(SEASON_FROM)) / 86400e3));
const SB_URL = (process.env.SUPABASE_URL || "https://rgksgqnajvcsoftqncqe.supabase.co").replace(/\/$/, "");
const KEY = process.env.SUPABASE_ANON_KEY || "";
if (!/^\d{4}-\d{2}-\d{2}$/.test(TODAY)) { console.error(`--date: "${TODAY}" is not YYYY-MM-DD`); process.exit(1); }

const fail = [];
const warn = [];

// ── data ──
let raw;
if (arg("--load-data")) raw = JSON.parse(readFileSync(arg("--load-data"), "utf8"));
else {
  if (!KEY) { console.error("SUPABASE_ANON_KEY is not set"); process.exit(1); }
  raw = await loadAll(supabase(SB_URL, KEY), { today: TODAY, days: DAYS, warn: (s) => warn.push(s) });
}
if (arg("--save-data")) writeFileSync(arg("--save-data"), JSON.stringify(raw));
const m = buildModel(raw);

// ── pages ──
const pages = [];
pages.push(homePage(m));
for (const g of m.pageGames) pages.push(gamePage(g, m));
for (const d of Object.keys(m.nights)) pages.push(nightPage(d, m));
pages.push(ledgerPage(m), receiptsPage(m), howPage(m), pricingPage(), termsPage(), privacyPage(), refundsPage(), supportPage());
pages.push(...teamPages(m));
pages.push(notFoundPage());
// Old GitHub Pages links on the new domain: 301s in _redirects only (no .html
// stub pages: next to /terms/index.html a terms.html stub would answer /terms).
// The Win Totals rules stay on GitHub Pages (the App Store links there).
const LEGACY = { "/terms.html": "/terms/", "/privacy.html": "/privacy/", "/support.html": "/support/", "/win-totals-rules.html": WIN_TOTALS_RULES_URL, "/win-totals/": WIN_TOTALS_RULES_URL };

// ── assets: fonts, the stylesheet, the theme, live and guide scripts, content-hashed under /assets/ ──
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "assets"), { recursive: true });
const hash = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 10);
const fontFiles = {};
let fontBytes = 0;
for (const f of FONTS) {
  const woff2 = ttfToWoff2(readFileSync(join(ROOT, f.src)));
  const name = f.file.replace(/\.woff2$/, `.${hash(woff2)}.woff2`);
  writeFileSync(join(OUT, "assets", name), woff2);
  fontFiles[f.file] = `/assets/${name}`;
  fontBytes += woff2.length;
}
for (const lic of ["OFL-fraunces.txt", "OFL-libre-franklin.txt", "OFL-ibm-plex-mono.txt", "OFL-doto.txt"]) copyFileSync(join(ROOT, "desk-src", "fonts", lic), join(OUT, "assets", lic));

// The stylesheet sits in /assets/ next to the fonts: relative urls, and no format() hint (every browser that runs this CSS reads WOFF2).
// font-style normal and weight 400 are the descriptors' defaults: left out.
const fontCss = FONTS.map((f) => `@font-face{font-family:"${f.family}";${f.style === "normal" ? "" : `font-style:${f.style};`}${f.weight === 400 ? "" : `font-weight:${f.weight};`}font-display:swap;src:url(${fontFiles[f.file].replace("/assets/", "")})}`).join("\n");
const cssSource = readFileSync(join(HERE, "static", "site.css"), "utf8");
const ed = editions(cssSource);
// Team colours are marks, never text: 3:1 on every ground they are drawn on, lifted toward the
// ink in tenths when too dark (night) or too light (day) to see (lib/swatch.mjs, the app's rule).
// Night: the paper and the cards (the glass is the card's colour at night). Day: the night shade
// holds on the day paper, card and glass for almost every team (it was lifted to a mid tone);
// a team whose night shade is too light for day paper gets a Day shade, drawn on the glass too:
// its class reads var(--d<TEAM>, <night shade>) and the Day block sets --d<TEAM>.
const swatches = raw.teams.map((t) => {
  const night = swatchOn(t.primary_color || "#555555", [ed.night.paper, ed.night.panel], ed.night.ink);
  const holds = swatchOn(night, [ed.day.paper, ed.day.panel], ed.day.ink) === night;
  return { team: t.abbreviation, night, day: holds ? night : swatchOn(t.primary_color || "#555555", [ed.day.paper, ed.day.panel], ed.day.ink) };
});
const shade = (s) => (s.day === s.night ? s.night : `var(--d${s.team},${s.night})`);
// One rule per colour (several teams share one).
const by = new Map();
for (const s of swatches) by.set(shade(s), [...(by.get(shade(s)) ?? []), s.team]);
const teamCss = [...by].map(([c, teams]) => `${teams.map((t) => `.a-${t}`).join(",")}{--ca:${c}}${teams.map((t) => `.h-${t}`).join(",")}{--ch:${c}}`).join("");
const teamDayCss = swatches.filter((s) => s.day !== s.night).map((s) => `;--d${s.team}:${s.day}`).join("");
let css = cssSource.replace("/*@fonts*/", fontCss).replace("/*@teams*/", teamCss + "\n[hidden]{display:none!important}").replace("/*@teams-day*/", teamDayCss);
// The Day Edition is written once (inside @media (prefers-color-scheme:light), for Auto); a
// pinned Day (<html data-theme="light">) gets the same rules, outside the media query.
const dayRules = css.match(/\/\*@day\*\/([\s\S]*?)\/\*@day-end\*\//)?.[1];
if (!dayRules || !css.includes("/*@day-pinned*/")) { console.error("site.css: the /*@day*/ … /*@day-end*/ block or /*@day-pinned*/ is missing"); process.exit(1); }
css = css.replace("/*@day-pinned*/", dayRules.replaceAll(":root:not([data-theme=dark])", ":root[data-theme=light]"));
css = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n+/g, "\n").replace(/\s*([{};:,>])\s*/g, "$1").replace(/;}/g, "}").trim() + "\n";
// Short names for the tokens (the source keeps the readable ones).
const VARS = { amberHi: "ah", amberText: "at", linkHi: "lh", onAmber: "oa", display: "fd", paper: "p", panel: "q", rule2: "r2", rule3: "r3", rule: "r", ink2: "i2", ink3: "i3", ink: "i", amber: "a", body: "fb", mono: "fm", num: "fn", glow: "g", led: "l", dim: "dm", hot: "h", win: "w", shadow: "sh" };
for (const [k, v] of Object.entries(VARS)) css = css.replace(new RegExp(`--${k}(?![\\w-])`, "g"), `--${v}`);
// Shorter colour spellings, same colours: rgba() as #rrggbbaa, transparent as #0000.
const hex2 = (n) => Math.round(n).toString(16).padStart(2, "0").toUpperCase();
css = css.replace(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/g, (_, r, g, b, a) => `#${hex2(r)}${hex2(g)}${hex2(b)}${hex2(a * 255)}`).replace(/\btransparent\b/g, "#0000");
const cssName = `/assets/site.${hash(css)}.css`;
writeFileSync(join(OUT, cssName), css);

let live = readFileSync(join(HERE, "static", "live.js"), "utf8").replace("__SUPABASE_URL__", SB_URL).replace("__SUPABASE_ANON_KEY__", KEY);
live = live.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, "").replace(/^\s+/gm, "").replace(/\n+/g, "\n");
const liveName = `/assets/live.${hash(live)}.js`;
writeFileSync(join(OUT, liveName), live);

// Day or Night before the first paint: a tiny synchronous script in <head> (the CSP forbids inline ones).
// It is squeezed harder than live.js: no space around punctuation outside its string and regex
// literals (the file keeps to that: no comments inside, a semicolon after every statement).
const squeeze = (js) => js.split(/("(?:[^"\\\n]|\\.)*"|\/(?![*/])(?:[^/\\\n]|\\.)+\/)/).map((part, i) => (i % 2 ? part : part.replace(/\s*([=,;{}()<>?:!+%|&[\]])\s*/g, "$1").replace(/\s+/g, " "))).join("").trim() + "\n";
const themeJs = squeeze(readFileSync(join(HERE, "static", "theme.js"), "utf8").replace(/^\s*\/\*[\s\S]*?\*\/\s*/, ""));
try { new Function(themeJs); } catch (e) { console.error(`theme.js: squeezed into something that does not parse (${e.message})`); process.exit(1); }
const themeName = `/assets/theme.${hash(themeJs)}.js`;
writeFileSync(join(OUT, themeName), themeJs);

// The front page's guide ("Clutch in a minute"): deferred, on the front page only. Comments
// and indentation out, as in live.js (its words are in the page's <template>, not here).
const tourJs = readFileSync(join(HERE, "static", "tour.js"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s+/gm, "").replace(/\n+/g, "\n").trim() + "\n";
try { new Function(tourJs); } catch (e) { console.error(`tour.js: trimmed into something that does not parse (${e.message})`); process.exit(1); }
const tourName = `/assets/tour.${hash(tourJs)}.js`;
writeFileSync(join(OUT, tourName), tourJs);

// Wire the hashed names into every page.
for (const p of pages) {
  p.html = p.html.replaceAll('href="/site.css"', `href="${cssName}"`).replaceAll('src="/live.js"', `src="${liveName}"`).replaceAll('src="/theme.js"', `src="${themeName}"`).replaceAll('src="/tour.js"', `src="${tourName}"`);
  for (const [plain, hashed] of Object.entries(fontFiles)) p.html = p.html.replaceAll(`/fonts/${plain}`, hashed);
}

// ── static files ──
mkdirSync(join(OUT, "og"), { recursive: true });
for (const f of readdirSync(join(HERE, "static", "og"))) copyFileSync(join(HERE, "static", "og", f), join(OUT, "og", f));
for (const f of ["favicon.png", "apple-touch-icon.png", "icon-512.png"]) copyFileSync(join(HERE, "static", f), join(OUT, f));
writeFileSync(join(OUT, "_headers"), readFileSync(join(HERE, "static", "_headers"), "utf8").replaceAll("__SUPABASE_URL__", SB_URL));
writeFileSync(join(OUT, "_redirects"), Object.entries(LEGACY).map(([a, b]) => `${a} ${b} 301`).join("\n") + "\n");

// ── write the pages ──
for (const p of pages) {
  const file = p.path.endsWith("/") ? join(OUT, p.path, "index.html") : join(OUT, p.path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, p.html);
}
const indexed = pages.filter((p) => !p.redirect && p.path.endsWith("/"));
const today = new Date().toISOString().slice(0, 10);
// lastmod only moves when a page really changes (search engines stop trusting a
// sitemap whose every date is the build's): a past night is graded the morning
// after and stays put; the legal pages change on their own date; the rest is live.
const LEGAL_ISO = new Date(Date.parse(`${LEGAL_UPDATED} 12:00:00 GMT`)).toISOString().slice(0, 10);
const nextDay = (d) => new Date(Date.parse(`${d}T12:00:00Z`) + 86400e3).toISOString().slice(0, 10);
function lastmod(path) {
  const night = path.match(/^\/games\/(\d{4}-\d{2}-\d{2})\//)?.[1];
  if (night && nextDay(night) < TODAY) return nextDay(night);
  if (["/terms/", "/privacy/", "/refunds/", "/support/"].includes(path)) return LEGAL_ISO;
  return today;
}
writeFileSync(join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexed.map((p) => `<url><loc>${ORIGIN}${p.path}</loc><lastmod>${lastmod(p.path)}</lastmod><changefreq>${p.path === "/" || p.path.startsWith("/games/") ? "hourly" : "daily"}</changefreq><priority>${p.path === "/" ? "1.0" : p.path.startsWith("/games/") ? "0.8" : "0.6"}</priority></url>`).join("\n")}\n</urlset>\n`);
// Search engines and AI answers may read and cite the paper; model training may not
// (owner decision, chat 13). Content-Signal is Cloudflare's robots.txt extension;
// the named crawlers are the training-only ones, refused outright.
const TRAINING_CRAWLERS = ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "CCBot", "Meta-ExternalAgent", "Bytespider"];
writeFileSync(join(OUT, "robots.txt"), `User-agent: *\nContent-Signal: search=yes, ai-input=yes, ai-train=no\nAllow: /\n\n${TRAINING_CRAWLERS.map((b) => `User-agent: ${b}`).join("\n")}\nDisallow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);

// ── checks ──
// Nothing unapproved goes out: a draft or todo marker in the content or in a page fails the build.
for (const doc of [TERMS, PRIVACY, REFUNDS, SUPPORT]) {
  if (doc.draft) fail.push(`${doc.title}: marked draft`);
  for (const sec of doc.sections) if (sec.todo || sec.draft) fail.push(`${doc.title} › ${sec.title}: marked todo/draft`);
}
for (const p of pages) if (/<!--\s*(DRAFT|TODO)/i.test(p.html) || /TODO\(owner/i.test(p.html)) fail.push(`${p.path}: a draft or todo marker is in the page`);
const st = selfTest();
if (st.missed.length || st.wrong.length) fail.push(`betting-words self-test: missed ${JSON.stringify(st.missed)}, wrongly caught ${JSON.stringify(st.wrong)}`);
const scan = scanPages(pages.filter((p) => !p.redirect));
for (const h of scan.hits) fail.push(`betting word: ${h}`);
for (const s of scan.stale) fail.push(`betting-words allow-list entry matched nothing (remove it): ${s}`);
const seenTitle = new Map(), seenDesc = new Map();
for (const p of pages.filter((p) => !p.redirect)) {
  const t = p.html.match(/<title>([^<]*)<\/title>/)?.[1];
  const d = p.html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (!t || !d) fail.push(`${p.path}: missing title or description`);
  const noindex = p.html.includes('<meta name="robots" content="noindex">');
  if (!noindex && !p.html.includes('<link rel="canonical" href="https://clutchledger.com/')) fail.push(`${p.path}: no canonical`);
  if (noindex && p.html.includes('rel="canonical"')) fail.push(`${p.path}: a canonical on a noindex page`);
  if (d && d.length > DESCRIPTION_MAX) fail.push(`${p.path}: description ${d.length} characters (search results cut at ${DESCRIPTION_MAX})`);
  if (seenTitle.has(t)) fail.push(`${p.path}: title also on ${seenTitle.get(t)}`); else seenTitle.set(t, p.path);
  if (seenDesc.has(d)) fail.push(`${p.path}: description also on ${seenDesc.get(d)}`); else seenDesc.set(d, p.path);
  if (/\sstyle="/.test(p.html) || /<script>(?!\s*$)/.test(p.html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, ""))) fail.push(`${p.path}: inline style or script (the CSP forbids both)`);
  if (KEY && p.html.includes(KEY)) fail.push(`${p.path}: the anon key is in a page (it belongs only in the live script)`);
  const kb = Buffer.byteLength(p.html) / 1024;
  if (kb > 60) warn.push(`${p.path}: ${kb.toFixed(1)} KB (budget 60)`);
  if (kb > 120) fail.push(`${p.path}: ${kb.toFixed(1)} KB`);
}
// Both editions: every text pair at its floor, every team swatch 3:1 on its grounds (check-contrast.mjs).
const contrast = checkContrast(cssSource, { swatches });
for (const f of contrast.failures) fail.push(`contrast: ${f}`);
// The browser bar's colour is each edition's paper, in the page head and in theme.js.
for (const c of [ed.night.paper, ed.day.paper]) {
  if (!themeJs.includes(c)) fail.push(`theme.js: the paper ${c} is not its theme-color`);
  if (!pages[0].html.includes(`<meta name="theme-color" content="${c}"`)) fail.push(`the page head: no theme-color ${c}`);
}
if (!pages.filter((p) => !p.redirect).every((p) => p.html.includes(`<script src="${themeName}"></script>`))) fail.push("a page without the theme script");
if (!pages[0].html.includes(`<script src="${tourName}" defer></script>`) || !pages[0].html.includes('<template id="tour">')) fail.push("the front page without its guide (tour.js and its template)");
// The Launch Pass input: said out loud when it is set but not shown.
if (LAUNCH_INPUT) {
  if (!LAUNCH_VALID) warn.push(`WEB_LAUNCH_PRO_UNTIL "${LAUNCH_INPUT}" is not a date (YYYY-MM-DD): no Launch Pass copy`);
  else if (!WEB_APP_LIVE) warn.push(`WEB_LAUNCH_PRO_UNTIL is ${LAUNCH_INPUT} but WEB_APP_LIVE is off: no Launch Pass copy`);
  else if (!LAUNCH_UNTIL) warn.push(`the Launch Pass is over (WEB_LAUNCH_PRO_UNTIL ${LAUNCH_INPUT}, today ${etDate()} ET): the plain web-app copy is back; the variable can go`);
}
const cssKB = Buffer.byteLength(css) / 1024, liveKB = Buffer.byteLength(live) / 1024, themeB = Buffer.byteLength(themeJs);
const tourB = Buffer.byteLength(tourJs), tourGz = gzipSync(tourJs, { level: 9 }).length;
if (cssKB > 32) fail.push(`CSS ${cssKB.toFixed(1)} KB (budget 32 KB, 32,768 bytes)`);
if (liveKB > 5) fail.push(`live script ${liveKB.toFixed(1)} KB (budget 5)`);
if (themeB > 700) fail.push(`theme script ${themeB} bytes (budget 700: it blocks the first paint)`);
if (tourGz > 3072) fail.push(`guide script ${tourGz} bytes gzipped (budget 3 KB)`);

// ── report ──
const sizes = indexed.map((p) => Buffer.byteLength(p.html));
const kinds = { games: m.pageGames.length, nights: Object.keys(m.nights).length, teams: pages.filter((p) => p.path.startsWith("/teams/")).length };
console.log(`site ${TODAY} → ${OUT} · web app ${WEB_APP_LIVE ? "LIVE (browser links on)" : "not live (play links → App Store)"}${LAUNCH_UNTIL ? ` · Launch Pass on: Pro free on the web until ${LAUNCH_DAY}` : ""}`);
console.log(`  ${pages.length} pages (${indexed.length} indexed; ${kinds.games} game pages over ${kinds.nights} nights, ${kinds.teams} team pages), tonight = ${m.tonight ?? "none"}`);
console.log(`  html ${(Math.min(...sizes) / 1024).toFixed(1)}–${(Math.max(...sizes) / 1024).toFixed(1)} KB · css ${cssKB.toFixed(1)} KB · live.js ${liveKB.toFixed(2)} KB · theme.js ${themeB} B · tour.js ${tourB} B (${tourGz} B gzip) · fonts ${(fontBytes / 1024).toFixed(0)} KB (${FONTS.length} woff2)`);
for (const w of warn) console.warn(`  warn: ${w}`);
if (fail.length) {
  for (const f of fail) console.error(`  FAIL: ${f}`);
  process.exit(1);
}
console.log(`  checks: betting words clean · titles/descriptions unique · canonicals · no inline style/script · budgets OK · contrast ${contrast.lines.length} pairs in both editions`);
