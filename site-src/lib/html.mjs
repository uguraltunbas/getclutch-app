// The page shell and the pieces every page shares: head (title, canonical,
// Open Graph, JSON-LD, preloaded fonts, the theme script), the masthead, the
// footer, the LED rail. No inline style anywhere and one inline script — the
// CSP allows no other — so team colors are classes in the stylesheet, widths
// are SVG attributes, and Day or Night is set by a tiny script in <head> that
// the build writes inline and the CSP admits by its hash.

import { etDate } from "./time.mjs";
import { RECEIPTS_REPO } from "./copy.mjs";
import { SUPPORT_EMAIL } from "../content/legal.mjs";

export const ORIGIN = "https://clutchledger.com";
export const APP = "https://app.clutchledger.com";
export const APP_STORE = "https://apps.apple.com/app/id6761838099";
/** The app icon under a name that says whose it is (build.mjs copies static/icon-512.png here). */
export const BRAND_ICON = "/clutch-ledger-app-icon.png";
// IndexNow (Bing, Yandex, Seznam, Naver): public by design — the site serves it at /<key>.txt.
export const INDEXNOW_KEY = "a31eed2945a541da96d1777477463467";
// Cloudflare Web Analytics (owner, 2026-10-23): counts visits without cookies; the token is public by design
// (it is in every page). The stylesheet-only CSP admits its script and its beacon (static/_headers).
export const CF_BEACON_TOKEN = "e54d984f52e44bebade43eb18d86335e";
// Clutch's own profiles: the footer's Follow column, the Company page and the Organization record.
export const X_URL = "https://x.com/getclutchledger";
export const LINKEDIN_URL = "https://www.linkedin.com/company/clutchledger/";
/** The official Win Totals rules: on the GitHub Pages site the App Store links to, not on this domain (Paddle reviews this one). */
/**
 * Launch directories that list Clutch and ask for their badge on our site to keep the free listing
 * (owner, 2026-10-25). Front page only, so the rest of the site carries no outside links in its footer;
 * the images are copies in static/badges (the CSP loads no outside image), linked as each one asks.
 */
const LISTED_ON = [
  { href: "https://fazier.com/launches/clutch-ledger", img: "/badges/fazier.svg", w: 103, h: 44, alt: "Launched on Fazier" },
  // Product Hunt (launched 2026-10-23) and SaaSHub (approved): drawn here in Fazier's slate so the row reads as one
  // set, with no live vote count (owner, 2026-11-01).
  { href: "https://www.producthunt.com/products/clutch-ledger", img: "/badges/producthunt.svg", w: 132, h: 44, alt: "Launched on Product Hunt" },
  { href: "https://www.saashub.com/clutch-ledger", img: "/badges/saashub.svg", w: 110, h: 44, alt: "Approved on SaaSHub" },
];
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
/** A night's games in the web app (its Scores page), or the iPhone app until the web app is open. */
export const playNight = (d) => (WEB_APP_LIVE ? `${APP}/scores?date=${d}` : APP_STORE);
/** Pro's checkout: the web app's paywall, or the iPhone app. */
export const PLAY_PRO = WEB_APP_LIVE ? `${APP}/paywall` : APP_STORE;
/**
 * The main action has one name (owner's pick, UI/UX study 2026-10-28): "Play
 * tonight in your browser →" on the page's buttons, "Play tonight" in the
 * masthead. `open`: tonight still has a game to call; on a night with none
 * left the long form drops "tonight" rather than promise a game.
 */
export const playWords = (open = true) => (open ? "Play tonight in your browser →" : "Play in your browser →");
export const PLAY_SHORT = "Play tonight";

/**
 * The Launch Pass (owner, 2026-10-07): sign in on the web app, tap Claim, and
 * every Pro feature is free on the web. It runs until web sales open (owner,
 * 2026-10-27), so the site gives it no end date anywhere (build.mjs checks).
 * WEB_LAUNCH_PRO_UNTIL, an ISO date (a repository variable, like
 * WEB_APP_LIVE), is only a guard: the pass shows while the web app is live and
 * New York's date when the site is built (the real clock, not --date) is on or
 * before it; from the day after, the copy falls back to the plain web-app
 * wording by itself, at the next build. Unset, malformed or past: no Launch
 * Pass anywhere (build.mjs warns). The prices stay on the page either way.
 */
export const LAUNCH_INPUT = (process.env.WEB_LAUNCH_PRO_UNTIL ?? "").trim();
const isDay = (s) => { const t = Date.parse(`${s}T12:00:00Z`); return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s; };
export const LAUNCH_VALID = isDay(LAUNCH_INPUT);
/** The guard's date ("2026-12-31") while the Launch Pass is on, else null. Never printed on a page. */
export const LAUNCH_UNTIL = WEB_APP_LIVE && LAUNCH_VALID && etDate() <= LAUNCH_INPUT ? LAUNCH_INPUT : null;
export const LAUNCH_ON = LAUNCH_UNTIL != null;
/** What the pass gives, in the words every page uses: no date, since it ends when web sales open. */
export const LAUNCH_WORDS = "every Pro feature free on the web during the launch";
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
 * Any link into the web app, tagged the same way (utm_campaign=web_app) with
 * where it sits, so the app's funnel can say which site link a reader came
 * through (first web sale, 2026-11-05: the header link was untagged). A link
 * that already has a query gets the tags after it; the App Store and every
 * other link come back unchanged. build.mjs fails a page with an untagged one.
 */
