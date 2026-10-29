// /accuracy/ — how accurate Clutch is, as a report rebuilt from the data at
// every build: the season's graded calls (the Ledger's free snapshot), how
// often each band of numbers came true (its calibration rows), the same games
// for ESPN BPI, the market and the home team, and — kept apart, never mixed
// with the live record — the two-season test the model passed before it
// shipped (model/accuracy). The Ledger's rules hold: no rate under twenty
// calls (right–wrong until then), never a rate without its baseline, and
// every sentence about who is ahead is read off the numbers and their
// likely ranges, never written in advance.

import { page, esc, ORIGIN, bar } from "../html.mjs";
import { comparisons, verdictOf, rec, RATE_FLOOR, RECEIPTS_REPO, wilson, DATA_LICENSE_URL, DATA_LICENSE_LINE } from "../copy.mjs";
import { mediumDate } from "../time.mjs";
import { BACKTEST_CALIBRATION } from "../../content/backtest.mjs";

const PATH = "/accuracy/";
const callWord = (n) => `${n.toLocaleString("en-US")} ${n === 1 ? "call" : "calls"}`;
const b3 = (x) => (x == null ? "—" : x.toFixed(3));
const pc1 = (x) => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);
const bandLabel = (b) => `${Math.round(b.lo * 100)}–${Math.round(b.hi * 100)}%`;

/** How a likely range [mean, lo, hi] of "Clutch minus them" (Brier: lower is better) reads. */
function versus(d) {
  if (!d) return null;
  const [, lo, hi] = d;
  if (hi < 0) return "ahead";
  if (lo > 0) return "behind";
  return d[0] < 0 ? "ahead-noise" : d[0] > 0 ? "behind-noise" : "level";
}

/** The two-season test in two sentences, read off its likely ranges. */
export function backtestSentence(bench) {
  const seasons = Object.keys(bench ?? {}).sort();
  if (!seasons.length) return null;
  const games = seasons.reduce((s, k) => s + (bench[k].n ?? 0), 0);
  const espn = seasons.map((k) => versus(bench[k].diffs_brier?.clutch_vs_espn));
  const mkt = seasons.map((k) => versus(bench[k].diffs_brier?.clutch_vs_market));
  const all = seasons.length === 2 ? "both seasons" : "every season";
  const clear = seasons.filter((_, i) => espn[i] === "ahead"), noise = seasons.filter((_, i) => espn[i] === "ahead-noise");
  let vsE;
  if (clear.length === seasons.length) vsE = `more accurate than ESPN BPI's in ${all}, each time beyond the noise`;
  else if (clear.length + noise.length === seasons.length) vsE = clear.length ? `more accurate than ESPN BPI's in ${all} (clearly in ${clear.join(" and ")}; in ${noise.join(" and ")} the gap was within the noise)` : `a little more accurate than ESPN BPI's, within the noise`;
  else vsE = "not reliably more accurate than ESPN BPI's";
  const vsM = mkt.some((v) => v === "ahead") ? "Against the market's final price they came out ahead in at least one season." : mkt.some((v) => v === "behind") ? "Against the market's final price they were behind." : "Against the market's final price they were level: as good as the market, not better.";
  // On winners alone the numbers sit close together; say how close, from the table.
  const gap = Math.max(...seasons.map((k) => { const t = bench[k].tracks ?? {}; const xs = ["clutch", "espn_bpi", "market"].map((x) => t[x]?.acc).filter((x) => x != null); return xs.length > 1 ? Math.max(...xs) - Math.min(...xs) : 0; }));
  const winners = gap > 0 ? ` On winners alone, the three were within ${(gap * 100).toFixed(1)} points of each other each season.` : "";
  return `Replayed over ${seasons.length === 2 ? "two" : seasons.length} seasons (${seasons.join(" and ")}, ${games.toLocaleString("en-US")} games), each game predicted only from the games before it, Clutch's probabilities were ${vsE} by the accuracy score, which grades the probability itself. ${vsM}${winners}`;
}

