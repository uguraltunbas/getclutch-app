// How two teams come into a game, as of a date: this season's regular-season
// record (the play-in left out), at home and on the road, the last 5 and 10,
// the streak, the average margin, days of rest, Clutch's graded calls on each
// team's games, last season's record, and when the two last met. Every cell is
// a number from the games table or the Ledger, so each game page and each
// head-to-head page carries facts only it has (search engines treat template
// text repeated across hundreds of pages as thin; Bing indexed 8 of 335 on
// 2026-10-30). The game pages print it as of their own date, so a graded
// page keeps saying how the teams came in, not how they stand today.

import { esc } from "./html.mjs";
import { rec } from "./copy.mjs";
import { mediumDate } from "./time.mjs";
import { chanceText } from "./pages/playoffs.mjs";

const DAY = 86400e3;
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

/** One team's form before `before` (an ET date, not counted). */
export function formOf(m, t, before) {
  const finals = m.thisSeason
    .filter((g) => g.seasonType === "Regular Season" && !g.playIn && g.date < before && (g.home.id === t.id || g.away.id === t.id))
    .sort((x, y) => x.date.localeCompare(y.date));
  const games = finals.map((g) => {
    const isHome = g.home.id === t.id;
    const us = isHome ? g.homeScore : g.awayScore, them = isHome ? g.awayScore : g.homeScore;
    return { isHome, won: us > them, margin: us - them, us, them };
  });
  const tally = (xs) => ({ w: xs.filter((x) => x.won).length, l: xs.filter((x) => !x.won).length });
  let streak = 0;
  for (let i = games.length - 1; i >= 0 && games[i].won === games[games.length - 1].won; i--) streak++;
  // Rest: the last game this team played before the date, preseason and postponed games left out.
  const prior = m.games
    .filter((g) => !g.preseason && g.status !== "postponed" && g.date < before && (g.home.id === t.id || g.away.id === t.id))
    .map((g) => g.date).sort().at(-1) ?? null;
  const calls = m.calls.filter((c) => c.season === m.current && c.season_type !== "Preseason" && c.game_date < before && String(c.matchup).split(" @ ").includes(t.abbreviation));
  // Last season's regular season (matchups.mjs recordIn, without importing the page).
  const prev = m.lastSeason.filter((g) => g.seasonType === "Regular Season" && !g.playIn && (g.home.id === t.id || g.away.id === t.id));
  const prevWins = prev.filter((g) => (g.home.id === t.id) === g.homeScore > g.awayScore).length;
  return {
    n: games.length,
    ...tally(games),
    home: tally(games.filter((x) => x.isHome)),
    road: tally(games.filter((x) => !x.isHome)),
    last5: games.length > 5 ? tally(games.slice(-5)) : null,
    last10: games.length > 10 ? tally(games.slice(-10)) : null,
    streak: games.length ? { won: games.at(-1).won, n: streak } : null,
    margin: games.length ? games.reduce((s, x) => s + x.margin, 0) / games.length : null,
    scored: games.length ? games.reduce((s, x) => s + x.us, 0) / games.length : null,
    allowed: games.length ? games.reduce((s, x) => s + x.them, 0) / games.length : null,
    rest: prior ? days(prior, before) - 1 : null,
    id: t.id,
    calls: { right: calls.filter((c) => c.correct).length, n: calls.length },
    prev: { w: prevWins, l: prev.length - prevWins },
  };
}