export const tagged = (href, placement) => (href.startsWith(APP) ? `${href}${href.includes("?") ? "&amp;" : "?"}${utm("web_app", placement).slice(1)}` : href);

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
  if (path.startsWith("/embed/")) return "site-embed";
  if (/^\/games\/[^/]+\/[^/]+\/$/.test(path)) return "site-game";
  if (path.startsWith("/games/")) return "site-night";
  if (path.startsWith("/teams/") || path.startsWith("/matchups/") || path === "/playoff-chances/") return "site-team";
  if (path === "/tonight/") return "site-night";
  const known = { "/pricing/": "site-pricing", "/ledger/": "site-ledger", "/accuracy/": "site-ledger", "/receipts/": "site-ledger", "/how-it-works/": "site-how" };
  return known[path] ?? "site-other";
}
export const appStoreLink = (path) => (/^\d+$/.test(APP_STORE_PT) ? `https://apps.apple.com/app/apple-store/id6761838099?pt=${APP_STORE_PT}&ct=${appStoreCampaign(path)}&mt=8` : APP_STORE);

export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** A plan card's big price ("$9.99") in Plex Mono, its decimal point drawn narrow: a mono "." fills a whole digit's width. */
export const priceFig = (s) => esc(s).replace(/\.(?=\d)/, '<span class="dp">.</span>');

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

// Latin subsets (site-src/fonts/latin/README.md): 90 KB less to load before the first paint. Plex Mono stays whole (reserved name).
export const FONTS = [
  { file: "fraunces-900.woff2", family: "Fraunces", weight: 900, style: "normal", src: "site-src/fonts/latin/Fraunces_900Black.ttf", preload: true },
  { file: "fraunces-900i.woff2", family: "Fraunces", weight: 900, style: "italic", src: "site-src/fonts/latin/Fraunces_900Black_Italic.ttf" },
  { file: "fraunces-700.woff2", family: "Fraunces", weight: 700, style: "normal", src: "site-src/fonts/latin/Fraunces_700Bold.ttf" },
  { file: "fraunces-400i.woff2", family: "Fraunces", weight: 400, style: "italic", src: "site-src/fonts/latin/Fraunces_400Regular_Italic.ttf" },
  { file: "franklin-400.woff2", family: "Libre Franklin", weight: 400, style: "normal", src: "site-src/fonts/latin/LibreFranklin_400Regular.ttf", preload: true },
  { file: "franklin-700.woff2", family: "Libre Franklin", weight: 700, style: "normal", src: "site-src/fonts/latin/LibreFranklin_700Bold.ttf" },
  { file: "plexmono-500.woff2", family: "IBM Plex Mono", weight: 500, style: "normal", src: "desk-src/fonts/IBMPlexMono_500Medium.ttf", preload: true },
  { file: "doto-900.woff2", family: "Doto", weight: 900, style: "normal", src: "site-src/fonts/latin/Doto_900Black.ttf", preload: true },
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
    ? `<a class="signin" href="${tagged(`${APP}/`, "masthead-signin")}">Sign in</a><a class="btn sm" href="${tagged(`${APP}/`, "masthead")}">${PLAY_SHORT}</a>`
    : `<a class="btn sm" href="${APP_STORE}"><span class="hide-s">Get the iPhone app</span><span class="show-s">Get the app</span></a>`;
  return `<header class="top"><div class="wrap bar${WEB_APP_LIVE ? " live" : ""}">
<a class="logo" href="/" aria-label="Clutch, front page">Clutch</a>
<nav class="nav" aria-label="Site">${links}</nav>
<div class="acts">${acts}
<details class="menu"><summary>Menu</summary><nav aria-label="Site, small screens">${links}<a href="/support/">Support</a></nav></details>${THEME}</div>
</div></header>`;
}

/**
 * The footer as the paper's masthead box, its künye (owner's pick C, footer study 2026-11-01):
 * the name and one line with the accounts as round keys, the box that says when Clutch seals
 * and grades and where the receipts are, the index beside it, the legal line. Every page stays
 * linked; every link is a 44 px tap. No operator name here (owner, 2026-11-01): the Terms,
 * Privacy, Refunds and Support pages carry it.
 */