function liveSection(m) {
  const r = m.record;
  if (!r) {
    return `<section class="panel" aria-labelledby="live"><h2 id="live">No graded calls yet this season.</h2><p class="sub">The regular season's first finals are graded the morning after. Until then this report has nothing live to say — and it won't borrow a number from the test below.</p></section>`;
  }
  const v = verdictOf(r);
  const rate = r.n >= RATE_FLOOR && r.hitRate != null;
  let html = `<section class="panel" aria-labelledby="live"><h2 id="live">This season, call by call, sealed before tip</h2>
<div class="stat"><div><span class="d">${r.n}</span><span class="mono">Graded calls</span></div><div><span class="d">${rec(r.hits, r.n)}</span><span class="mono">Right–wrong</span></div>${rate ? `<div><span class="d dec">${r.hitRate.toFixed(1)}%</span><span class="mono">${r.ci ? `Likely range ${Number(r.ci[0]).toFixed(1)}–${Number(r.ci[1]).toFixed(1)}%` : "Right"}</span></div>` : ""}<div><span class="mono ${v.tone === "win" ? "" : "ink3"}">${esc(v.line)}</span></div></div>`;
  if (!rate) html += `<p class="note gap">${esc(callWord(r.n))} is too few to say how good Clutch is: a rate needs ${RATE_FLOOR} at least, so until then every number on this page is printed as right–wrong. The page rebuilds every morning; the rates fill in as the season does.</p>`;
  for (const c of comparisons(r)) {
    const val = (x, recd) => (c.small ? recd : `${x.toFixed(1)}%`);
    html += `<div class="cmp gap"><div class="cmp-h"><span class="t">${esc(c.title)}</span><span class="mono">The same ${c.n} games</span></div>
<div class="crow"><span>Clutch</span>${c.small ? "<span></span>" : bar(c.us, "ink")}<span class="d v">${val(c.us, c.usRec)}</span></div>
<div class="crow"><span class="ink3">${esc(c.themLabel)}</span>${c.small ? "<span></span>" : bar(c.them, "dim")}<span class="d v">${val(c.them, c.themRec)}</span></div></div>`;
  }
  // The accuracy score (Brier) on the same games, once there are enough of them to read.
  const t = r.tracks;
  const scores = [["Clutch's call", t?.all_games?.clutch, true], ["ESPN BPI", t?.vs_espn?.espn_bpi], ["The market · final price", t?.with_line?.market]].filter(([, x]) => x?.brier != null && x.n >= RATE_FLOOR);
  if (scores.length > 1) {
    html += `<div class="scroll gap"><table class="tbl"><caption class="vh">Accuracy score this season, lower is better</caption><thead><tr><th scope="col">Number</th><th scope="col" class="num">Accuracy score</th><th scope="col" class="num">Games</th></tr></thead><tbody>${scores.map(([l, x, lead]) => `<tr><td${lead ? ' class="lead"' : ""}>${esc(l)}</td><td class="num">${b3(x.brier)}</td><td class="num">${x.n}</td></tr>`).join("")}</tbody></table></div><p class="note">The accuracy score (the Brier score) grades the probability itself, not just the side: lower is better, 0.250 is a coin flip.</p>`;
  }
  const notes = [];
  if (r.excluded) notes.push(`${r.excluded} more ${r.excluded === 1 ? "call is" : "calls are"} left out because ${r.excluded === 1 ? "it" : "they"} can't be proven to predate tip; the count is printed so the record can't quietly shrink.`);
  if (r.dateRange?.start) notes.push(`Graded games from ${mediumDate(r.dateRange.start)} to ${mediumDate(r.dateRange.end)}. Preseason is never graded.`);
  if (notes.length) html += `<p class="note gap">${notes.map(esc).join(" ")}</p>`;
  return html + `<p class="gap"><a class="more" href="/ledger/">Every graded call, in the Ledger →</a></p></section>`;
}

