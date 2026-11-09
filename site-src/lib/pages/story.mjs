// /story/ — the founder story: how Clutch is made and why it is graded in public.
// The words are Uğur's (his answers of 2026-10-27, drafted with Claude, his OK
// before publishing); the numbers are not typed in: this season's record comes
// from the Ledger and the two-season test from the benchmark (model/accuracy), so
// the page can't fall out of date. Draft and sources: .research/founder-story/.
// The comparison words follow the site's claim rules: "more accurate than ESPN's
// BPI" only with "tested on two seasons", never ahead of the market.

import { page, esc, ORIGIN, APP, APP_STORE, tagged } from "../html.mjs";
import { RECEIPTS_REPO } from "../copy.mjs";
import { mediumDate } from "../time.mjs";
import { COMPANY } from "../../content/company.mjs";

export const STORY = {
  path: "/story/",
  h1: "Sealed before tip",
  deck: "A business analyst, Claude Code and an NBA forecast that is graded in public, misses included.",
  title: "Sealed before tip: how Clutch's NBA forecast is made and graded · Clutch",
  description: "Clutch puts one number on every NBA game, seals it in a public Git repository before tip and grades it after the final against ESPN BPI and the market. Its maker is a business analyst; Claude Code wrote the code.",
  published: "2026-11-09",
  modified: "2026-11-09",
};

const b4 = (x) => (x == null ? "—" : x.toFixed(4));
/** Games right from a track's hit rate on its own games. */
const right = (t) => (t?.hit_rate != null && t.n ? Math.round((t.hit_rate * t.n) / 100) : null);

