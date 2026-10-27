// /learn/ — articles that explain the numbers, each built from the data it
// talks about, so a sentence can't outlive the figure behind it: every
// comparison is read off the benchmark (model/accuracy) or the Ledger at
// build time, and "ahead" is said only when the likely range clears zero.
// Owner rule (2026-10-23): Claude drafts, Uğur approves each article before
// it is listed in ARTICLES.

import { page, esc, ORIGIN } from "../html.mjs";
import { rec, RATE_FLOOR, pct, leadText, shortHash, sealFileUrl, RECEIPTS_REPO, RECEIPTS_ACTIVITY_URL, DATA_LICENSE_LINE } from "../copy.mjs";
import { mediumDate, shortDate, timeET } from "../time.mjs";
import { lastGradedNight } from "../model.mjs";
import { COMPANY } from "../../content/company.mjs";
import { dataRows, DATA, FILES } from "./data.mjs";
import { backtestSentence } from "./accuracy.mjs";

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

// ── What is NBA win probability? ──────────────────────────────────────

function winProbArticle(m) {
  // The example: tonight's (or the next night's) clearest favourite, else the last graded night's.
  const ahead = (m.tonight ? m.nights[m.tonight] ?? [] : []).filter((g) => g.status === "scheduled" && g.hasCall && !g.preseason).sort((a, b) => b.side.prob - a.side.prob)[0];
  const last = lastGradedNight(m, m.today);
  const lastCalls = last ? m.calls.filter((c) => c.game_date === last && c.season_type !== "Preseason") : [];
  let ex = null;
  if (ahead) ex = { fav: ahead.side.team.nickname, other: ahead.side.other.nickname, p: pct(ahead.side.prob), when: ahead.date === m.today ? "tonight" : `on ${shortDate(ahead.date)}`, path: ahead.path };
  else if (lastCalls.length) {
    const c = lastCalls.slice().sort((a, b) => b.claimed_pct - a.claimed_pct)[0];
    const [aw, hm] = c.matchup.split(" @ ").map((x) => m.byAbbr[x]);
    const fav = m.byAbbr[c.pick];
    if (aw && hm && fav) ex = { fav: fav.nickname, other: (fav.id === hm.id ? aw : hm).nickname, p: Math.round(c.claimed_pct), when: `on ${shortDate(c.game_date)}`, path: m.gameById[c.game_id]?.path ?? null };
  }
  if (!ex) return null;
  const inN = Math.round(100 / (100 - ex.p));
  const bench = m.accuracy?.benchmark ?? {};
  const seasons = Object.keys(bench).sort();
  const homes = seasons.map((s) => bench[s].tracks?.always_home?.acc).filter((x) => x != null);
  const held = lastCalls.filter((c) => c.correct).length;
  const expectedMisses = lastCalls.reduce((a, c) => a + (1 - c.claimed_pct / 100), 0);
  const exName = ex.path ? `<a href="${ex.path}">the ${esc(ex.fav)} ${ex.p}% against the ${esc(ex.other)}</a>` : `the ${esc(ex.fav)} ${ex.p}% against the ${esc(ex.other)}`;
  const bands = [
    ["50–54%", "Narrowly", "Close to a coin flip. The favourite wins a little more often than not."],
    ["55–61%", "By a possession", "A real edge, but the other side wins about two games in five."],
    ["62–71%", "Clearly", "A solid favourite. Upsets still come about one game in three or four."],
    ["72% and up", "Comfortably", "A strong favourite. Even at 80%, one game in five goes the other way."],
  ];
  const body = `
<section class="panel" aria-labelledby="short"><span class="kick">THE SHORT ANSWER</span><h2 id="short">A number for how often this game goes one way.</h2>
<p class="sub">A win probability is a single number for how likely a team is to win a game. When Clutch gives ${exName} ${esc(ex.when)}, it means that in games like this one, a team in that position wins about ${ex.p} times in 100 and loses about ${100 - ex.p}. It is not a promise: a ${ex.p}% favourite should lose about one game in ${inN === 2 ? "two" : inN === 3 ? "three" : inN === 4 ? "four" : inN === 5 ? "five" : inN}.</p></section>

<section aria-labelledby="read"><h2 class="sh" id="read">How to read the number</h2>
<div class="scroll"><table class="tbl"><caption class="vh">What each range of win probability means</caption><thead><tr><th scope="col">NUMBER</th><th scope="col">CLUTCH SAYS</th><th scope="col">WHAT IT MEANS</th></tr></thead><tbody>${bands.map(([n, w, d]) => `<tr><td class="num">${n}</td><td class="amber">${esc(w)}</td><td>${esc(d)}</td></tr>`).join("")}</tbody></table></div>
<p class="note">The words are the ones over each number on Clutch's game pages. The number always belongs to the side Clutch favours; the other side's is 100 minus it.</p></section>

<section class="blk" aria-labelledby="made"><h2 id="made">Where the number comes from</h2>
<p>A pregame win probability starts from how good each team is this season and lately, then adjusts for the night itself: rest and back-to-backs, travel, altitude, a neutral floor, and who is listed on the league's official injury report, weighted by how much each player has been worth. Home court matters too${homes.length ? `: home teams won ${list(homes.map((h) => `${(h * 100).toFixed(1)}%`))} of the games in ${list(seasons)}` : ""}.</p>
<p>Clutch's model learns how much each of these is worth from past seasons, then shows the top reasons behind every number in plain words. <a href="/how-it-works/">How Clutch's model works →</a></p></section>

<section class="blk" aria-labelledby="market"><h2 id="market">The market's number</h2>
<p>The prices on a game can be read as a win probability too: take the margin out and both sides add up to 100%. Just before tip that number has seen almost all of the day's news, which makes it the hardest one to improve on. Clutch shows it beside its own number on every game and grades both after the final.</p></section>

<section class="blk" aria-labelledby="live"><h2 id="live">Pregame and live</h2>
<p>TV broadcasts and score apps often show a live win probability that moves with every possession. Clutch's number is the pregame one: made on the day of the game, sealed in public before tip, and graded after the final, so it can be checked against what happened.</p></section>

<section class="blk" aria-labelledby="good"><h2 id="good">How to tell a good one</h2>
<p>Two checks. First, does it come true as often as it says? Of all the games a source called at 70%, the favourite should win about 70 in every 100. That is calibration. Second, is it confident when it's right and cautious when it isn't? The Brier score grades that: lower is better, and a coin flip on every game scores 0.250.</p>
<p>Clutch prints both for its own numbers, band by band, beside ESPN BPI, the market and picking the home team. <a href="/accuracy/">How accurate Clutch is →</a> · <a href="/learn/espn-bpi-accuracy/">How accurate is ESPN BPI? →</a></p></section>

${lastCalls.length ? `<section class="blk" aria-labelledby="upsets"><h2 id="upsets">Why favourites lose</h2>
<p>On ${esc(shortDate(last))}, Clutch's favourites won ${held} of ${lastCalls.length}. Its numbers for those games added up to about ${expectedMisses.toFixed(1)} expected losses, so ${lastCalls.length - held === 0 ? "a perfect night was luckier than it looks" : lastCalls.length - held < expectedMisses - 0.5 ? "the night went better than the numbers said it would" : lastCalls.length - held > expectedMisses + 0.5 ? "the night went worse than the numbers said it would" : "the night went about as the numbers said"}. A source whose favourites never lose isn't giving probabilities; over a season, a 70% favourite should lose about three games in ten.</p></section>` : ""}

<p class="note">The example and the night above are rebuilt from Clutch's data every day. <a href="/learn/">More on reading the numbers →</a></p>`;
  return {
    slug: "what-is-win-probability",
    h1: "What is NBA win probability?",
    kick: "THE BASICS",
    title: "What is NBA win probability? How to read it · Clutch",
    description: "What an NBA win probability means, how to read 55% or 75%, where the number comes from, and how to tell a good one from a bad one.",
    deck: "A win probability is one number for how likely a team is to win a game. Here is what it means, how it is made, and how to tell a good one from a bad one.",
    published: "2026-10-23",
    modified: "2026-10-23",
    body,
  };
}