function calibrationSection(m) {
  const bands = (m.record ? m.ledger?.calibration ?? [] : []).filter((b) => b && b.n > 0);
  const intro = `<p class="sub">A 70% call should come true about 70 times in 100 — if Clutch's 70s win only half the time, the number is lying, however many games it gets right. So the season's calls are put in bands by the number Clutch gave the side it favoured, and each band is checked against what happened.</p>`;
  if (!bands.length) return `<section class="blk" aria-labelledby="cal"><h2 id="cal">When Clutch says 70%, does it happen 70%?</h2>${intro}<p class="note">The bands fill in from the first graded calls.</p></section>`;
  const readable = bands.filter((b) => b.n >= RATE_FLOOR && b.actual_pct != null);
  const best = readable.slice().sort((a, b) => b.n - a.n)[0];
  const lead = best
    ? `<p class="gap"><strong>Clutch said ${best.claimed_pct.toFixed(0)}% on average in its ${esc(bandLabel(best))} band; it happened ${best.actual_pct.toFixed(0)}% of the time</strong> (${best.hits} of ${best.n}, likely range ${best.ci_low_pct.toFixed(0)}–${best.ci_high_pct.toFixed(0)}%).</p>`
    : `<p class="note gap">No band holds ${RATE_FLOOR} calls yet, so each one shows how many came true rather than a rate.</p>`;
  const rows = bands.map((b) => {
    const ok = b.n >= RATE_FLOOR && b.actual_pct != null;
    return `<tr><td>${esc(bandLabel(b))}</td><td class="num">${b.n}</td><td class="num">${b.claimed_pct != null ? `${b.claimed_pct.toFixed(0)}%` : "—"}</td><td class="num${ok ? " amber" : ""}">${ok ? `${b.actual_pct.toFixed(0)}%` : `${b.hits} of ${b.n}`}</td><td class="num">${ok && b.ci_low_pct != null ? `${b.ci_low_pct.toFixed(0)}–${b.ci_high_pct.toFixed(0)}%` : "—"}</td></tr>`;
  }).join("");
  return `<section class="blk" aria-labelledby="cal"><h2 id="cal">When Clutch says 70%, does it happen 70%?</h2>${intro}${lead}
<div class="scroll gap"><table class="tbl"><caption class="vh">Calibration: Clutch's number against how often it came true, ${esc(m.current)}</caption><thead><tr><th scope="col">Clutch's band</th><th scope="col" class="num">Calls</th><th scope="col" class="num">Said</th><th scope="col" class="num">Happened</th><th scope="col" class="num">Likely range</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="note">Said is the average of Clutch's numbers in the band; Happened is how often that side won. A band shows its rate and likely range from ${RATE_FLOOR} calls.</p></section>`;
}

/** The test's seasons pooled into the live Ledger's four bands — only for the
 *  model the bands were counted on, so a retrained model never inherits them. */
export function backtestBands(version, cal = BACKTEST_CALIBRATION) {
  if (!version || cal?.version !== version) return null;
  const seasons = Object.keys(cal.seasons ?? {}).sort();
  const pooled = (cal.seasons[seasons[0]] ?? []).map((b, i) => {
    const xs = seasons.map((s) => cal.seasons[s][i]).filter((x) => x?.n);
    const n = xs.reduce((a, x) => a + x.n, 0), hits = xs.reduce((a, x) => a + x.hits, 0);
    const said = n ? xs.reduce((a, x) => a + x.claimed * x.n, 0) / n : null;
    const ci = wilson(hits, n);
    return { lo: b.lo, hi: b.hi, n, hits, said: said == null ? null : said * 100, happened: n ? (hits / n) * 100 : null, ciLow: ci?.[0], ciHigh: ci?.[1] };
  }).filter((b) => b.n >= RATE_FLOOR);
  return pooled.length ? { seasons, bands: pooled } : null;
}

/** Did the test's numbers come true? One sentence read off the bands, then the bands. */
function backtestBandsBlock(m) {
  const t = backtestBands(m.accuracy?.current_version);
  if (!t) return "";
  const games = t.bands.reduce((a, b) => a + b.n, 0);
  const gap = Math.max(...t.bands.map((b) => Math.abs(b.happened - b.said)));
  const inside = t.bands.every((b) => b.said >= b.ciLow && b.said <= b.ciHigh);
  const lead = `Across the test's ${games.toLocaleString("en-US")} games, every band came true within ${gap.toFixed(1)} points of what Clutch said${inside ? ", each inside its likely range" : ""}.`;
  const rows = t.bands.map((b) => `<tr><td>${esc(bandLabel(b))}</td><td class="num">${b.n.toLocaleString("en-US")}</td><td class="num">${b.said.toFixed(1)}%</td><td class="num amber">${b.happened.toFixed(1)}%</td><td class="num">${b.ciLow.toFixed(0)}–${b.ciHigh.toFixed(0)}%</td></tr>`).join("");
  return `<h3 class="side-h gap">When the test said 70%, did it happen 70%?</h3>
<p><strong>${esc(lead)}</strong></p>
<div class="scroll gap"><table class="tbl"><caption class="vh">Calibration in the walk-forward test, ${esc(t.seasons.join(" and "))}</caption><thead><tr><th scope="col">Clutch's band</th><th scope="col" class="num">Games</th><th scope="col" class="num">Said</th><th scope="col" class="num">Happened</th><th scope="col" class="num">Likely range</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="note">The same bands as the live table above, counted the same way on the side Clutch favoured, over both test seasons together. A replay, so it says how the method holds up; the live bands say how this season's sealed numbers do.</p>`;
}