const ICON = {
  x: "M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23zm-1.16 17.52h1.83L7.08 4.13H5.12z",
  in: "M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z",
  gh: "M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57l-.02-2.05c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3",
  rss: "M6.18 15.64a2.18 2.18 0 1 1 0 4.36 2.18 2.18 0 0 1 0-4.36M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27zm0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93z",
};
const SOCIAL = [[X_URL, "x", "Clutch on X", ' rel="me"'], [LINKEDIN_URL, "in", "Clutch on LinkedIn", ' rel="me"'], [RECEIPTS_REPO, "gh", "Clutch's receipts on GitHub", ""], ["/feed.xml", "rss", "RSS feed", ""]];
const FOOT_INDEX = [
  ["The paper", [["/tonight/", "Tonight"], ["/ledger/", "The Ledger"], ["/accuracy/", "Accuracy"], ["/receipts/", "Proof"], ["/teams/", "Teams"], ["/playoff-chances/", "Playoff chances"]]],
  ["About", [["/how-it-works/", "How it works"], ["/pricing/", "Pricing"], ["/faq/", "FAQ"], ["/learn/", "Learn"], ["/support/", "Support"], ["/company/", "Company"]]],
  ["More", [["/widget/", "Widget"], ["/data/", "Open data"], ["/tr/", "Türkçe", ' hreflang="tr" lang="tr"'], [APP_STORE, "iPhone app"]]],
];
const KUNYE = [
  ["Published", "Every night of the NBA season"],
  ["Seals", "Every game, before tip"],
  ["Grades", "After the final, beside the market"],
  ["Corrections", "None. The misses stay on the record."],
  ["Receipts", `<a href="${RECEIPTS_REPO}">Public, on GitHub</a>`],
  ["Write to", `<a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>`],
];

function footer(path) {
  const keys = SOCIAL.map(([href, icon, label, attrs]) => `<a href="${href}" aria-label="${esc(label)}"${attrs}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[icon]}"/></svg></a>`).join("");
  const index = FOOT_INDEX.map(([label, links]) => `<div><p>${label}</p>${links.map(([href, text, attrs = ""]) => `<a href="${href}"${attrs}>${text}</a>`).join("")}</div>`).join("");
  const listed = path === "/" ? `<p class="flisted">${LISTED_ON.map((b) => `<a href="${b.href}"><img src="${b.img}" width="${b.w}" height="${b.h}" alt="${b.alt}" loading="lazy" decoding="async"></a>`).join("")}</p>` : "";
  return `<footer class="foot"><div class="wrap">
<div class="ftop"><div><img class="ficon" src="${BRAND_ICON}" width="56" height="56" alt="Clutch Ledger app icon" loading="lazy" decoding="async"><span class="logo">Clutch</span><p>The NBA, called before tip and graded in public.</p></div><nav class="fkeys" aria-label="Follow Clutch">${keys}</nav></div>
<div class="fgrid">
<dl class="kunye"><p>The masthead</p>${KUNYE.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
<nav class="findex" aria-label="Index">${index}${listed}</nav>
</div>
<div class="fine"><nav aria-label="Legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/refunds/">Refunds</a></nav><span>© 2026 Clutch · Sports analytics for fans. Not affiliated with the NBA or any team.</span></div>
</div></footer>`;
}

/**
 * A whole page. `path` is the URL path ("/", "/ledger/"); `og` the image
 * name under /og/ ("game", or a game's own card "g/<slug>-<hash>") and
 * `ogAlt` its alt text; `jsonld` one object or a list; `live` adds the small
 * live-score script; `tour` the front page's guide (static/tour.js); `filter`
 * the Ledger's filters (static/ledger.js).
 */
export function page({ path, title, description, body, current = "", og = "default", ogAlt = "Clutch — call every game, beat Clutch.", ogType = "website", jsonld = null, live = false, tour = false, filter = false, unsubscribe = false, noindex = false, cssHref = "/site.css", lang = "en" }) {
  const url = ORIGIN + path;
  description = clipDescription(description);
  const ld = (Array.isArray(jsonld) ? jsonld : jsonld ? [jsonld] : []).map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n");
  const pre = FONTS.filter((f) => f.preload).map((f) => `<link rel="preload" href="/fonts/${f.file}" as="font" type="font/woff2" crossorigin>`).join("\n");
  const img = `${ORIGIN}/og/${og}.jpg`;
  const html = `<!doctype html>
<html lang="${lang}">
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
<link rel="alternate" type="application/rss+xml" title="Clutch" href="/feed.xml">
<meta property="og:site_name" content="Clutch">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(ogAlt)}">
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
${footer(path)}
${live ? '<script src="/live.js" defer></script>' : ""}${tour ? '<script src="/tour.js" defer></script>' : ""}${filter ? '<script src="/ledger.js" defer></script>' : ""}${unsubscribe ? '<script src="/unsubscribe.js" defer></script>' : ""}
<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon="{&quot;token&quot;:&quot;${CF_BEACON_TOKEN}&quot;}"></script>
</body>
</html>
`;
  // Every link to the App Store on this page carries the page's campaign (when the token is set).
  return html.replaceAll(`href="${APP_STORE}"`, `href="${esc(appStoreLink(path))}"`);
}

/**
 * The LED rail: 24 segments, lit up to Clutch's number for the side it
 * favors, the market's number for that side as the one cream segment
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
    .replace(/(^|[\s(])(app\.clutchledger\.com)(?![\w/])/g, (m, pre, host) => (WEB_APP_LIVE ? `${pre}<a href="${tagged(`${APP}/`, "text")}">${host}</a>` : m))
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
