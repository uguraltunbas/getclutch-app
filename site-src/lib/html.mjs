// The page shell and the pieces every page shares: head (title, canonical,
// Open Graph, JSON-LD, preloaded fonts, the theme script), the masthead, the
// footer, the LED rail. No inline style or script anywhere — the CSP allows
// neither — so team colours are classes in the stylesheet, widths are SVG
// attributes, and Day or Night is set by a tiny external script in <head>.

import { etDate, shortDate } from "./time.mjs";

export const ORIGIN = "https://clutchledger.com";
export const APP = "https://app.clutchledger.com";
export const APP_STORE = "https://apps.apple.com/app/id6761838099";
/** The official Win Totals rules: on the GitHub Pages site the App Store links to, not on this domain (Paddle reviews this one). */
export const WIN_TOTALS_RULES_URL = "https://uguraltunbas.github.io/getclutch-app/win-totals-rules.html";

/**
 * Is the web app (app.clutchledger.com) open to readers? Until it is, every
 * "play" link goes to the App Store and no sentence promises the browser:
 * WEB_APP_LIVE=true in the build's environment (the repository variable the
 * workflow passes) turns the browser links and copy on.
 */
export const WEB_APP_LIVE = /^(1|true|yes)$/i.test(process.env.WEB_APP_LIVE ?? "");
/** Where "play" goes: the web app when it is open, else the iPhone app. */
export const PLAY = WEB_APP_LIVE ? `${APP}/` : APP_STORE;
/** A game in the web app, or the iPhone app until the web app is open. */
export const playGame = (id) => (WEB_APP_LIVE ? `${APP}/games/${id}` : APP_STORE);
/** Pro's checkout: the web app's paywall, or the iPhone app. */
export const PLAY_PRO = WEB_APP_LIVE ? `${APP}/paywall` : APP_STORE;

/**
 * The Launch Pass (owner, 2026-10-07): sign in on the web app, tap Claim, and
 * every Pro feature is free on the web through a date — WEB_LAUNCH_PRO_UNTIL,
 * an ISO date (a repository variable, like WEB_APP_LIVE): the pass is Pro
 * through that day in New York and can still be claimed on it. It shows only
 * while the web app is live and New York's date when the site is built (the
 * real clock, not --date) is on or before it: from the day after, the copy
 * falls back to the plain web-app wording by itself, at the next build.
 * Unset, malformed or past: no Launch Pass anywhere (build.mjs warns).
 * The prices stay on the page either way.
 */
export const LAUNCH_INPUT = (process.env.WEB_LAUNCH_PRO_UNTIL ?? "").trim();
const isDay = (s) => { const t = Date.parse(`${s}T12:00:00Z`); return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s; };
export const LAUNCH_VALID = isDay(LAUNCH_INPUT);
/** The Launch Pass's last date ("2026-11-03") while it is on, else null. */
export const LAUNCH_UNTIL = WEB_APP_LIVE && LAUNCH_VALID && etDate() <= LAUNCH_INPUT ? LAUNCH_INPUT : null;
/** "Nov 3", the site's short date ("" when the Launch Pass is off). */
export const LAUNCH_DAY = LAUNCH_UNTIL ? shortDate(LAUNCH_UNTIL) : "";
/**
 * Links into the web app from this site carry UTM tags (owner, 2026-10-07),
 * so the app can count where readers came from: the Launch Pass claim page
 * (utm_campaign=launch_pass) and the plain "Open Clutch in your browser"
 * links (utm_campaign=web_app). `placement` says where on the site the link
 * sits (hero, browser, pricing, faq, closing, tour-end). Already escaped for
 * an attribute (&amp;).
 */
const utm = (campaign, placement) => `?utm_source=clutchledger&amp;utm_medium=site&amp;utm_campaign=${campaign}&amp;utm_content=${placement}`;
/** The Launch Pass claim page (signed in on the web app), tagged with where the link sits. */
export const passLink = (placement) => `${APP}/pass${utm("launch_pass", placement)}`;
/** The web app's front door, tagged (the "Open Clutch in your browser" links). */
export const webAppLink = (placement) => `${APP}/${utm("web_app", placement)}`;

/**
 * App Store Connect counts installs per campaign when a link carries the
 * provider token and a campaign name (App Analytics › Campaigns). APP_STORE_PT
 * (a repository variable) is that token; unset, the links stay plain. The
 * campaign is the kind of page the link was on — a campaign shows in App
 * Analytics only from 5 installs, so finer cuts would never appear.
 */