function backtestSection(m) {
  const bench = m.accuracy?.benchmark ?? {};
  const seasons = Object.keys(bench).sort().reverse();
  if (!seasons.length) return "";
  const rows = [["Clutch's call", "clutch", true], ["ESPN BPI", "espn_bpi"], ["The market · final price", "market"], ["Always the home team", "always_home"]];
  const head = seasons.map((s) => `<th scope="col" class="num">${esc(s)} right</th><th scope="col" class="num">Score</th>`).join("");
  const body = rows.map(([l, k, lead]) => `<tr><td${lead ? ' class="lead"' : ""}>${esc(l)}</td>${seasons.map((s) => { const x = bench[s].tracks?.[k]; return `<td class="num">${pc1(x?.acc)}</td><td class="num">${b3(x?.brier)}</td>`; }).join("")}</tr>`).join("");
  const sentence = backtestSentence(bench);
  return `<section class="blk" aria-labelledby="test"><span class="kick">Before it shipped · A replay, not the live record</span><h2 id="test">The two-season test</h2>
<p>${esc(sentence)} Nobody publishing an NBA model reliably beats the market, and Clutch doesn't claim to.</p>
<div class="scroll gap"><table class="tbl"><caption class="vh">The walk-forward test: share of winners right and accuracy score, by season</caption><thead><tr><th scope="col">Number</th>${head}</tr></thead><tbody>${body}</tbody></table></div>
<p class="note">${seasons.map((s) => `${s}: ${bench[s].n.toLocaleString("en-US")} games`).join(" · ")}. Right is the share of games where the side given over 50% won; Score is the accuracy score (lower is better). Every game was predicted by a model fit only on earlier games, then graded on the same games as ESPN BPI and the market's final price before tip. This test chose the model; it is not its record. <a href="/how-it-works/">The full test and the model's limits →</a></p>
${backtestBandsBlock(m)}</section>`;
}

function lastSeasonLine(m) {
  const l = m.last;
  if (!l || !l.n) return "";
  const home = l.homeRate != null ? Math.round((l.homeRate * l.n) / 100) : null;
  return `<section class="blk" aria-labelledby="last"><h2 id="last">Last season's live record</h2><p>In ${esc(l.season)}${l.retired ? ", made by the model Clutch has since retired," : ""} the Ledger graded ${esc(callWord(l.n))}: ${rec(l.hits, l.n)}${l.n >= RATE_FLOOR && l.hitRate != null ? ` (${l.hitRate.toFixed(1)}%)` : ""}${home != null ? `, against ${rec(home, l.n)} for picking the home team on the same games` : ""}. It stays on the Ledger exactly as graded.</p></section>`;
}

function questions(m) {
  const r = m.record;
  const sentence = backtestSentence(m.accuracy?.benchmark);
  const qa = [
    ["How accurate is Clutch?", r
      ? `This season Clutch is ${rec(r.hits, r.n)} on ${callWord(r.n)} graded after the final${r.n >= RATE_FLOOR && r.hitRate != null ? `, ${r.hitRate.toFixed(1)}% right` : " — too few yet for a rate"}. Picking the home team every night went ${rec(Math.round(((r.homeRate ?? 0) * r.n) / 100), r.n)} on the same games.`
      : "The season's first calls are graded the morning after its first finals; this page fills in from then."],
    ["Is Clutch more accurate than ESPN BPI?", sentence ? `In the test it had to pass before it shipped: ${sentence} Live, this season's games are graded beside ESPN BPI on the Ledger.` : "Live, this season's games are graded beside ESPN BPI on the Ledger."],
    ...(() => {
      const t = backtestBands(m.accuracy?.current_version);
      if (!t) return [];
      const worst = Math.max(...t.bands.map((b) => Math.abs(b.happened - b.said)));
      const games = t.bands.reduce((a, b) => a + b.n, 0);
      return [["Are Clutch's probabilities calibrated?", `In the two-season test (${games.toLocaleString("en-US")} games), each band of Clutch's numbers came true within ${worst.toFixed(1)} points of what it said: its ${t.bands.map((b) => `${bandLabel(b)} calls averaged ${b.said.toFixed(0)}% and won ${b.happened.toFixed(0)}%`).join("; ")}. This season's live bands are rebuilt every morning above.`]];
    })(),
    ["How is a call graded?", "Clutch's number for every game is sealed in a public file on GitHub before tip-off and graded after the final against that same number. The side it gives over 50% is its call. Right and wrong calls stay on the record, in date order."],
  ];
  return `<section aria-labelledby="faq"><h2 class="sh" id="faq">Questions</h2>${qa.map(([q, a]) => `<div class="blk gap"><h3 class="side-h">${esc(q)}</h3><p>${esc(a)}</p></div>`).join("")}</section>`;
}