// ── Calibration and the Brier score ───────────────────────────────────

function brierArticle(m) {
  const bench = m.accuracy?.benchmark ?? {};
  const seasons = Object.keys(bench).sort();
  const last = lastGradedNight(m, m.today);
  const night = last ? m.calls.filter((c) => c.game_date === last && c.season_type !== "Preseason") : [];
  if (!seasons.length || !night.length) return null;
  const T = (k) => seasons.map((s) => bench[s].tracks?.[k]?.brier).filter((x) => x != null);
  const sc = (xs) => list(xs.map(b3));
  // The worked example: each of the last graded night's calls, scored.
  const rows = night.map((c) => { const q = c.claimed_pct / 100; return { c, q, cost: c.correct ? (1 - q) ** 2 : q ** 2 }; });
  const avg = rows.reduce((a, r) => a + r.cost, 0) / rows.length;
  const worst = rows.slice().sort((a, b) => b.q - a.q)[0]; // the night's most confident call shows the stakes best
  const bands = (m.record ? m.ledger?.calibration ?? [] : []).filter((b) => b && b.n > 0);
  const band = (b) => `${Math.round(b.lo * 100)}–${Math.round(b.hi * 100)}%`;
  const body = `
<section class="panel" aria-labelledby="short"><span class="kick">THE SHORT ANSWER</span><h2 id="short">Does 70% happen 70% of the time, and how confident was it when it mattered?</h2>
<p class="sub">Calibration asks whether a forecaster's numbers come true as often as they say: of all the games called at 70%, the favourite should win about 70 in 100. The Brier score turns calibration and confidence into one number per forecaster. Lower is better and a coin flip on every game scores 0.250. Over the last two NBA seasons the market's final price scored ${sc(T("market"))}, ESPN BPI ${sc(T("espn_bpi"))}, and picking the home team every night ${sc(T("always_home"))}.</p></section>

<section class="blk" aria-labelledby="cal"><h2 id="cal">Calibration</h2>
<p>Put a forecaster's games in bands by the number it gave the favourite: 50–60%, 60–70%, and so on. In each band, count how often the favourite won. A calibrated forecaster's 60s win about 60% of the time and its 80s about 80%. If its 80s win only 65%, the 80s are overconfident, however many games it gets right.</p>
<p>Small samples lie. Eight games in a band can easily come out 5 of 8 or 7 of 8 by luck, so a band means little until it holds a few dozen games.${bands.length ? ` Clutch's bands this season, so far: ${esc(bands.map((b) => `${band(b)}, ${b.hits} of ${b.n}`).join("; "))}.` : ""} <a href="/accuracy/">Every band, updated each morning →</a></p></section>

<section aria-labelledby="brier"><h2 class="sh" id="brier">The Brier score, one game at a time</h2>
<p class="sub">For each game, take the number given to the side that lost and square it; average over every game. A favourite at ${pct(worst.q)}% that loses costs ${b3(worst.q ** 2)}; the same favourite winning costs ${b3((1 - worst.q) ** 2)}. Here are Clutch's graded calls from ${esc(shortDate(last))}, scored:</p>
<div class="scroll gap"><table class="tbl"><caption class="vh">Brier score for each call on ${esc(shortDate(last))}</caption><thead><tr><th scope="col">GAME</th><th scope="col" class="num">CLUTCH</th><th scope="col">RESULT</th><th scope="col" class="num">COST</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.c.matchup.replace(" @ ", " at "))}</td><td class="num">${esc(r.c.pick)} ${Math.round(r.c.claimed_pct)}%</td><td>${r.c.correct ? '<span class="chip win">RIGHT</span>' : '<span class="chip loss">MISSED</span>'}</td><td class="num">${b3(r.cost)}</td></tr>`).join("")}</tbody></table></div>
<p class="note">The night's average: ${b3(avg)} on ${rows.length} ${rows.length === 1 ? "game" : "games"}. One night says little; the seasons below are 1,300 games each.</p></section>

<section class="blk" aria-labelledby="good"><h2 id="good">What a good score looks like</h2>
<p>A coin flip on every game scores 0.250. Picking the home team at its usual rate gets you to about ${sc(T("always_home"))}. The serious NBA forecasts sit close together: ESPN BPI scored ${sc(T("espn_bpi"))} over ${list(seasons)}, Clutch's call ${sc(T("clutch"))}, and the market's final price ${sc(T("market"))}.</p>
<p>Those gaps look tiny, and over a single night they are noise. Over 1,300 games, a gap of 0.004 can be real, which is why every comparison Clutch prints comes with a likely range: the span the gap falls in 95 times in 100 when the same games are resampled. <a href="/learn/espn-bpi-accuracy/">The full comparison with ESPN BPI →</a></p></section>

<section class="blk" aria-labelledby="both"><h2 id="both">Why both matter</h2>
<p>Calibration alone can be gamed by never saying much: a forecaster that gives every home team 56% is close to calibrated and tells you almost nothing. The Brier score catches that, because it rewards numbers that are far from 50% and right. A forecaster that is bold and wrong loses on both counts. Good forecasts are calibrated and as confident as the evidence allows.</p></section>

<p class="note">The night and the bands are rebuilt from Clutch's Ledger every day; the season scores from its walk-forward test. <a href="/learn/">More on reading the numbers →</a></p>`;
  return {
    slug: "calibration-and-brier-score",
    h1: "Calibration and the Brier score, explained",
    kick: "THE BASICS",
    title: "Calibration and the Brier score, explained with NBA games · Clutch",
    description: "How to grade a forecaster: calibration (does 70% happen 70% of the time?) and the Brier score, with real NBA calls scored one game at a time.",
    deck: "Two ways to grade anyone who puts a number on a game: does it come true as often as it says, and was it confident when it mattered? With real NBA calls, scored one game at a time.",
    published: "2026-10-23",
    modified: "2026-10-23",
    body,
  };
}

