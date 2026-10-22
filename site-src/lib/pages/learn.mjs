// /learn/ — articles that explain the numbers, each built from the data it
// talks about, so a sentence can't outlive the figure behind it: every
// comparison is read off the benchmark (model/accuracy) or the Ledger at
// build time, and "ahead" is said only when the likely range clears zero.
// Owner rule (2026-10-23): Claude drafts, Uğur approves each article before
// it is listed in ARTICLES.

import { page, esc, ORIGIN } from "../html.mjs";
import { rec, RATE_FLOOR } from "../copy.mjs";
import { mediumDate } from "../time.mjs";
import { COMPANY } from "../../content/company.mjs";

const LEARN = "/learn/";
const b3 = (x) => (x == null ? "—" : x.toFixed(3));
const p1 = (x) => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);
const s4 = (x) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(4)}`;
const list = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** A paired difference [mean, lo, hi] (A minus B, Brier: lower is better) in words, for A against B. */
function gap(d) {
  if (!d) return null;
  if (d[2] < 0) return "clear";
  if (d[1] > 0) return "behind";
  return "noise";
}

// ── How accurate is ESPN BPI? ─────────────────────────────────────────

function bpiArticle(m) {
  const bench = m.accuracy?.benchmark ?? {};
  const seasons = Object.keys(bench).sort();
  if (seasons.length < 2 || !seasons.every((s) => bench[s].tracks?.espn_bpi && bench[s].tracks?.market)) return null;
  const T = (s, k) => bench[s].tracks[k];
  const n = seasons.reduce((a, s) => a + bench[s].n, 0);
  const each = (f) => list(seasons.map((s) => f(s)));
  const blend = m.accuracy?.blend?.at_close;

  // Who is ahead of BPI, from the likely ranges.
  const clutchVs = seasons.map((s) => gap(bench[s].diffs_brier?.clutch_vs_espn));
  const modelVs = seasons.map((s) => gap(bench[s].diffs_brier?.model_vs_espn));
  const clutchLine = clutchVs.every((v) => v === "clear")
    ? "more accurate than BPI's in both seasons, each time beyond the noise"
    : clutchVs.every((v) => v === "clear" || v === "noise") && clutchVs.some((v) => v === "clear")
      ? `more accurate than BPI's in both seasons (beyond the noise in ${list(seasons.filter((_, i) => clutchVs[i] === "clear"))}, within it in ${list(seasons.filter((_, i) => clutchVs[i] === "noise"))})`
      : "not reliably more accurate than BPI's";
  const modelLine = modelVs.every((v) => v === "noise") ? "level with BPI: neither is ahead beyond the noise in either season" : modelVs.every((v) => v === "clear") ? "ahead of BPI in both seasons" : "mixed against BPI";
  const marketLower = seasons.every((s) => T(s, "market").brier < T(s, "espn_bpi").brier);

  // Early season: each team's first games, where ratings still lean on last season.
  const early = seasons.map((s) => {
    const e = bench[s].early;
    if (!e?.brier) return null;
    const ranked = Object.entries({ "ESPN BPI": e.brier.espn_bpi, "the market's final price": e.brier.market, "Clutch's call": e.brier.clutch, "Model only": e.brier.model }).filter(([, v]) => v != null).sort((a, b) => a[1] - b[1]);
    const place = ranked.findIndex(([k]) => k === "ESPN BPI");
    return { s, n: e.n, below: e.games_below, bpi: e.brier.espn_bpi, place, of: ranked.length, best: ranked[0] };
  }).filter(Boolean);
  const placeWord = (r) => (r.place === 0 ? "the best" : r.place === r.of - 1 ? "the worst" : `number ${r.place + 1} of ${r.of}`);
  const earlySentence = early.length
    ? `Over games where either team had played fewer than ${early[0].below}, BPI had ${list(early.map((r) => `${placeWord(r)} score of the four in ${r.s} (${b3(r.bpi)} on ${r.n} games)`))}.${early.length > 1 && new Set(early.map((r) => r.place)).size > 1 ? " Two seasons that point in opposite directions are not a pattern." : ""}`
    : "";

  // This season, live (the Ledger's same-game track).
  const live = m.ledger?.tracks?.vs_espn;
  const liveLine = live?.n
    ? live.n >= RATE_FLOOR
      ? `This season the Ledger grades both after every final, on the same games: so far Clutch ${live.clutch.hit_rate}% right and BPI ${live.espn_bpi.hit_rate}% on ${live.n} games.`
      : `This season the Ledger grades both after every final, on the same games: so far ${rec(Math.round((live.clutch.hit_rate * live.n) / 100), live.n)} for Clutch and ${rec(Math.round((live.espn_bpi.hit_rate * live.n) / 100), live.n)} for BPI on ${live.n} games, too few yet for a rate.`
    : "This season the Ledger grades both after every final, on the same games.";

  const rows = [["ESPN BPI", "espn_bpi", true], ["The market's final price", "market"], ["Clutch's call", "clutch"], ["Clutch, Model only", "model"], ["Always the home team", "always_home"]];
  const head = seasons.map((s) => `<th scope="col" class="num">${esc(s)} RIGHT</th><th scope="col" class="num">SCORE</th>`).join("");
  const table = rows.map(([l, k, lead]) => `<tr><td${lead ? ' class="amber"' : ""}>${esc(l)}</td>${seasons.map((s) => `<td class="num${lead ? " amber" : ""}">${p1(T(s, k)?.acc)}</td><td class="num${lead ? " amber" : ""}">${b3(T(s, k)?.brier)}</td>`).join("")}</tr>`).join("");
  const diffs = seasons.map((s) => { const d = bench[s].diffs_brier ?? {}; return `${s}: Clutch's call minus BPI ${s4(d.clutch_vs_espn[0])} (likely range ${s4(d.clutch_vs_espn[1])} to ${s4(d.clutch_vs_espn[2])}); Model only minus BPI ${s4(d.model_vs_espn[0])} (${s4(d.model_vs_espn[1])} to ${s4(d.model_vs_espn[2])})`; }).join(". ");
  const trained = m.accuracy?.training_info?.trained_at?.slice(0, 10);

  const body = `
<section class="panel" aria-labelledby="short"><span class="kick">THE SHORT ANSWER</span><h2 id="short">Good at picking winners. Its probabilities trail the market's.</h2>
<p class="sub">ESPN BPI picked the winner in ${each((s) => `${p1(T(s, "espn_bpi").acc)} of games in ${s}`)}. That is about as often as anything does: the market's final price picked ${each((s) => p1(T(s, "market").acc))}, and picking the home team every night managed ${each((s) => p1(T(s, "always_home").acc))}.</p>
<p class="sub gap">Where BPI falls behind is the quality of the number itself. On the Brier score, which grades the probability and not just the side, BPI scored ${each((s) => b3(T(s, "espn_bpi").brier))}; the market's final price scored ${each((s) => b3(T(s, "market").brier))}${marketLower ? ", better in both seasons" : ""}. A good independent model lands about where BPI does: Clutch's own number, before it looks at the market, scored ${each((s) => b3(T(s, "model").brier))}.</p></section>

<section aria-labelledby="table"><h2 class="sh" id="table">${n.toLocaleString("en-US")} games, graded the same way</h2>
<div class="scroll"><table class="tbl"><caption class="vh">Share of winners right and Brier score, by season</caption><thead><tr><th scope="col">NUMBER</th>${head}</tr></thead><tbody>${table}</tbody></table></div>
<p class="note">RIGHT: how often the side given over 50% won. SCORE: the Brier score, lower is better; a coin flip on every game scores 0.250. Every row is graded on exactly the same ${seasons.map((s) => `${bench[s].n.toLocaleString("en-US")} games in ${s}`).join(" and ")}.</p></section>

<section class="blk" aria-labelledby="why"><h2 id="why">Why picking the winner isn't the whole story</h2>
<p>Most NBA games have a clear favourite, and favourites win about two games in three. Any sensible number picks those games, so every source above lands near 69% and the share of winners barely separates them. What separates them is the number. A 90% call that loses should cost more than a 55% call that loses, and a team given 70% should win about 70 times in 100.</p>
<p>The Brier score does exactly that. For each game, take the probability given to the team that lost, square it, and average over every game. A 55% call that misses costs 0.30; a 90% call that misses costs 0.81; a 90% call that holds costs 0.01. It rewards being confident when you're right and punishes it when you're wrong, which is what a probability is for.</p></section>

<section class="blk" aria-labelledby="clutch"><h2 id="clutch">Is Clutch more accurate than BPI?</h2>
<p>By the Brier score, Clutch's call was ${clutchLine}. Most of that edge is the market's: right before tip, Clutch's call carries almost entirely the market's final price${blend?.w_model != null ? ` (its own model's weight is ${Math.round(Math.max(0, blend.w_model) * 100)}% there)` : ""}, because by then the market has priced the same injury news and more. Clutch's own number, Model only, is ${modelLine}.</p>
<p>So the plain summary: BPI is a good independent number. The market's final price is better than both, and Clutch's call matches it rather than beating it. Nobody publishing an NBA model reliably beats the market's final price, and Clutch doesn't claim to.</p></section>

${earlySentence ? `<section class="blk" aria-labelledby="early"><h2 id="early">Early in the season</h2><p>In each team's first games, every rating still leans on last season and has not seen the new roster play. ${esc(earlySentence)}</p></section>` : ""}

<section class="blk" aria-labelledby="live"><h2 id="live">This season, live</h2><p>${esc(liveLine)} Every call is sealed in public before tip, so neither side's record can be edited afterwards. <a href="/accuracy/">The live record, band by band →</a></p></section>

<section class="blk" aria-labelledby="method"><h2 id="method">How the test was run</h2>
<p><strong>The games.</strong> Every game of the ${list(seasons)} seasons with both ESPN's pregame probability and the market's final price on record: ${n.toLocaleString("en-US")} in all. Every number is graded on the same games.</p>
<p><strong>ESPN BPI.</strong> ESPN's published win probability for the game, as it stood at tip-off. Because it is the last value before tip, it already reflects late injury news, which makes the comparison fair to BPI.</p>
<p><strong>The market's final price.</strong> The last price before tip, read as a fair probability: both sides adding up to 100%.</p>
<p><strong>Clutch.</strong> Each month was predicted by a model fit only on games played before it, the way it would have run live. Clutch's call blends that number with the market's price; Model only is the number before the blend.</p>
<p><strong>The noise.</strong> Each difference comes with a likely range: where it lands 95 times in 100 when the same games are resampled. ${esc(diffs)}. A range that crosses zero means the gap could be luck.</p></section>

<p class="note">Numbers from Clutch's walk-forward test${trained ? `, published with the model fit on ${esc(mediumDate(trained))}` : ""}; this page is rebuilt from them, and from the Ledger, every day. ESPN and BPI are ESPN's; Clutch is not affiliated with ESPN or the NBA. <a href="/how-it-works/">How Clutch's model works →</a></p>`;

  return {
    slug: "espn-bpi-accuracy",
    h1: "How accurate is ESPN BPI?",
    kick: "DATA STUDY",
    title: `How accurate is ESPN BPI? ${n.toLocaleString("en-US")} NBA games graded · Clutch`,
    description: `ESPN BPI picked the winner in about ${Math.round(T(seasons[1], "espn_bpi").acc * 100)}% of NBA games. We graded its probabilities on ${n.toLocaleString("en-US")} games beside the market, Clutch and the home team.`,
    deck: `We graded ESPN's pregame win probability on every game of the last two NBA seasons where it was on record (${n.toLocaleString("en-US")} games), beside the market's final price, Clutch, and picking the home team.`,
    published: "2026-10-23",
    modified: trained && trained > "2026-10-23" ? trained : "2026-10-23",
    body,
  };
}