export function accuracyPage(m) {
  const r = m.record;
  const updated = m.ledgerAt ? m.ledgerAt.slice(0, 10) : null;
  const deck = r && r.n < RATE_FLOOR
    ? `Only ${callWord(r.n)} graded so far this season — too early to judge, and this page says so. It rebuilds every morning from the Ledger: the record, how often each number came true, and the same games for ESPN, the market and the home team.`
    : "Rebuilt every morning from the Ledger: the season's graded calls, how often each number came true, and the same games for ESPN BPI, the market and picking the home team every night.";
  const body = `<div class="wrap r"><div class="rhead"><span class="kick">Accuracy · ${esc(m.current)}${updated ? ` · Updated ${esc(mediumDate(updated))}` : ""}</span><h1 class="rh1">How accurate is Clutch?</h1><p class="rdeck">${esc(deck)}</p></div>
<div class="body">
${liveSection(m)}
${calibrationSection(m)}
${backtestSection(m)}
${lastSeasonLine(m)}
${questions(m)}
<section class="blk" aria-labelledby="src"><h2 id="src">Where these numbers come from</h2><p>Every number Clutch publishes is sealed with a SHA-256 fingerprint in <a href="${RECEIPTS_REPO}">a public repository</a> before tip, and the Ledger grades that sealed number after the final. This page is rebuilt from the Ledger every morning; nothing on it is typed by hand. <a href="/receipts/">How to check a seal yourself →</a></p><p>${DATA_LICENSE_LINE} Scores are public record; ESPN BPI and market figures belong to their sources. <a href="/data/">Download every number as JSON or CSV →</a></p></section>
</div></div>`;
  const title = "How accurate is Clutch? NBA predictions, graded · Clutch";
  const description = r
    ? `Clutch's ${r.season} NBA accuracy, rebuilt every morning: ${rec(r.hits, r.n)} on ${callWord(r.n)}, calibration by band, beside ESPN BPI, the market and the home team.`
    : `How accurate Clutch's NBA win probabilities are: the live record, calibration by band, and the two-season test against ESPN BPI and the market.`;
  const ld = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `Clutch NBA prediction accuracy, ${m.current}`,
    description: `Clutch's pre-tip NBA win probabilities, each sealed in a public repository before tip-off and graded after the final: graded calls, right and wrong, calibration by probability band, and the same games for ESPN BPI, the market's final price and picking the home team.`,
    url: ORIGIN + PATH,
    creator: { "@type": "Organization", name: "Clutch", url: ORIGIN + "/" },
    isAccessibleForFree: true,
    license: DATA_LICENSE_URL,
    isBasedOn: RECEIPTS_REPO,
    keywords: ["NBA", "basketball", "win probability", "prediction accuracy", "calibration", "Brier score", "ESPN BPI"],
    variableMeasured: ["graded calls", "calls right", "calibration by probability band", "Brier score"],
    measurementTechnique: "Each pre-tip win probability is sealed with a SHA-256 fingerprint in a public GitHub repository before tip-off and graded against the final score.",
    ...(updated ? { dateModified: updated } : {}),
    ...(r?.dateRange?.start ? { temporalCoverage: `${r.dateRange.start}/${r.dateRange.end}` } : {}),
  };
  return { path: PATH, title, html: page({ path: PATH, title, description, body, current: "ledger", og: "ledger", jsonld: ld }) };
}