// ── How to check a prediction came before the game ────────────────────

function sealArticle(m) {
  // The example: the first seal of the last graded night whose games (and their tips) are all known.
  const last = lastGradedNight(m, m.today);
  const seals = m.receipts.filter((r) => r.kind === "seal" && r.slate_date === last).sort((a, b) => a.committed_at.localeCompare(b.committed_at));
  const seal = seals[0];
  if (!seal) return null;
  const games = (m.receiptGames[seal.id] ?? []).map((x) => m.gameById[x.gameId]);
  if (!games.length || !games.every((g) => g?.tipUtc)) return null;
  const firstTip = games.map((g) => g.tipUtc).sort()[0];
  const lead = leadText(seal.committed_at, firstTip);
  if (!lead) return null;
  const sha = String(seal.commit_url ?? "").match(/\/commit\/([0-9a-f]{40,64})$/)?.[1];
  const fileUrl = sha && seal.path ? sealFileUrl({ commitSha: sha, path: seal.path, commitUrl: seal.commit_url }) : seal.commit_url ?? RECEIPTS_REPO;
  const night = m.calls.filter((c) => c.game_date === last && c.season_type !== "Preseason");
  const held = night.filter((c) => c.correct).length;
  const excluded = m.record?.excluded ?? 0;
  const body = `
<section class="panel" aria-labelledby="short"><span class="kick">THE SHORT ANSWER</span><h2 id="short">Look for a fingerprint, a clock nobody can set, and the misses.</h2>
<p class="sub">A real pregame prediction leaves three marks: a fingerprint of the numbers published before tip, a timestamp the forecaster cannot set, and a record that keeps every miss. Screenshots and posts made after the final prove nothing, and a dated blog post can be edited the next morning.</p></section>

<section class="blk" aria-labelledby="why"><h2 id="why">Why it matters</h2>
<p>A track record is easy to fake without a single lie you can point to: post only the calls that came in, delete the ones that didn't, nudge a number after the injury news, or write the prediction up once the game is over. Each one makes a forecaster look better than it is. The only defence is a record that was fixed in public before the games and can't be quietly trimmed afterwards.</p></section>

<section class="blk" aria-labelledby="fp"><h2 id="fp">1. A fingerprint before tip</h2>
<p>Clutch writes every game's number into a file and publishes the file's SHA-256 fingerprint: 64 characters computed from its contents. Change one digit of one number and the fingerprint comes out completely different, so a published fingerprint pins the file down exactly. On ${esc(shortDate(last))}, the night's first file held ${games.length} ${games.length === 1 ? "game" : "games"} and its fingerprint, shortened, is <code>${esc(shortHash(seal.sha256))}</code>.</p></section>

<section class="blk" aria-labelledby="clock"><h2 id="clock">2. A clock nobody can set</h2>
<p>The date on a file or a commit is typed by whoever makes it, so on its own it proves nothing. What counts is when the file reached a public server that keeps its own time. Clutch's files go to a public GitHub repository, and GitHub records when each one arrived. That ${esc(shortDate(last))} file arrived at ${esc(timeET(seal.committed_at))}, ${esc(lead)} before the first tip.${seals.length > 1 ? ` When news moved a number later that day, the file was sealed again, ${seals.length - 1} more ${seals.length === 2 ? "time" : "times"}; the last seal before each game counts.` : ""} <a href="${esc(fileUrl)}">The file →</a> · <a href="${RECEIPTS_ACTIVITY_URL}">GitHub's arrival times →</a></p></section>

<section class="blk" aria-labelledby="miss"><h2 id="miss">3. The misses stay</h2>
<p>Each file names the fingerprint of the one before it, so an old file can't be swapped out or dropped without breaking the chain. After the final, every call is graded against the sealed number, right or wrong.${night.length ? ` That night, Clutch's calls held in ${held} of ${night.length}, and the misses are on the Ledger beside the hits.` : ""}${excluded ? ` Calls that can't be shown to predate tip aren't graded at all, and the Ledger prints how many: ${excluded} so far this season.` : ""} <a href="/ledger/">Every graded call →</a></p></section>

<section class="blk" aria-labelledby="yourself"><h2 id="yourself">Check one yourself</h2>
<p>Download any night's file, compute its fingerprint with a tool your computer already has (<code>shasum -a 256</code> on a Mac, <code>certutil -hashfile</code> on Windows), and compare it with the one on the Proof page; then check its arrival time against the tip. It takes about two minutes. <a href="/receipts/">Step by step, on the Proof page →</a></p></section>

<section class="blk" aria-labelledby="not"><h2 id="not">What a seal doesn't prove</h2>
<p>A seal proves when a number was made, not that it was any good. For that you need many graded games: how often the favourites won, and how each band of numbers held up. <a href="/accuracy/">How accurate Clutch is →</a> · <a href="/learn/calibration-and-brier-score/">Calibration and the Brier score →</a></p></section>

<p class="note">The example above is rebuilt from Clutch's public files every day.</p>`;
  return {
    slug: "check-a-prediction-came-first",
    h1: "How to check a prediction was made before the game",
    kick: "PROOF",
    title: "How to check an NBA prediction was made before the game · Clutch",
    description: "Anyone can say they called it after the final. Three marks of a real pregame prediction, shown on a real night of sealed NBA numbers.",
    deck: "Anyone can say they called it once the final is in. Here is how to tell a real pregame prediction from one written afterwards, with a real night of Clutch's sealed numbers as the example.",
    published: "2026-10-23",
    modified: "2026-10-23",
    body,
  };
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

// ── After FiveThirtyEight ─────────────────────────────────────────────

// The old addresses and where they went, as checked by hand on CHECKED (curl: each a 302 to ABC News's politics page).
const FTE_GONE = ["projects.fivethirtyeight.com/2025-nba-predictions/", "projects.fivethirtyeight.com/nba-model/nba_elo_latest.csv", "projects.fivethirtyeight.com/nba-model/nba_elo.csv"];
const FTE_CHECKED = "2026-10-27";

function fteArticle(m) {
  const rows = dataRows(m);
  if (!rows.length) return null;
  const r = m.record;
  const live = r?.n ? `This season so far Clutch's calls are ${rec(r.hits, r.n)} on ${r.n} graded ${r.n === 1 ? "game" : "games"}, every one sealed before tip.` : "This season's first calls are graded the morning after its first finals.";
  const test = backtestSentence(m.accuracy?.benchmark);
  const py = `import pandas as pd\n\n# was: https://projects.fivethirtyeight.com/nba-model/nba_elo_latest.csv\ngames = pd.read_csv("${ORIGIN}${FILES.fte}")\n\n# code that reads elo_prob1 / elo_prob2 can point at Clutch's columns:\ngames = games.rename(columns={"clutch_prob1": "elo_prob1", "clutch_prob2": "elo_prob2"})`;
  const rr = `games <- read.csv("${ORIGIN}${FILES.fte}")`;
  const body = `
<section class="panel" aria-labelledby="short"><span class="kick">THE SHORT ANSWER</span><h2 id="short">The forecast closed in 2025. Its links now go to ABC News.</h2>
<p class="sub">ABC News closed FiveThirtyEight on March 5, 2025, and since May 2026 its old pages and data files redirect to ABC News's politics section, so links and code that read them break. Clutch publishes a pregame win probability for every NBA game, sealed in public before tip and graded after the final, free to download in the same CSV layout: change one address and rename one column.</p></section>

<section aria-labelledby="links"><h2 class="sh" id="links">Where the old addresses go now</h2>
<div class="scroll"><table class="tbl"><caption class="vh">FiveThirtyEight's NBA addresses and where they lead now</caption><thead><tr><th scope="col">OLD ADDRESS</th><th scope="col">NOW</th></tr></thead><tbody>${FTE_GONE.map((u) => `<tr><td><code>${esc(u)}</code></td><td>ABC News's politics page</td></tr>`).join("")}</tbody></table></div>
<p class="note">Checked on ${esc(mediumDate(FTE_CHECKED))}. FiveThirtyEight's data repository on GitHub still points at the two files, so tutorials and class notebooks built on them stop at the first line.</p></section>

<section class="blk" aria-labelledby="switch"><h2 id="switch">Switch in one line</h2>
<p><a href="${FILES.fte}">nba-538-format.csv</a> holds every game of the ${esc(m.current)} season that has Clutch's number (${rows.length.toLocaleString("en-US")} so far), rebuilt four times a day. In Python:</p><pre class="scroll"><code>${esc(py)}</code></pre>
<p class="gap">In R:</p><pre class="scroll"><code>${esc(rr)}</code></pre>
<p class="gap">The same games as JSON, with each call's result and seal, are on <a href="${DATA}">the open data page</a>.</p></section>

<section class="blk" aria-labelledby="same"><h2 id="same">What's the same</h2>
<p>One row per game, with FiveThirtyEight's first columns in their order: <code>date</code>, <code>season</code> as the year the season ends (2027 for ${esc(m.current)}), <code>neutral</code> as 0 or 1, <code>playoff</code> blank in the regular season, <code>team1</code> at home and <code>team2</code> away with FiveThirtyEight's team codes (BRK, CHO, PHO), and <code>score1</code> and <code>score2</code> once the game is final.</p></section>

<section class="blk" aria-labelledby="diff"><h2 id="diff">What's different</h2>
<p><strong>The number.</strong> It is Clutch's, not Elo or RAPTOR: a model of each team's form, rest, travel and the injury report, blended with the market's price before tip. It sits in <code>clutch_prob1</code> and <code>clutch_prob2</code>; there are no team-rating columns.</p>
<p><strong>The years.</strong> This season only, from opening night. FiveThirtyEight's file went back to 1946; Clutch's sealed numbers start this season.</p>
<p><strong>The schedule.</strong> A game's row appears once Clutch has a number for it, usually the morning of the game, not weeks ahead.</p>
<p><strong>The record.</strong> Every number is sealed with a SHA-256 fingerprint in a public repository before tip, so no row can be changed after the final. <a href="/learn/check-a-prediction-came-first/">How to check one →</a></p></section>

<section class="blk" aria-labelledby="good"><h2 id="good">How good is it?</h2>
<p>${esc(live)}${test ? ` ${esc(test)}` : ""}</p>
<p><a href="/accuracy/">The live record, band by band →</a> · <a href="/learn/espn-bpi-accuracy/">ESPN BPI and the market on the same games →</a></p></section>

<section class="blk" aria-labelledby="else"><h2 id="else">Other places to look</h2>
<p>ESPN's BPI gives a win probability for every game on ESPN's site, and the market's price can be read as one too. Clutch's game pages show both beside its own number, and the Ledger grades all three on the same games every night. <a href="/ledger/">The Ledger →</a></p></section>

<p class="note">${DATA_LICENSE_LINE} FiveThirtyEight is ABC News's; Clutch is not affiliated with FiveThirtyEight, ABC News, ESPN or the NBA.</p>`;
  return {
    slug: "fivethirtyeight-nba-predictions",
    h1: "FiveThirtyEight's NBA predictions are gone. What to use now.",
    kick: "DATA",
    title: "FiveThirtyEight NBA predictions are gone: a free alternative · Clutch",
    description: "FiveThirtyEight's NBA forecast and nba_elo_latest.csv now redirect to ABC News. Clutch's free, graded win probability for every game, in the same CSV layout.",
    deck: "FiveThirtyEight's NBA forecast was the free, open win probability many fans, writers and students leaned on. Its pages and data files now lead to ABC News. Here is what changed, and a free number for every game, graded in public, in the same CSV layout.",
    published: "2026-10-27",
    modified: "2026-10-27",
    body,
  };
}

/** The articles, in the order the hub lists them. Each builder returns null when its data isn't loaded. */
const ARTICLES = [winProbArticle, brierArticle, bpiArticle, sealArticle, fteArticle];

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
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Learn", item: ORIGIN + LEARN }, { "@type": "ListItem", position: 2, name: a.h1, item: ORIGIN + path }] };
  return { path, title: a.title, html: page({ path, title: a.title, description: a.description, body, current: "how", og: "ledger", ogType: "article", jsonld: [ld, crumbs] }) };
}