/** The articles, in the order the hub lists them. Each builder returns null when its data isn't loaded. */
const ARTICLES = [bpiArticle];

function articlePage(a) {
  const path = `${LEARN}${a.slug}/`;
  const body = `<div class="wrap r"><div class="rhead"><span class="kick">LEARN · ${esc(a.kick)}</span><h1 class="rh1">${esc(a.h1)}</h1><p class="rdeck">${esc(a.deck)}</p><p class="mono ink3">BY ${esc(COMPANY.founder.toUpperCase())} · ${esc(mediumDate(a.published).toUpperCase())}${a.modified !== a.published ? ` · UPDATED ${esc(mediumDate(a.modified).toUpperCase())}` : ""}</p></div>
<div class="body">${a.body}</div></div>`;
  const ld = {
    "@context": "https://schema.org", "@type": "Article",
    headline: a.h1, description: a.description, url: ORIGIN + path, mainEntityOfPage: ORIGIN + path,
    datePublished: a.published, dateModified: a.modified, image: `${ORIGIN}/og/ledger.jpg`,
    author: { "@type": "Person", name: COMPANY.founder, url: `${ORIGIN}/company/` },
    publisher: { "@type": "Organization", name: "Clutch", url: ORIGIN + "/", logo: { "@type": "ImageObject", url: `${ORIGIN}/icon-512.png` } },
  };
  return { path, title: a.title, html: page({ path, title: a.title, description: a.description, body, current: "how", og: "ledger", ogType: "article", jsonld: ld }) };
}

export function learnPages(m) {
  const articles = ARTICLES.map((f) => f(m)).filter(Boolean);
  if (!articles.length) return [];
  const hub = `<div class="wrap r"><div class="rhead"><span class="kick">LEARN</span><h1 class="rh1">NBA win probability, explained.</h1><p class="rdeck">What the numbers mean, how they are graded, and how the well-known ones hold up. Every figure on these pages comes from the data and is rebuilt every day.</p></div>
<div class="body">${articles.map((a) => `<section class="blk"><span class="kick">${esc(a.kick)}</span><h2><a href="${LEARN}${a.slug}/">${esc(a.h1)}</a></h2><p>${esc(a.description)}</p></section>`).join("")}</div></div>`;
  const hubTitle = "Learn: NBA win probability, explained · Clutch";
  return [
    { path: LEARN, title: hubTitle, html: page({ path: LEARN, title: hubTitle, description: "What NBA win probabilities mean, how they are graded, and how ESPN BPI, the market and Clutch hold up, with every figure rebuilt from the data.", body: hub, current: "how", og: "default" }) },
    ...articles.map(articlePage),
  ];
}