const wl = (x) => `${x.w}–${x.l}`;
const signed = (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}`;
const restWords = (d) => (d === 0 ? "Back-to-back" : d === 1 ? "1 day" : `${d} days`);
const ordinal = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;

/** Where a team's average margin ranks in the league before the date (teams with a final only): "4th of 30", or null. */
function marginRank(m, t, before) {
  const all = m.raw.teams.map((x) => ({ id: x.id, f: formOf(m, x, before) })).filter((x) => x.f.n);
  const me = all.find((x) => x.id === t.id);
  if (!me) return null;
  return `${ordinal(1 + all.filter((x) => x.f.margin > me.f.margin).length)} of ${all.length}`;
}

/**
 * The form table, away on the left and home on the right. `before` is the date
 * the form is taken on; `heading` the section's title. Empty when neither team
 * has a final this season or last.
 */
export function formSection(m, away, home, before, { heading, id = "form", note = "", chance = false } = {}) {
  const a = formOf(m, away, before), h = formOf(m, home, before);
  if (!a.n && !h.n && !(a.prev.w + a.prev.l) && !(h.prev.w + h.prev.l)) return "";
  const rows = [];
  const row = (label, f) => rows.push(`<tr><th scope="row">${esc(label)}</th><td>${esc(f(a))}</td><td>${esc(f(h))}</td></tr>`);
  if (a.n || h.n) {
    row("Record", wl);
    row("At home", (x) => wl(x.home));
    row("On the road", (x) => wl(x.road));
    if (a.last10 && h.last10) row("Last 10", (x) => wl(x.last10));
    else if (a.last5 && h.last5) row("Last 5", (x) => wl(x.last5));
    row("Streak", (x) => (x.streak ? `${x.streak.won ? "Won" : "Lost"} ${x.streak.n}` : "--"));
    row("Points scored", (x) => (x.n ? x.scored.toFixed(1) : "--"));
    row("Points allowed", (x) => (x.n ? x.allowed.toFixed(1) : "--"));
    row("Average margin", (x) => (x.margin == null ? "--" : `${signed(x.margin)} pts`));
    const ranks = { [away.id]: marginRank(m, away, before), [home.id]: marginRank(m, home, before) };
    row("Margin rank", (x) => ranks[x.id] ?? "--");
    row("Rest", (x) => (x.rest == null ? "--" : restWords(x.rest)));
    if (a.calls.n || h.calls.n) row("Clutch on their games", (x) => (x.calls.n ? rec(x.calls.right, x.calls.n) : "--"));
  }
  // The season board's playoff chance is today's, so only a page that speaks for today prints it.
  const pc = Object.fromEntries((m.seasonBoard?.teams ?? []).map((r) => [r.team_id, r.playoff_pct]));
  if (chance && (pc[away.id] != null || pc[home.id] != null)) row("Playoff chance", (x) => chanceText(pc[x.id]));
  if (a.prev.w + a.prev.l || h.prev.w + h.prev.l) row(`${m.prevSeason ?? "Last season"} record`, (x) => wl(x.prev));
  const met = lastMeeting(m, away, home, before);
  const lines = [met, note].filter(Boolean).join(" ");
  return `<section aria-labelledby="${id}"><h2 class="sh s" id="${id}">${esc(heading)}</h2>
<div class="scroll"><table class="tbl form"><thead><tr><th scope="col"><span class="vh">Before ${esc(mediumDate(before))}</span></th><th scope="col" class="num">${esc(away.abbreviation)}</th><th scope="col" class="num">${esc(home.abbreviation)}</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>
${lines ? `<p class="note gap">${esc(lines)}</p>` : ""}</section>`;
}

/** "They last met on Apr 2, 2026: Rockets 112, Knicks 104 in Houston." or "". */
export function lastMeeting(m, x, y, before) {
  const pair = (g) => (g.home.id === x.id && g.away.id === y.id) || (g.home.id === y.id && g.away.id === x.id);
  const g = [...m.thisSeason, ...m.lastSeason].filter((g) => pair(g) && g.date < before).sort((p, q) => p.date.localeCompare(q.date)).at(-1);
  if (!g) return "";
  const homeWon = g.homeScore > g.awayScore;
  const [w, ws, l, ls] = homeWon ? [g.home, g.homeScore, g.away, g.awayScore] : [g.away, g.awayScore, g.home, g.homeScore];
  const where = g.neutral ? "" : ` in ${g.home.arena_city || g.home.city}`;
  const ot = g.period > 4 ? ` (${g.period === 5 ? "overtime" : `${g.period - 4} overtimes`})` : "";
  const stage = g.playIn ? ", in the play-in" : g.seasonType === "Playoffs" ? ", in the playoffs" : "";
  return `They last met on ${mediumDate(g.date)}: ${w.nickname} ${ws}, ${l.nickname} ${ls}${where}${ot}${stage}.`;
}
