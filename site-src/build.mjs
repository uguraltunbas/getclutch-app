// clutchledger.com — the public website, built from live public data.
//
//   node site-src/build.mjs --out _site_v2 [--date 2026-10-03] [--days 7]
//                           [--save-data f.json] [--load-data f.json]
//                           [--og-cache dir] [--og-budget 15]
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
// Share cards (lib/ogcards.mjs): each game page of the last two weeks gets its
// own 1200×630 card under /og/g/, drawn with the desk's renderer (headless
// Chrome: CHROME_PATH) and kept in --og-cache (OG_CACHE; default .og-cache/,
// which site.yml carries from build to build); at most --og-budget new cards a
// build. Without Chrome the build still passes: those pages keep /og/game.jpg.
//
// Env: SUPABASE_URL, SUPABASE_ANON_KEY (required unless --load-data),
// SITE_DATE (the ET date to build for; default today in New York),
// WEB_APP_LIVE (true once app.clutchledger.com is open: the "play" links and
// the browser copy turn on; until then they point at the iPhone app),
// WEB_LAUNCH_PRO_UNTIL (an ISO date, a guard the site never prints: with
// WEB_APP_LIVE, the Launch Pass copy — Pro free on the web during the launch,
// which ends when web sales open — shows while New York's date is on or before
// it; from the day after, the plain web-app copy comes back at the next build),
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
import { FONTS, ORIGIN, APP, APP_STORE, INDEXNOW_KEY, WEB_APP_LIVE, WIN_TOTALS_RULES_URL, DESCRIPTION_MAX, LAUNCH_INPUT, LAUNCH_VALID, LAUNCH_UNTIL, LAUNCH_ON, LAUNCH_WORDS } from "./lib/html.mjs";
import { ttfToWoff2 } from "./lib/woff2.mjs";
import { swatchOn } from "./lib/swatch.mjs";
import { checkContrast, editions } from "./check-contrast.mjs";
import { scanPages, selfTest, bettingWordsIn, textSegments } from "./lib/betting.mjs";
import { planCards, prepareCards, publishCards, cardText, OG_BUDGET, OG_DAYS } from "./lib/ogcards.mjs";
import { rec, RATE_FLOOR, RECEIPTS_REPO } from "./lib/copy.mjs";
import { homePage } from "./lib/pages/home.mjs";
import { gamePage, nightPage } from "./lib/pages/game.mjs";
import { ledgerPage, receiptsPage } from "./lib/pages/paper.mjs";
import { howPage, pricingPage, faqPage, companyPage, termsPage, privacyPage, refundsPage, supportPage } from "./lib/pages/about.mjs";
import { teamPages, notFoundPage } from "./lib/pages/teams.mjs";
import { accuracyPage, backtestSentence, backtestBands } from "./lib/pages/accuracy.mjs";
import { matchupPages } from "./lib/pages/matchups.mjs";
import { playoffsPage } from "./lib/pages/playoffs.mjs";
import { tonightPage } from "./lib/pages/tonight.mjs";
import { learnPages } from "./lib/pages/learn.mjs";
import { weekPages } from "./lib/pages/weeks.mjs";
import { trPages, TR_WORDS } from "./lib/pages/tr.mjs";
import { embedPages, badgeFiles, BADGE } from "./lib/pages/embed.mjs";
import { feedXml, feedItems, FEED } from "./lib/feed.mjs";
import { dataPage, dataFiles, dataRows, FILES, FTE_COLUMNS } from "./lib/pages/data.mjs";
import { TERMS, PRIVACY, REFUNDS, SUPPORT, LEGAL_UPDATED } from "./content/legal.mjs";
import { FEATURES, PLAN } from "./content/features.mjs";

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

// ── share cards: drawn (or found in the cache) before the pages, which name them ──
const OG_CACHE = resolve(arg("--og-cache", process.env.OG_CACHE || join(ROOT, ".og-cache")));
const ogPlan = planCards(m);
const ogStart = Date.now();
const og = prepareCards(ogPlan, { cache: OG_CACHE, deskDir: join(ROOT, "desk-src"), budget: Number(arg("--og-budget", OG_BUDGET)), warn: (s) => warn.push(s) });
const ogSecs = (Date.now() - ogStart) / 1000;
m.og = Object.fromEntries(ogPlan.filter((x) => og.ready.has(x.name)).map((x) => [x.g.id, { name: x.name, alt: x.card.alt }]));