const APP_STORE_PT = (process.env.APP_STORE_PT ?? "").trim();
export function appStoreCampaign(path) {
  if (path === "/") return "site-home";
  if (/^\/games\/[^/]+\/[^/]+\/$/.test(path)) return "site-game";
  if (path.startsWith("/games/")) return "site-night";
  if (path.startsWith("/teams/")) return "site-team";
  const known = { "/pricing/": "site-pricing", "/ledger/": "site-ledger", "/receipts/": "site-ledger", "/how-it-works/": "site-how" };
  return known[path] ?? "site-other";
}
export const appStoreLink = (path) => (/^\d+$/.test(APP_STORE_PT) ? `https://apps.apple.com/app/apple-store/id6761838099?pt=${APP_STORE_PT}&ct=${appStoreCampaign(path)}&mt=8` : APP_STORE);

export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Search results cut a description near 160 characters: keep whole sentences up to that, else whole words and an ellipsis. */
export const DESCRIPTION_MAX = 160;
export function clipDescription(s, max = DESCRIPTION_MAX) {
  if (s.length <= max) return s;
  const sentences = s.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [];
  let out = "";
  for (const x of sentences) { if ((out + x).trim().length > max) break; out += x; }
  if (out.trim()) return out.trim();
  return s.slice(0, s.lastIndexOf(" ", max - 1)).replace(/[,;:—–\s]+$/, "") + "…";
}

export const FONTS = [
  { file: "fraunces-900.woff2", family: "Fraunces", weight: 900, style: "normal", src: "desk-src/fonts/Fraunces_900Black.ttf", preload: true },
  { file: "fraunces-900i.woff2", family: "Fraunces", weight: 900, style: "italic", src: "site-src/fonts/Fraunces_900Black_Italic.ttf" },
  { file: "fraunces-700.woff2", family: "Fraunces", weight: 700, style: "normal", src: "desk-src/fonts/Fraunces_700Bold.ttf" },
  { file: "fraunces-400i.woff2", family: "Fraunces", weight: 400, style: "italic", src: "desk-src/fonts/Fraunces_400Regular_Italic.ttf" },
  { file: "franklin-400.woff2", family: "Libre Franklin", weight: 400, style: "normal", src: "desk-src/fonts/LibreFranklin_400Regular.ttf", preload: true },
  { file: "franklin-700.woff2", family: "Libre Franklin", weight: 700, style: "normal", src: "site-src/fonts/LibreFranklin_700Bold.ttf" },
  { file: "plexmono-500.woff2", family: "IBM Plex Mono", weight: 500, style: "normal", src: "desk-src/fonts/IBMPlexMono_500Medium.ttf", preload: true },
  { file: "doto-900.woff2", family: "Doto", weight: 900, style: "normal", src: "desk-src/fonts/Doto_900Black.ttf", preload: true },
];

const NAV = [
  ["/#tonight", "Tonight", "tonight"],
  ["/ledger/", "The Ledger", "ledger"],
  ["/receipts/", "Proof", "receipts"],
  ["/teams/", "Teams", "teams"],
  ["/how-it-works/", "How it works", "how"],
  ["/pricing/", "Pricing", "pricing"],
];

/**
 * The Theme button, the masthead's last item — its top-right corner at every
 * width, beside the Menu on small screens (owner, 2026-10-07: it was hard to
 * find). A tap steps Auto / Day / Night (static/theme.js keeps the pick on
 * <html data-theme>); the stylesheet shows the one word of the three that
 * matches, so the button reads right from the first paint and its name is
 * "Theme: Auto" (or Day, Night) whether the word is shown or, on a narrow
 * phone, only the disc.
 */
const THEME = '<button class="tg" type="button"><span class="vh">Theme: </span><b class="t0">Auto</b><b class="t1">Day</b><b class="t2">Night</b></button>';

