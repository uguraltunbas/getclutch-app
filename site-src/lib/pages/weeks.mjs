// /ledger/weeks/<monday>/ — one week of graded calls (Monday to Sunday, the
// ET game dates): the record, how many wins Clutch's numbers expected, the
// most confident hit and the biggest miss, picking the home team on the same
// games, and every call. Regular season and playoffs only (preseason is never
// graded). A finished week never changes; the current one fills in daily.

import { page, esc, ORIGIN } from "../html.mjs";
import { rec } from "../copy.mjs";
import { shortDate, mediumDate, shift } from "../time.mjs";

/** The Monday of an ISO date's week. */
export function mondayOf(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  return shift(iso, -((d.getUTCDay() + 6) % 7));
}

export const weekPath = (monday) => `/ledger/weeks/${monday}/`;

/** Graded calls of the current season by week: [{ monday, sunday, calls }], newest first. */
export function weeksOf(m) {
  const by = new Map();
  for (const c of m.calls) {
    if (c.season_type === "Preseason" || (c.season && c.season !== m.current)) continue;
    const k = mondayOf(c.game_date);
    (by.get(k) ?? by.set(k, []).get(k)).push(c);
  }
  return [...by].sort((a, b) => b[0].localeCompare(a[0])).map(([monday, calls]) => ({ monday, sunday: shift(monday, 6), calls: calls.slice().sort((x, y) => (x.game_date + x.tip_utc).localeCompare(y.game_date + y.tip_utc)) }));
}

const homeWon = (c) => { const [a, h] = c.final.split("-").map(Number); return h > a; };

function weekPage(w, m, prev, next) {
  const { calls, monday, sunday } = w;
  const right = calls.filter((c) => c.correct).length;
  const expected = calls.reduce((a, c) => a + c.claimed_pct / 100, 0);
  const home = calls.filter(homeWon).length;
  const hits = calls.filter((c) => c.correct).sort((a, b) => b.claimed_pct - a.claimed_pct);
  const misses = calls.filter((c) => !c.correct).sort((a, b) => b.claimed_pct - a.claimed_pct);
  const done = sunday < m.today;
  const span = `${shortDate(monday)}–${shortDate(sunday)}`;
  const gameLink = (c) => { const g = m.gameById[c.game_id]; const name = esc(c.matchup.replace(" @ ", " at ")); return g?.path ? `<a href="${g.path}">${name}</a>` : name; };
  const moments = [
    hits[0] ? `<p><strong>Most confident hit:</strong> ${gameLink(hits[0])}, ${esc(shortDate(hits[0].game_date))}: ${esc(hits[0].pick)} at ${Math.round(hits[0].claimed_pct)}%, final ${esc(hits[0].final.replace("-", "–"))}.</p>` : "",
    misses[0] ? `<p><strong>Biggest miss:</strong> ${gameLink(misses[0])}, ${esc(shortDate(misses[0].game_date))}: ${esc(misses[0].pick)} at ${Math.round(misses[0].claimed_pct)}%, final ${esc(misses[0].final.replace("-", "–"))}.</p>` : "<p><strong>No misses this week.</strong></p>",
  ].join("");
  const diff = right - expected;
  const verdict = Math.abs(diff) < 0.75 ? "about what its numbers expected" : diff > 0 ? "more than its numbers expected" : "fewer than its numbers expected";
  const rows = calls.map((c) => `<div class="callrow"><span class="mono">${esc(shortDate(c.game_date).toUpperCase())}</span><span>${gameLink(c)} <span class="mono hide-xs">· ${esc(c.final.replace("-", "–"))}${c.season_type === "Playoffs" ? " · PLAYOFFS" : ""}</span></span><span class="d">${esc(c.pick)} ${Math.round(c.claimed_pct)}</span><span>${c.correct ? '<span class="chip win">RIGHT</span>' : '<span class="chip loss">MISSED</span>'}</span></div>`).join("");
  const nav = [prev ? `<a href="${weekPath(prev)}">← WEEK OF ${esc(shortDate(prev).toUpperCase())}</a>` : "", `<a href="/ledger/">THE LEDGER</a>`, next ? `<a href="${weekPath(next)}">WEEK OF ${esc(shortDate(next).toUpperCase())} →</a>` : ""].filter(Boolean).join(" · ");
  const body = `<div class="wrap r"><div class="rhead"><span class="kick">THE LEDGER · ${esc(m.current)} · WEEK OF ${esc(mediumDate(monday).toUpperCase())}${done ? "" : " · SO FAR"}</span><h1 class="rh1">${rec(right, calls.length)} for the week.</h1><p class="rdeck">Clutch's graded NBA calls for ${esc(span)}: ${right} right of ${calls.length}, ${verdict} (${expected.toFixed(1)}). Picking the home team went ${rec(home, calls.length)} on the same games.</p>
<div class="stat gap"><div><span class="d">${rec(right, calls.length)}</span><span class="mono">RIGHT–WRONG</span></div><div><span class="d">${expected.toFixed(1)}</span><span class="mono">WINS ITS NUMBERS EXPECTED</span></div><div><span class="d">${rec(home, calls.length)}</span><span class="mono">ALWAYS HOME</span></div></div></div>
<div class="body">
<section class="blk" aria-labelledby="moments"><h2 id="moments">The week in two calls</h2>${moments}</section>
<section aria-labelledby="calls"><h2 class="sh" id="calls">Every call</h2>${rows}<p class="note gap">Each number was sealed in public before tip and graded after the final. A week is a small sample: ${calls.length} games say little about how good a forecast is. <a href="/accuracy/">The season, band by band →</a></p></section>
<p class="mono">${nav}</p>
</div></div>`;
  const path = weekPath(monday);
  const title = `NBA week of ${mediumDate(monday)}: Clutch's calls graded, ${rec(right, calls.length)} · Clutch`;
  const description = `Clutch's graded NBA calls for ${span}${done ? "" : " so far"}: ${rec(right, calls.length)}, against ${expected.toFixed(1)} expected wins and ${rec(home, calls.length)} for always picking the home team.`;
  return { path, title, html: page({ path, title, description, body, current: "ledger", og: "ledger" }) };
}

export function weekPages(m) {
  const weeks = weeksOf(m);
  return weeks.map((w, i) => weekPage(w, m, weeks[i + 1]?.monday ?? null, weeks[i - 1]?.monday ?? null));
}