/** The two-season walk-forward test as a table, newest season last (as on /how-it-works/). */
function seasonsTable(bench) {
  const seasons = Object.keys(bench ?? {}).sort();
  if (!seasons.length) return "";
  const rows = [["The market's final price", "market"], ["Clutch's call", "clutch", true], ["My model alone", "model"], ["ESPN BPI", "espn_bpi"], ["Home team every game", "always_home"]];
  return `<div class="scroll gap"><table class="tbl"><caption class="vh">Brier score by season, lower is better</caption><thead><tr><th scope="col">Brier score (lower is better)</th>${seasons.map((s) => `<th scope="col" class="num">${esc(s)}</th>`).join("")}</tr></thead><tbody>${rows.map(([label, k, lead]) => `<tr><td${lead ? ' class="lead"' : ""}>${esc(label)}</td>${seasons.map((s) => `<td class="num">${b4(bench[s].tracks?.[k]?.brier)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

/** This season so far, in one honest paragraph. */
function seasonLine(m) {
  const r = m.record;
  if (!r?.n) return `<p>This season's first calls are graded the morning after its first finals. The <a href="/accuracy/">accuracy page</a> has the record as soon as there is one.</p>`;
  const t = r.tracks ?? {};
  const market = right(t.with_line?.market);
  const model = right(t.all_games?.model);
  const home = r.homeRate != null ? Math.round((r.homeRate * r.n) / 100) : null;
  const bpi = t.vs_espn?.espn_bpi, usOnBpi = t.vs_espn?.clutch;
  const others = [market != null && t.with_line?.n === r.n ? `the market's favorite ${market}` : null, model != null && t.all_games?.n === r.n ? `my model alone ${model}` : null, home != null ? `the home team ${home}` : null].filter(Boolean);
  const list = others.length > 1 ? `${others.slice(0, -1).join(", ")} and ${others[others.length - 1]}` : others.join("");
  let bpiLine = "";
  if (bpi?.n && usOnBpi?.n === bpi.n) bpiLine = bpi.n === r.n ? ` ESPN's BPI had ${right(bpi)}.` : ` ESPN's BPI had a number on ${bpi.n} of those games and got ${right(bpi)} right; Clutch got ${right(usOnBpi)} of the same ${bpi.n}.`;
  const start = r.dateRange?.start ? `This season started on ${esc(mediumDate(r.dateRange.start))}. ` : "";
  return `<p>${start}After the first ${r.n} graded games, Clutch's call had ${r.hits} right${list ? `, ${list}` : ""}.${bpiLine} A few weeks is noise, and the Ledger says so on the page. Come back in March.</p>`;
}

/** How much of the number the model carries, in words, from the blend weights. */
function blendLine(blend) {
  const open = blend?.at_open?.w_model, close = blend?.at_close?.w_model;
  if (open == null || close == null) return "A day before a game, my model carries a large part of the number. Just before tip it carries almost nothing, because by then the market has priced the same injury news and more.";
  const share = (w) => `about ${Math.round(w * 100)}%`;
  return `A day before a game, my model carries ${share(open)} of the number. Just before tip it carries ${share(close)}, because by then the market has priced the same injury news and more.`;
}

export function storyPage(m) {
  const s = STORY;
  const bench = m.accuracy?.benchmark ?? {};
  const games = Object.keys(bench).map((k) => bench[k].n).filter(Boolean);
  const perSeason = games.length ? `About ${(Math.round(Math.min(...games) / 100) * 100).toLocaleString("en-US")} games a season.` : "";
  const c = COMPANY;
  const body = `<div class="wrap r"><div class="rhead"><span class="kick">The story</span><h1 class="rh1">${esc(s.h1)}</h1><p class="rdeck">${esc(s.deck)}</p><p class="mono ink3">By ${esc(c.founder)} · ${esc(mediumDate(s.published))}${s.modified !== s.published ? ` · Updated ${esc(mediumDate(s.modified))}` : ""}</p></div>
<div class="body">
<section class="blk"><p>Every night of the NBA season, Clutch puts one number on every game: the chance that the home team wins. Before the game tips, that number is written to a public Git repository, hashed and chained to the file before it, so I can't quietly change it later. After the final, the Ledger grades it in public, on the same games as ESPN's BPI, the market's final price and the simplest rule there is: pick the home team. I'm a senior business analyst and an AI product owner. I built Clutch with Claude Code as my developer.</p></section>

<section class="blk" aria-labelledby="why"><h2 id="why">Why I built it</h2>
<p>I love the NBA, and software is my job. At work I decide what a product should do and write it down so that developers can build it. Clutch is what happened when I did that for myself.</p>
<p>I wanted one number per game that keeps score on itself. An NBA season is full of predictions, and hardly anyone goes back to check them. So the rule came before the app: every number is sealed before tip, and every number is graded after the final, in public.</p></section>

<section class="blk" aria-labelledby="sealed"><h2 id="sealed">One number, sealed before tip</h2>
<p>Clutch's call is one probability per game. It can move during the day as injury news comes in. The one that counts is the last one before tip, and after tip nothing new is written for that game.</p>
<p>Each time a number changes, a scheduled job writes the night's numbers to a file in <a href="${RECEIPTS_REPO}">github.com/uguraltunbas/clutch-receipts</a>. Every file carries the SHA-256 hash of the file before it, so the files form a chain. A few numbers are only for Pro readers before tip. Those go in as a hash of the numbers plus a random salt, and the numbers and the salt are published after the final, so you can check that what I show you later is what I had before the game.</p>
<p>You don't have to trust me on any of it. <code>shasum -a 256</code> on a file gives the hash that the next file points to, and the repository explains how to check a whole night. The first seal went in on October 3, before a preseason game.</p></section>

<section aria-labelledby="graded"><h2 class="sh" id="graded">Graded in public</h2>
<p class="sub">The hardest benchmark for an NBA forecast is the market's final price, so that is what I tested against. Before this season I replayed two full seasons, 2024-25 and 2025-26, month by month: every game predicted by a model fit only on the games before it. ${perSeason} The score is the Brier score. It grades the probability itself, not just the winner. A coin flip scores 0.250, and lower is better.</p>
${seasonsTable(bench)}</section>

<section class="blk" aria-label="What the test says"><p>Read plainly: tested on two seasons, Clutch's call was more accurate than ESPN's BPI in both, clearly in 2025-26 and within the noise in 2024-25. It was level with the market's final price, not ahead of it. My model alone was only level with BPI.</p>
<p>So my model didn't beat the market, and Clutch doesn't claim it does. What it does instead is blend the two. ${blendLine(m.accuracy?.blend)} The Ledger grades both parts separately, so you can see my model lose to the market on the nights it does.</p>
${seasonLine(m)}</section>

<section class="blk" aria-labelledby="built"><h2 id="built">How an analyst and Claude Code build it</h2>
<p>There is no server. Python jobs run on a schedule on GitHub Actions. They fetch the night's games, the injury report and the market's prices, write the numbers into a Postgres database and seal them. The iPhone app and the web app are one codebase that reads those rows. The game simulation and the What-If lab run on your phone.</p>
<p>I don't write the code. I do what I do at work: I decide what Clutch should do, write down what counts as right, check every change in the simulator and the browser, and say yes or no. Claude Code writes the code and the tests. Since September 1 there have been more than 1,400 commits across Clutch's four repositories, and about 95 in 100 of them name Claude as co-author. More than 5,400 automated tests run before anything ships.</p>
<p>None of this way of working surprised me. I work with software and AI every day.</p></section>

<section class="blk" aria-labelledby="advice"><h2 id="advice">What I'd tell another analyst</h2>
<p>If you write specs for a living and want to build your own product this way:</p>
<ul>
<li><strong>Write it like an analysis.</strong> Before anything is built, write down what counts as right: the acceptance criteria, the limits, the words that must never appear. Claude writes the code; what to build is yours. For Clutch, one of those rules is that you can never put money on a game in it, and a test fails the build if a single word from that world shows up in the app's text.</li>
<li><strong>"Done" isn't enough. Ask for proof.</strong> For every change: the tests, a preview, a screenshot. Don't accept anything you haven't looked at yourself.</li>
<li><strong>Guard rails first.</strong> Keep production writes, releases and builds in your own hands. Claude can't write to Clutch's production database, deploy a server function or start an App Store build. For those it hands me one script that checks itself first, and I run it.</li>
<li><strong>Measure honestly.</strong> Decide the comparison before you see the result, and publish whatever comes out. For Clutch that meant writing on the page that my model didn't beat the market, and keeping every graded game as it was graded.</li>
</ul></section>

<section class="blk" aria-labelledby="try"><h2 id="try">Try it</h2>
<ul>
<li><a href="${tagged(`${APP}/`, "story")}"><strong>app.clutchledger.com</strong></a>: tonight's games. Make your call on one, no account needed. It locks at tip and is graded after the final; sign in afterwards if you want to keep it on your record.</li>
<li><a href="/accuracy/"><strong>The Ledger</strong></a>: every graded game, with ESPN's BPI, the market and the home team beside Clutch.</li>
<li><a href="/how-it-works/"><strong>How it works</strong></a>: the model, the blend and the two-season test.</li>
<li><a href="${RECEIPTS_REPO}"><strong>The seals</strong></a>: every number before tip, and how to check one.</li>
<li><a href="/data/"><strong>Open data</strong></a>: Clutch's sealed numbers as plain files.</li>
<li>The iPhone app is on the <a href="${APP_STORE}">App Store</a>.</li>
</ul>
<p><em>${esc(c.founder)}, ${esc(c.city)}</em></p>
<p class="note">This season's numbers on this page are rebuilt from the Ledger every morning. I wrote this page with Claude's help, the same way I built Clutch.</p></section>
</div></div>`;
  const ld = {
    "@context": "https://schema.org", "@type": "Article",
    headline: s.h1, description: s.description, url: ORIGIN + s.path, mainEntityOfPage: ORIGIN + s.path,
    datePublished: s.published, dateModified: s.modified, image: `${ORIGIN}/og/ledger.jpg`,
    author: { "@type": "Person", name: c.founder, jobTitle: "Senior business analyst and AI product owner", url: `${ORIGIN}/company/` },
    publisher: { "@type": "Organization", name: "Clutch", url: ORIGIN + "/", logo: { "@type": "ImageObject", url: `${ORIGIN}/icon-512.png` } },
  };
  return { path: s.path, title: s.title, html: page({ path: s.path, title: s.title, description: s.description, body, current: "", og: "ledger", ogType: "article", jsonld: [ld] }) };
}