function masthead(current) {
  const links = NAV.map(([href, label, key]) => `<a href="${href}"${key === current ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  const acts = WEB_APP_LIVE
    ? `<a class="signin" href="${APP}/">Sign in</a><a class="btn sm" href="${APP}/"><span class="hide-s">Play in your browser</span><span class="show-s">Play free</span></a>`
    : `<a class="btn sm" href="${APP_STORE}"><span class="hide-s">Get the iPhone app</span><span class="show-s">Get the app</span></a>`;
  return `<header class="top"><div class="wrap bar${WEB_APP_LIVE ? " live" : ""}">
<a class="logo" href="/" aria-label="Clutch, front page">Clutch</a>
<nav class="nav" aria-label="Site">${links}</nav>
<div class="acts">${acts}
<details class="menu"><summary>Menu</summary><nav aria-label="Site, small screens">${links}<a href="/support/">Support</a></nav></details>${THEME}</div>
</div></header>`;
}

function footer() {
  return `<footer class="foot"><div class="wrap">
<div class="fgrid">
<div class="fbrand"><span class="logo">Clutch</span><p>NBA analytics for fans. A number for every game, the reasons behind it, and a public record of every call.</p></div>
<nav aria-label="The paper"><span class="mono">The paper</span><a href="/#tonight">Tonight</a><a href="/ledger/">The Ledger</a><a href="/receipts/">Proof</a><a href="/teams/">Teams</a></nav>
<nav aria-label="About"><span class="mono">About</span><a href="/how-it-works/">How it works</a><a href="/pricing/">Pricing</a><a href="/support/">Support</a><a href="${APP_STORE}">iPhone app</a></nav>
<nav aria-label="Legal"><span class="mono">Legal</span><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/refunds/">Refunds</a></nav>
</div>
<div class="fline"><span>Sports analytics for fans. Not affiliated with the NBA or any team.</span><span>© 2026 Clutch · Operated by Uğur Altunbaş</span></div>
</div></footer>`;
}

/**
 * A whole page. `path` is the URL path ("/", "/ledger/"); `og` the image
 * name under /og/; `jsonld` one object or a list; `live` adds the small
 * live-score script; `tour` the front page's guide (static/tour.js).
 */
export function page({ path, title, description, body, current = "", og = "default", ogType = "website", jsonld = null, live = false, tour = false, noindex = false, cssHref = "/site.css" }) {
  const url = ORIGIN + path;
  description = clipDescription(description);
  const ld = (Array.isArray(jsonld) ? jsonld : jsonld ? [jsonld] : []).map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n");
  const pre = FONTS.filter((f) => f.preload).map((f) => `<link rel="preload" href="/fonts/${f.file}" as="font" type="font/woff2" crossorigin>`).join("\n");
  const img = `${ORIGIN}/og/${og}.jpg`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`}
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#15130F" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#EDEEF0" media="(prefers-color-scheme: light)">
<script src="/theme.js"></script>
${pre}
<link rel="stylesheet" href="${cssHref}">
<link rel="icon" href="/favicon.png" type="image/png" sizes="64x64">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:site_name" content="Clutch">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Clutch — call every game, beat Clutch.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@getclutchledger">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${img}">
<meta name="apple-itunes-app" content="app-id=6761838099">
${ld}
</head>
<body>
<a class="skip" href="#main">Skip to the paper</a>
${masthead(current)}
<main id="main">
${body}
</main>
${footer()}
${live ? '<script src="/live.js" defer></script>' : ""}${tour ? '<script src="/tour.js" defer></script>' : ""}
</body>
</html>
`;
  // Every link to the App Store on this page carries the page's campaign (when the token is set).
  return html.replaceAll(`href="${APP_STORE}"`, `href="${esc(appStoreLink(path))}"`);
}

/**
 * The LED rail: 24 segments, lit up to Clutch's number for the side it
 * favours, the market's number for that side as the one cream segment
 * (amber = Clutch, cream = the market). `p` and `market` in 0..1 or null.
 */
export function rail(p, market, small = false) {
  const on = p == null ? 0 : Math.round(p * 24);
  const mk = market == null ? -1 : Math.max(0, Math.round(market * 24) - 1);
  let s = "";
  for (let i = 0; i < 24; i++) s += i === mk ? '<i class="mk"></i>' : i < on ? '<i class="on"></i>' : "<i></i>";
  const label = p == null ? "No number yet" : `Clutch ${Math.round(p * 100)}${market == null ? "" : `, the market ${Math.round(market * 100)}`}`;
  return `<span class="rail${small ? " sm" : ""}" role="img" aria-label="${esc(label)}">${s}</span>`;
}

/** A horizontal bar as SVG (no inline styles): value 0..100. */
export const bar = (v, cls = "") => `<svg class="hb ${cls}" viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true"><rect class="bg" width="100" height="4"/><rect class="fg" width="${Math.max(0, Math.min(100, v)).toFixed(1)}" height="4"/></svg>`;

/** Text with the support e-mail and https links made into links, and "• " lines into a list. */
export function prose(text, { email } = {}) {
  const link = (s) => esc(s)
    .replace(/https:\/\/[^\s<]+[^\s<.,)]/g, (u) => `<a href="${u}">${u.replace(/^https:\/\//, "")}</a>`)
    .replace(email ? new RegExp(email.replace(/[.]/g, "\\."), "g") : /$^/, (m) => `<a href="mailto:${m}">${m}</a>`)
    .replace(/(^|[\s(])(app\.clutchledger\.com)(?![\w/])/g, (m, pre, host) => (WEB_APP_LIVE ? `${pre}<a href="${APP}/">${host}</a>` : m))
    .replace(/reportaproblem\.apple\.com(?![\w/<"])/g, '<a href="https://reportaproblem.apple.com">reportaproblem.apple.com</a>');
  const out = [];
  let list = [];
  const flush = () => { if (list.length) { out.push(`<ul>${list.map((l) => `<li>${l}</li>`).join("")}</ul>`); list = []; } };
  for (const line of String(text).split("\n")) {
    if (line.startsWith("• ")) list.push(link(line.slice(2)));
    else { flush(); if (line.trim()) out.push(`<p>${link(line)}</p>`); }
  }
  flush();
  return out.join("\n");
}

/** A team's slug: "boston-celtics". */
export const teamSlug = (t) => t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
