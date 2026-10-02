// The page shell and the pieces every page shares: head (title, canonical,
// Open Graph, JSON-LD, preloaded fonts), the masthead, the footer, the LED
// rail. No inline style or script anywhere — the CSP allows neither — so
// team colours are classes in the stylesheet and widths are SVG attributes.

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

export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

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
  ["/receipts/", "Receipts", "receipts"],
  ["/teams/", "Teams", "teams"],
  ["/how-it-works/", "How it works", "how"],
  ["/pricing/", "Pricing", "pricing"],
];

function masthead(current) {
  const links = NAV.map(([href, label, key]) => `<a href="${href}"${key === current ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  const acts = WEB_APP_LIVE
    ? `<a class="signin" href="${APP}/">Sign in</a><a class="btn sm" href="${APP}/"><span class="hide-s">Play in your browser</span><span class="show-s">Play free</span></a>`
    : `<a class="btn sm" href="${APP_STORE}"><span class="hide-s">Get the iPhone app</span><span class="show-s">Get the app</span></a>`;
  return `<header class="top"><div class="wrap bar">
<a class="logo" href="/" aria-label="Clutch, front page">Clutch</a>
<nav class="nav" aria-label="Site">${links}</nav>
<div class="acts">${acts}
<details class="menu"><summary>Menu</summary><nav aria-label="Site, small screens">${links}<a href="/support/">Support</a></nav></details></div>
</div></header>`;
}

function footer() {
  return `<footer class="foot"><div class="wrap">
<div class="fgrid">
<div class="fbrand"><span class="logo">Clutch</span><p>NBA analytics for fans. A number for every game, the reasons behind it, and a public record of every call.</p></div>
<nav aria-label="The paper"><span class="mono">The paper</span><a href="/#tonight">Tonight</a><a href="/ledger/">The Ledger</a><a href="/receipts/">Receipts</a><a href="/teams/">Teams</a></nav>
<nav aria-label="About"><span class="mono">About</span><a href="/how-it-works/">How it works</a><a href="/pricing/">Pricing</a><a href="/support/">Support</a><a href="${APP_STORE}">iPhone app</a></nav>
<nav aria-label="Legal"><span class="mono">Legal</span><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/refunds/">Refunds</a></nav>
</div>
<div class="fline"><span>No betting. No wagering. Not affiliated with the NBA or any team.</span><span>© 2026 Clutch · Operated by Uğur Altunbaş</span></div>
</div></footer>`;
}

/**
 * A whole page. `path` is the URL path ("/", "/ledger/"); `og` the image
 * name under /og/; `jsonld` one object or a list; `live` adds the small
 * live-score script.
 */
export function page({ path, title, description, body, current = "", og = "default", ogType = "website", jsonld = null, live = false, noindex = false, cssHref = "/site.css" }) {
  const url = ORIGIN + path;
  const ld = (Array.isArray(jsonld) ? jsonld : jsonld ? [jsonld] : []).map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n");
  const pre = FONTS.filter((f) => f.preload).map((f) => `<link rel="preload" href="/fonts/${f.file}" as="font" type="font/woff2" crossorigin>`).join("\n");
  const img = `${ORIGIN}/og/${og}.jpg`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
${noindex ? '<meta name="robots" content="noindex">\n' : ""}<meta name="theme-color" content="#15130F">
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
${live ? '<script src="/live.js" defer></script>' : ""}
</body>
</html>
`;
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