// ── pages ──
const pages = [];
pages.push(homePage(m), tonightPage(m));
for (const g of m.pageGames) pages.push(gamePage(g, m));
for (const d of Object.keys(m.nights)) pages.push(nightPage(d, m));
pages.push(ledgerPage(m), accuracyPage(m), receiptsPage(m), howPage(m), pricingPage(m), faqPage(m), companyPage(), termsPage(), privacyPage(), refundsPage(), supportPage());
pages.push(...teamPages(m));
pages.push(...matchupPages(m));
const playoffs = playoffsPage(m);
pages.push(...learnPages(m));
pages.push(...weekPages(m));
pages.push(...trPages(m));
pages.push(...embedPages(m));
pages.push(dataPage(m));
if (playoffs) pages.push(playoffs); else warn.push("no season board: /playoff-chances/ left out");
pages.push(notFoundPage());
// Old GitHub Pages links on the new domain: 301s in _redirects only (no .html
// stub pages: next to /terms/index.html a terms.html stub would answer /terms).
// The Win Totals rules stay on GitHub Pages (the App Store links there).
const LEGACY = { "/terms.html": "/terms/", "/privacy.html": "/privacy/", "/support.html": "/support/", "/win-totals-rules.html": WIN_TOTALS_RULES_URL, "/win-totals/": WIN_TOTALS_RULES_URL };

// ── assets: fonts, the stylesheet, the live and guide scripts, content-hashed under /assets/; the theme script, inline ──
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

// Day or Night before the first paint: a tiny synchronous script, inline in every page's <head>
// (2026-10-29: as its own file it held a phone's first paint ~0.7 s). The CSP admits exactly this
// script by its sha256 (static/_headers) and no other inline one.
// It is squeezed harder than live.js: no space around punctuation outside its string and regex
// literals (the file keeps to that: no comments inside, a semicolon after every statement).
const squeeze = (js) => js.split(/("(?:[^"\\\n]|\\.)*"|\/(?![*/])(?:[^/\\\n]|\\.)+\/)/).map((part, i) => (i % 2 ? part : part.replace(/\s*([=,;{}()<>?:!+%|&[\]])\s*/g, "$1").replace(/\s+/g, " "))).join("").trim();
const themeJs = squeeze(readFileSync(join(HERE, "static", "theme.js"), "utf8").replace(/^\s*\/\*[\s\S]*?\*\/\s*/, ""));
try { new Function(themeJs); } catch (e) { console.error(`theme.js: squeezed into something that does not parse (${e.message})`); process.exit(1); }
if (/<\/script|<!--/i.test(themeJs)) { console.error("theme.js: holds </script or <!--, which can't sit inside an inline <script>"); process.exit(1); }
const themeTag = `<script>${themeJs}</script>`;
const themeHash = `'sha256-${createHash("sha256").update(themeJs).digest("base64")}'`;