// The hub's terms: each one short, each linked to the page that explains it in full.
// A link to an article is kept only while that article is built.
const GLOSSARY = [
  { term: "Win probability", def: "The chance, from 0% to 100%, that a team wins a game. Clutch gives one before every NBA game, and the two sides add up to 100%.", href: `${LEARN}what-is-win-probability/` },
  { term: "Pregame and live win probability", def: "A pregame number is made before tip and stays fixed. A live number moves with every possession. Only the pregame one can be graded as a forecast.", href: `${LEARN}what-is-win-probability/` },
  { term: "Calibration", def: "Whether the numbers mean what they say: of all the games called at 70%, that side should win about 70 in 100.", href: `${LEARN}calibration-and-brier-score/` },
  { term: "Brier score", def: "The average squared gap between the probability and what happened (1 for a win, 0 for a loss). Lower is better; saying 50% every game scores 0.250.", href: `${LEARN}calibration-and-brier-score/` },
  { term: "Graded call", def: "The side a number puts over 50%, marked right or wrong after the final. Every call of the season is listed in the Ledger.", href: "/ledger/" },
  { term: "Sealed prediction", def: "A number written to a public, timestamped record before tip, so anyone can check it was not changed after the final.", href: `${LEARN}check-a-prediction-came-first/` },
  { term: "The market's price", def: "What the wider market makes of a game, read as a fair probability (both sides adding up to 100%). Clutch's call blends its model with it; Model only is the number before the blend.", href: "/how-it-works/" },
  { term: "ESPN BPI", def: "ESPN's Basketball Power Index: a well-known team rating that also gives a win probability for each game.", href: `${LEARN}espn-bpi-accuracy/` },
  { term: "Always home", def: "The simplest yardstick: pick the home team in every game. A forecast that can't beat it isn't adding much.", href: "/accuracy/" },
  { term: "Likely range", def: "Where a rate could plausibly sit given how few games are behind it. The fewer the games, the wider the range.", href: "/accuracy/" },
];

export function learnPages(m) {
  const articles = ARTICLES.map((f) => f(m)).filter(Boolean);
  if (!articles.length) return [];
  const built = new Set(articles.map((a) => `${LEARN}${a.slug}/`));
  const terms = GLOSSARY.filter((t) => !t.href.startsWith(LEARN) || built.has(t.href));
  const r = m.record;
  const standing = r?.n
    ? `<p>This season so far: ${rec(r.hits, r.n)} on ${r.n} graded ${r.n === 1 ? "call" : "calls"}, every one sealed before tip. <a href="/accuracy/">How the numbers hold up, band by band →</a></p>`
    : `<p>The season's first calls are graded the morning after its first finals. <a href="/accuracy/">The accuracy report →</a></p>`;
  const hub = `<div class="wrap r"><div class="rhead"><span class="kick">LEARN</span><h1 class="rh1">NBA win probability, explained.</h1><p class="rdeck">What the numbers mean, how they are graded, and how the well-known ones hold up. Every figure on these pages comes from the data and is rebuilt every day.</p></div>
<div class="body">${articles.map((a) => `<section class="blk"><span class="kick">${esc(a.kick)}</span><h2><a href="${LEARN}${a.slug}/">${esc(a.h1)}</a></h2><p>${esc(a.description)}</p></section>`).join("")}
<section class="blk" aria-labelledby="terms"><h2 id="terms">The terms, in a sentence each</h2><dl>${terms.map((t) => `<dt><a href="${t.href}">${esc(t.term)}</a></dt><dd>${esc(t.def)}</dd>`).join("")}</dl></section>
<section class="blk" aria-labelledby="standing"><h2 id="standing">Where Clutch stands</h2>${standing}</section></div></div>`;
  const hubTitle = "Learn: NBA win probability, explained · Clutch";
  const termSet = {
    "@context": "https://schema.org", "@type": "DefinedTermSet", name: "NBA win probability terms", url: ORIGIN + LEARN,
    hasDefinedTerm: terms.map((t) => ({ "@type": "DefinedTerm", name: t.term, description: t.def, url: ORIGIN + t.href })),
  };
  return [
    { path: LEARN, title: hubTitle, html: page({ path: LEARN, title: hubTitle, description: "What NBA win probabilities mean, how they are graded, and how ESPN BPI, the market and Clutch hold up: five articles and the key terms, with every figure rebuilt from the data.", body: hub, current: "how", og: "default", jsonld: [termSet] }) },
    ...articles.map(articlePage),
  ];
}