// The front page's guide ("Clutch in a minute"): deferred, on the front page only. Comments
// and indentation out, as in live.js (its words are in the page's <template>, not here).
const tourJs = readFileSync(join(HERE, "static", "tour.js"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s+/gm, "").replace(/\n+/g, "\n").trim() + "\n";
try { new Function(tourJs); } catch (e) { console.error(`tour.js: trimmed into something that does not parse (${e.message})`); process.exit(1); }
const tourName = `/assets/tour.${hash(tourJs)}.js`;
writeFileSync(join(OUT, tourName), tourJs);

// The embeddable boxes' own small stylesheet (lib/pages/embed.mjs): comments and spaces out, content-hashed.
const embedCss = readFileSync(join(HERE, "static", "embed.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s*([{};:,>])\s*/g, "$1").replace(/\n+/g, "").trim() + "\n";
const embedCssName = `/assets/embed.${hash(embedCss)}.css`;
writeFileSync(join(OUT, embedCssName), embedCss);
if (Buffer.byteLength(embedCss) > 3072) fail.push(`embed.css ${Buffer.byteLength(embedCss)} bytes (budget 3 KB)`);

// Wire the hashed names into every page.
for (const p of pages) {
  p.html = p.html.replaceAll('href="/embed.css"', `href="${embedCssName}"`).replaceAll('href="/site.css"', `href="${cssName}"`).replaceAll('src="/live.js"', `src="${liveName}"`).replaceAll('<script src="/theme.js"></script>', () => themeTag).replaceAll('src="/tour.js"', `src="${tourName}"`);
  for (const [plain, hashed] of Object.entries(fontFiles)) p.html = p.html.replaceAll(`/fonts/${plain}`, hashed);
}

// ── static files ──
mkdirSync(join(OUT, "og"), { recursive: true });
for (const f of readdirSync(join(HERE, "static", "og"))) copyFileSync(join(HERE, "static", "og", f), join(OUT, "og", f));
publishCards(ogPlan, og.ready, { cache: OG_CACHE, out: OUT });
// Images the e-mails load (ml-engine jobs/announce.py): logo, App Store badge, X icon. Names never change.
mkdirSync(join(OUT, "email"), { recursive: true });
for (const f of readdirSync(join(HERE, "static", "email"))) copyFileSync(join(HERE, "static", "email", f), join(OUT, "email", f));
// Launch-directory badges the front page's footer shows (html.mjs LISTED_ON), served from here: the CSP loads no outside image.
mkdirSync(join(OUT, "badges"), { recursive: true });
for (const f of readdirSync(join(HERE, "static", "badges"))) copyFileSync(join(HERE, "static", "badges", f), join(OUT, "badges", f));
for (const f of ["favicon.png", "apple-touch-icon.png", "icon-512.png"]) copyFileSync(join(HERE, "static", f), join(OUT, f));
// The open data (lib/pages/data.mjs): Clutch's own numbers as JSON and CSV, rebuilt with the pages.
const data = dataFiles(m);
mkdirSync(join(OUT, "data"), { recursive: true });
for (const f of data) writeFileSync(join(OUT, f.path), f.body);
// The badges (lib/badge.mjs, lib/pages/embed.mjs) and the RSS feed (lib/feed.mjs), rebuilt with the pages.
const badges = badgeFiles(m);
mkdirSync(join(OUT, BADGE), { recursive: true });
for (const b of badges) writeFileSync(join(OUT, b.path), b.body);
const feed = feedXml(m);
writeFileSync(join(OUT, FEED), feed);
writeFileSync(join(OUT, "_headers"), readFileSync(join(HERE, "static", "_headers"), "utf8").replaceAll("__SUPABASE_URL__", SB_URL).replaceAll("__THEME_SHA256__", themeHash));
writeFileSync(join(OUT, "_redirects"), Object.entries(LEGACY).map(([a, b]) => `${a} ${b} 301`).join("\n") + "\n");

// ── write the pages ──
for (const p of pages) {
  const file = p.path.endsWith("/") ? join(OUT, p.path, "index.html") : join(OUT, p.path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, p.html);
}
const indexed = pages.filter((p) => !p.redirect && !p.embed && p.path.endsWith("/"));
const today = new Date().toISOString().slice(0, 10);
// lastmod only moves when a page really changes (search engines stop trusting a
// sitemap whose every date is the build's): a past night is graded the morning
// after and stays put; the legal pages change on their own date; the rest is live.
const LEGAL_ISO = new Date(Date.parse(`${LEGAL_UPDATED} 12:00:00 GMT`)).toISOString().slice(0, 10);
const nextDay = (d) => new Date(Date.parse(`${d}T12:00:00Z`) + 86400e3).toISOString().slice(0, 10);
function lastmod(path) {
  const night = path.match(/^\/games\/(\d{4}-\d{2}-\d{2})\//)?.[1];
  if (night && nextDay(night) < TODAY) return nextDay(night);
  // A finished week's page is fixed the morning after its Sunday.
  const week = path.match(/^\/ledger\/weeks\/(\d{4}-\d{2}-\d{2})\/$/)?.[1];
  if (week) { const after = new Date(Date.parse(`${week}T12:00:00Z`) + 7 * 86400e3).toISOString().slice(0, 10); if (after < TODAY) return after; }
  if (["/terms/", "/privacy/", "/refunds/", "/support/"].includes(path)) return LEGAL_ISO;
  return today;
}
writeFileSync(join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexed.map((p) => `<url><loc>${ORIGIN}${p.path}</loc><lastmod>${lastmod(p.path)}</lastmod><changefreq>${p.path === "/" || p.path === "/tonight/" || p.path.startsWith("/games/") ? "hourly" : "daily"}</changefreq><priority>${p.path === "/" ? "1.0" : p.path === "/tonight/" ? "0.9" : p.path.startsWith("/games/") ? "0.8" : "0.6"}</priority></url>`).join("\n")}\n</urlset>\n`);
// Search engines, AI answers and model training may all read the paper: a new name
// is known to an assistant only if it was in what the model learned from (owner
// decision 2026-10-25, reversing chat 13's ai-train=no). Content-Signal is
// Cloudflare's robots.txt extension. Bytespider stays refused (crawls far past
// any use to the site).
const REFUSED_CRAWLERS = ["Bytespider"];
writeFileSync(join(OUT, "robots.txt"), `User-agent: *\nContent-Signal: search=yes, ai-input=yes, ai-train=yes\nAllow: /\n\n${REFUSED_CRAWLERS.map((b) => `User-agent: ${b}`).join("\n")}\nDisallow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
// IndexNow proves the site owns the key by serving it at /<key>.txt; site-src/indexnow.mjs pings after deploy.
writeFileSync(join(OUT, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY + "\n");
// /llms.txt (llmstxt.org): the site in a few lines for AI answers — what Clutch is, the record as of
// this build (the Ledger's rule: no rate under twenty calls), what is free and what Pro adds (the
// app's one FEATURES list, word for word, as on the pricing page), where it runs, and where each
// thing is. Held to the same betting-word check as the pages.
const r = m.record;
const llmsRecord = r
  ? `${r.season} so far: ${rec(r.hits, r.n)} on ${r.n} graded calls${r.n >= RATE_FLOOR && r.hitRate != null ? ` (${r.hitRate.toFixed(1)}% right)` : ` (too few for a rate; one is quoted from ${RATE_FLOOR})`}, as of ${m.ledgerAt ? m.ledgerAt.slice(0, 10) : TODAY}.`
  : `The ${m.current} record starts with the regular season's first graded finals.`;
const llmsBands = backtestBands(m.accuracy?.current_version);
const llmsCalibration = llmsBands
  ? `\n- In the same test, each band of Clutch's numbers came true within ${Math.max(...llmsBands.bands.map((b) => Math.abs(b.happened - b.said))).toFixed(1)} points of what it said: ${llmsBands.bands.map((b) => `${Math.round(b.lo * 100)}–${Math.round(b.hi * 100)}% calls averaged ${b.said.toFixed(0)}% and won ${b.happened.toFixed(0)}%`).join("; ")}.`
  : "";
const llms = `# Clutch

> NBA win probability for every game, sealed before tip in a public GitHub repository and graded in public after the final. Free on the web (app.clutchledger.com) and on iPhone. Also known as Clutch Ledger.

- Each morning Clutch publishes one number per NBA game: the chance the side it favours wins. The number is sealed with a SHA-256 fingerprint before tip-off and never edited.
- After the final, the Ledger grades it beside ESPN BPI, the market and picking the home team every night, on the same games. Misses stay on the record.
- ${llmsRecord}
- ${backtestSentence(m.accuracy?.benchmark) ?? "The model's two-season test is on the How it works page."}${llmsCalibration}
- Clutch is analytics for fans, not advice: it makes no calls on margins or totals and carries no affiliate links.

## Free, in the browser and on iPhone

${FEATURES.filter((f) => f.free).map((f) => `- ${f.label}`).join("\n")}

## What ${PLAN.name} adds (${PLAN.monthly} a month or ${PLAN.annual} a year, ${PLAN.trialDays} days free)

${FEATURES.filter((f) => !f.free).map((f) => `- ${f.label}`).join("\n")}

## Where it runs

- In any browser at ${APP}/: everything to follow and call, signed in with Apple or Google.${LAUNCH_ON ? ` The Launch Pass: ${LAUNCH_WORDS}.` : ""}
- The iPhone app (${APP_STORE}): the same, plus Live Activities on the lock screen, home screen widgets, Siri and iMessage challenges.
- One account everywhere; Pro bought on one carries over to the other.
- Points come from your calls and level you up through titles (Rookie to Hall of Fame); they can't be bought or sold, have no cash value and unlock nothing paid. Everyone signed in also gets one Free Pro day a month.

## The paper

- [Tonight](${ORIGIN}/tonight/): every game tonight with Clutch's win probability, in a sentence each, and how last night's calls came out
- [Front page](${ORIGIN}/): tonight's games with Clutch's number, the market's beside it, and the top reasons
- [The Ledger](${ORIGIN}/ledger/): every graded call this season, right and wrong, in date order
- [Accuracy](${ORIGIN}/accuracy/): the record, calibration by band, and Clutch against ESPN BPI, the market and the home team
- [Proof](${ORIGIN}/receipts/): every night's sealed files and how to check one yourself
- [Playoff chances](${ORIGIN}/playoff-chances/): every team's chance to make the playoffs, from 10,000 simulated seasons, updated nightly
- [Teams](${ORIGIN}/teams/): each team's next games with Clutch's call, playoff chance and graded finals; head-to-head pages from each
- [Open data](${ORIGIN}/data/): every number this season as free JSON and CSV (CC BY 4.0), including a CSV in the layout of FiveThirtyEight's retired nba_elo_latest.csv
- [RSS feed](${ORIGIN}${FEED}): each Learn article and each finished week of graded calls

## About

- [How it works](${ORIGIN}/how-it-works/): the model, the two-season test and its limits
- [Learn](${ORIGIN}/learn/): what NBA win probability means, calibration and the Brier score, how accurate ESPN BPI is, and how to check a prediction came before the game, and what to use now that FiveThirtyEight's NBA forecast is gone
- [Pricing](${ORIGIN}/pricing/): what is free and what Pro adds
- [Company](${ORIGIN}/company/): who makes Clutch
- [The sealed files on GitHub](${RECEIPTS_REPO})

## Optional

- [Support](${ORIGIN}/support/)
- [Terms](${ORIGIN}/terms/)
- [Privacy](${ORIGIN}/privacy/)
`;
writeFileSync(join(OUT, "llms.txt"), llms);

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
// The Turkish pages: the Turkish words a review reads as wagering, too.
for (const p of pages.filter((p) => p.path.startsWith("/tr/"))) for (const seg of textSegments(p.html)) if (TR_WORDS.test(seg)) fail.push(`Turkish betting word: ${p.path} ${seg.slice(0, 80)}`);
if (!TR_WORDS.test("Bugünün kupon önerisi") || TR_WORDS.test("Kazanma olasılığı ve playoff şansı")) fail.push("Turkish betting-word self-test");
for (const line of llms.split("\n")) for (const id of bettingWordsIn(line)) fail.push(`betting word: /llms.txt [${id}] ${line}`);
for (const s of scan.stale) fail.push(`betting-words allow-list entry matched nothing (remove it): ${s}`);
// The open data: four files, one set of games. Each probability in [0, 1] with its other side summing to 1,
// the 538-layout file's header exactly FTE_COLUMNS, and as many rows in every season file as games.json holds.
{
  const rows = dataRows(m);
  const body = (p) => data.find((f) => f.path === p)?.body ?? "";
  const json = JSON.parse(body(FILES.games) || "{}");
  if ((json.games ?? []).length !== rows.length) fail.push(`${FILES.games}: ${(json.games ?? []).length} games, expected ${rows.length}`);
  for (const p of [FILES.gamesCsv, FILES.fte]) { const n = body(p).trimEnd().split("\n").length - 1; if (n !== rows.length) fail.push(`${p}: ${n} rows, expected ${rows.length}`); }
  if (body(FILES.fte).split("\n")[0] !== FTE_COLUMNS.join(",")) fail.push(`${FILES.fte}: header is not ${FTE_COLUMNS.join(",")}`);
  for (const r of rows) {
    const a = r.clutch_home_win_prob, b = r.clutch_away_win_prob;
    if (!(a >= 0 && a <= 1) || Math.abs(a + b - 1) > 1e-4) fail.push(`${FILES.games}: ${r.game_id} probabilities ${a} / ${b}`);
  }
  if (!rows.length) warn.push("open data: no game has a number yet (the files are empty)");
  if (JSON.parse(body(FILES.tonight) || "{}").games == null) fail.push(`${FILES.tonight}: no games list`);
}
// A badge per team plus the record, each one line of SVG with no sportsbook word; the feed names every item once.
if (badges.length !== m.raw.teams.length + 1) fail.push(`${BADGE}: ${badges.length} badges, expected ${m.raw.teams.length + 1}`);
for (const b of badges) {
  if (!b.body.startsWith("<svg ") || !/^<svg[^>]* width="(\d+)"/.test(b.body) || +b.body.match(/ width="(\d+)"/)[1] > 480) fail.push(`${b.path}: not a one-line badge`);
  for (const id of bettingWordsIn(b.text)) fail.push(`betting word: ${b.path} [${id}] ${b.text}`);
}
const fed = feedItems(m);
if ((feed.match(/<item>/g) ?? []).length !== fed.length || new Set(fed.map((i) => i.path)).size !== fed.length) fail.push(`${FEED}: items don't match (${fed.length})`);
for (const i of fed) for (const id of bettingWordsIn(`${i.title} ${i.description}`)) fail.push(`betting word: ${FEED} [${id}] ${i.title}`);
// The share cards' words (every planned card, drawn this build or not) and the image each page names.
for (const x of ogPlan) for (const s of cardText(x.card)) for (const id of bettingWordsIn(s)) fail.push(`betting word: share card /og/${x.name}.jpg [${id}] ${s}`);
for (const p of pages.filter((p) => !p.redirect)) {
  for (const [, u] of p.html.matchAll(/<meta (?:property="og:image"|name="twitter:image") content="([^"]*)">/g)) {
    if (!u.startsWith(`${ORIGIN}/`) || !existsSync(join(OUT, u.slice(ORIGIN.length)))) fail.push(`${p.path}: its share image ${u} is not in the build`);
  }
  for (const [, u] of p.html.matchAll(/"image":"([^"]*)"/g)) if (u.startsWith(`${ORIGIN}/og/`) && !existsSync(join(OUT, u.slice(ORIGIN.length)))) fail.push(`${p.path}: its JSON-LD image ${u} is not in the build`);
}
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
  if (/\sstyle="/.test(p.html) || /<script>(?!\s*$)/.test(p.html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "").replace(themeTag, ""))) fail.push(`${p.path}: inline style or script (the CSP forbids both, the theme script aside)`);
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
if (!pages.filter((p) => !p.redirect && !p.embed).every((p) => p.html.includes(themeTag))) fail.push("a page without the theme script");
if (!readFileSync(join(OUT, "_headers"), "utf8").includes(`script-src 'self' ${themeHash} `)) fail.push("_headers: the CSP doesn't admit the theme script's hash");
if (!pages[0].html.includes(`<script src="${tourName}" defer></script>`) || !pages[0].html.includes('<template id="tour">')) fail.push("the front page without its guide (tour.js and its template)");
// The Launch Pass input: said out loud when it is set but not shown.
if (LAUNCH_INPUT) {
  if (!LAUNCH_VALID) warn.push(`WEB_LAUNCH_PRO_UNTIL "${LAUNCH_INPUT}" is not a date (YYYY-MM-DD): no Launch Pass copy`);
  else if (!WEB_APP_LIVE) warn.push(`WEB_LAUNCH_PRO_UNTIL is ${LAUNCH_INPUT} but WEB_APP_LIVE is off: no Launch Pass copy`);
  else if (!LAUNCH_UNTIL) warn.push(`the Launch Pass is over (it ran through WEB_LAUNCH_PRO_UNTIL ${LAUNCH_INPUT}; today is ${etDate()} ET): the plain web-app copy is back; the variable can go`);
}
// The Launch Pass runs until web sales open (owner, 2026-10-27): no words near it give an end date
// ("until Nov 3", "by Nov 3", "through Dec 31"), on any page or in llms.txt.
{
  const END = /\b(?:until|till|by|through|thru|ends?|ending)\s+(?:on\s+)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}\b/i;
  const near = (where, text) => {
    for (const m of text.matchAll(/launch pass/gi)) {
      const around = text.slice(Math.max(0, m.index - 160), m.index + 200);
      if (END.test(around)) { fail.push(`${where}: the Launch Pass with an end date — "${around.match(END)[0]}"`); return; }
    }
  };
  for (const p of pages.filter((p) => !p.redirect)) near(p.path, textSegments(p.html).join(" "));
  near("/llms.txt", llms);
  if (!END.test("PRO FREE ON THE WEB UNTIL NOV 3") || END.test("Model fit on games through June")) fail.push("Launch Pass end-date self-test");
}
const cssKB = Buffer.byteLength(css) / 1024, liveKB = Buffer.byteLength(live) / 1024, themeB = Buffer.byteLength(themeJs);
const tourB = Buffer.byteLength(tourJs), tourGz = gzipSync(tourJs, { level: 9 }).length;
// 34 KB since the Theme button moved to the masthead's corner at every width (it had
// 149 bytes left at 32); still one render-blocking file, content-hashed, cached a year.
if (cssKB > 34) fail.push(`CSS ${cssKB.toFixed(1)} KB (budget 34 KB, 34,816 bytes)`);
if (liveKB > 5) fail.push(`live script ${liveKB.toFixed(1)} KB (budget 5)`);
if (themeB > 700) fail.push(`theme script ${themeB} bytes (budget 700: it is in every page's head)`);
if (tourGz > 3072) fail.push(`guide script ${tourGz} bytes gzipped (budget 3 KB)`);

// ── report ──
const sizes = indexed.map((p) => Buffer.byteLength(p.html));
const kinds = { games: m.pageGames.length, nights: Object.keys(m.nights).length, teams: pages.filter((p) => p.path.startsWith("/teams/")).length, matchups: pages.filter((p) => p.path.startsWith("/matchups/")).length };
console.log(`site ${TODAY} → ${OUT} · web app ${WEB_APP_LIVE ? "LIVE (browser links on)" : "not live (play links → App Store)"}${LAUNCH_ON ? ` · Launch Pass on (guard ${LAUNCH_UNTIL}, never printed)` : ""}`);
console.log(`  ${pages.length} pages (${indexed.length} indexed; ${kinds.games} game pages over ${kinds.nights} nights, ${kinds.teams} team pages, ${kinds.matchups} head-to-head pages), tonight = ${m.tonight ?? "none"}`);
console.log(`  share cards: ${og.ready.size} of ${ogPlan.length} game pages of the last ${OG_DAYS} days (${og.rendered} drawn now in ${ogSecs.toFixed(1)}s, ${og.missing} on /og/game.jpg until a later build, ${og.pruned} old cards deleted)`);
console.log(`  html ${(Math.min(...sizes) / 1024).toFixed(1)}–${(Math.max(...sizes) / 1024).toFixed(1)} KB · css ${cssKB.toFixed(1)} KB · live.js ${liveKB.toFixed(2)} KB · theme.js ${themeB} B · tour.js ${tourB} B (${tourGz} B gzip) · fonts ${(fontBytes / 1024).toFixed(0)} KB (${FONTS.length} woff2)`);
for (const w of warn) console.warn(`  warn: ${w}`);
if (fail.length) {
  for (const f of fail) console.error(`  FAIL: ${f}`);
  process.exit(1);
}
console.log(`  checks: betting words clean · titles/descriptions unique · canonicals · no inline style/script but the theme's · budgets OK · contrast ${contrast.lines.length} pairs in both editions`);
