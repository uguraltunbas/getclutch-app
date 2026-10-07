// Game pieces shared by the front page, the game pages and the team pages:
// the scoreboard (the instrument), a Tonight card, status and score text.

import { esc, rail, playGame } from "./html.mjs";
import { pct, callPoints, liveLabel, finalLabel, plainDriverLabel } from "./copy.mjs";
import { timeET, tipShort } from "./time.mjs";

/** "TIP 7:00 PM ET", "Q3 4:22", "FINAL", "POSTPONED". */
export function statusText(g, short = false) {
  if (g.status === "postponed") return "POSTPONED";
  if (g.status === "final") return finalLabel(g.period);
  if (g.status === "live" || g.status === "halftime") return liveLabel(g.status, g.period, g.clock);
  const t = short ? tipShort(g.tipUtc) : timeET(g.tipUtc);
  return t ? (short ? t : `TIP ${t}`).toUpperCase() : "TIP TBD";
}

/** "MIA 99 · TOR 104" (away first), or "". */
export const scoreLine = (g) => (g.homeScore == null ? "" : `${g.away.abbreviation} ${g.awayScore} · ${g.home.abbreviation} ${g.homeScore}`);

const teamCls = (g) => `a-${g.away.abbreviation} h-${g.home.abbreviation}`;
const appGame = (g) => playGame(g.id);

/** What one grade reads like, as a chip. */
export function gradeChip(g) {
  switch (g.grade) {
    case "right": return '<span class="chip win">RIGHT</span>';
    case "missed": return '<span class="chip loss">MISSED</span>';
    case "preseason": return '<span class="chip">PRESEASON · NOT GRADED</span>';
    case "pending": return '<span class="chip">GRADED OVERNIGHT</span>';
    case "ungraded": return '<span class="chip">NOT GRADED</span>';
    case "postponed": return '<span class="chip">POSTPONED</span>';
    default: return "";
  }
}

/**
 * The instrument — black glass in both editions (class "gl"): both teams,
 * Clutch's number big for the side it favours, the LED rail (amber =
 * Clutch, the cream segment = the market), the legend, and the two call
 * buttons (or the final). `tour`: the front page's guide hooks — data-tour on
 * a plain wrapper round the head, numbers and rail (layout-neutral: .board>*
 * only sets position) and on the call buttons, only where they are there.
 */
export function board(g, { kicker = "THE CALL", link = null, headingLevel = 0, tour = false } = {}) {
  const s = g.side;
  const favHome = s ? s.isHome : true;
  const awayPct = s ? pct(1 - g.homeProb) : null, homePct = s ? pct(g.homeProb) : null;
  const num = (p, big) => (p == null ? '<span class="pc lo">--</span>' : big ? `<span class="pc hi">${p}<small>%</small></span>` : `<span class="pc lo">${p}</span>`);
  const nm = (t, where) => `<span class="nm">${esc(t.nickname.toUpperCase())} · ${where}</span>`;
  const live = g.status === "live" || g.status === "halftime";
  const final = g.status === "final";
  const sealedAt = g.receipt?.state === "sealed" ? `SEALED ${timeET(g.receipt.seal.committedAt).replace(" ET", "")} ET` : g.preseason ? "PRESEASON" : "";
  const legend = !g.hasCall
    ? "<span>NO NUMBER YET · IT LANDS THE MORNING OF THE GAME</span>"
    : `<span><b class="amber">CLUTCH ${esc(s.team.abbreviation)} ${pct(s.prob)}</b> · <b class="cream">${g.marketSide == null ? (g.marketState === "none" ? "NO MARKET NUMBER" : "MARKET —") : `MARKET ${pct(g.marketSide)}`}</b></span>${sealedAt ? `<span>${sealedAt}</span>` : ""}`;
  let foot;
  if (final || live) {
    foot = `<div class="bfinal"><span class="d" data-live="sc">${esc(scoreLine(g))}</span>${final ? gradeChip(g) : '<span class="chip hot">LIVE</span>'}</div>`;
  } else if (g.status === "postponed") {
    foot = `<div class="bfinal"><span class="d">POSTPONED</span><span class="chip">NOTHING TO GRADE</span></div>`;
  } else if (g.hasCall) {
    const pa = callPoints(1 - g.homeProb), ph = callPoints(g.homeProb);
    const btn = (t, pts, fav) => `<a class="cbtn${fav ? "" : " ghost"}" href="${appGame(g)}">CALL ${esc(t.abbreviation)} · ${pts}<span class="vh"> points if right: call the ${esc(t.nickname)} in the app</span></a>`;
    foot = `<div class="bcall"${tour ? ' data-tour="call"' : ""}>${btn(g.away, pa, !favHome)}${btn(g.home, ph, favHome)}</div>`;
  } else {
    foot = `<div class="bcall"${tour ? ' data-tour="call"' : ""}><a class="cbtn ghost wide" href="${appGame(g)}">CALL IT IN THE APP</a></div>`;
  }
  const head = link ? `<a class="bk" href="${link}">${kicker}</a>` : `<span class="bk">${kicker}</span>`;
  return `<div class="board gl ${teamCls(g)}${live ? " is-live" : ""}" data-gid="${g.id}" data-a="${g.away.abbreviation}" data-h="${g.home.abbreviation}"><span class="rs" aria-hidden="true"></span>
${tour && s ? '<div data-tour="num">' : ""}<div class="bhead">${headingLevel ? `<h${headingLevel} class="bk-h">${head}</h${headingLevel}>` : head}<span class="amber" data-live="st">${esc(statusText(g))}</span></div>
<div class="bteams">
<div class="side"><span class="ab">${esc(g.away.abbreviation)}</span>${nm(g.away, "AWAY")}${num(awayPct, !favHome && !!s)}</div>
<div class="side r"><span class="ab">${esc(g.home.abbreviation)}</span>${nm(g.home, "HOME")}${num(homePct, favHome && !!s)}</div>
</div>
<div class="brail">${rail(s ? s.prob : null, g.marketSide)}<div class="legend">${legend}</div></div>${tour && s ? "</div>" : ""}
${foot}
</div>`;
}

/** One line under a Tonight card's number. */
export function cardLine(g) {
  if (g.status === "postponed") return "Postponed. Nothing to seal or grade.";
  if (g.status === "final") {
    if (!g.hasCall) return "Final.";
    const had = `Clutch had the ${g.side.team.nickname} at ${pct(g.side.prob)}.`;
    return g.grade === "right" ? `${had} It held.` : g.grade === "missed" ? `${had} It missed.` : g.preseason ? `${had} Preseason: not graded.` : had;
  }
  if (g.status === "live" || g.status === "halftime") return g.hasCall ? `Live. Clutch had the ${g.side.team.nickname} at ${pct(g.side.prob)} before tip.` : "Live.";
  if (!g.hasCall) return "Clutch's number lands the morning of the game.";
  if (g.preseason) return "Preseason: the number sits near 50/50.";
  if (g.differs) return `The market differs: it has ${g.side.other.nickname} at ${pct(g.side.isHome ? 1 - g.market : g.market)}.`;
  if (g.reasons[0]) return g.reasons[0].label + ".";
  return "";
}

/**
 * Does a card's line say why the number is what it is? (The front page's
 * guide points at it: a reason, or the preseason's near-50/50 — not a score,
 * the market's other side, or a number still to come.)
 */
export const lineIsWhy = (g) => g.status === "scheduled" && g.hasCall && (g.preseason || (!g.differs && !!g.reasons[0]));

/** A Tonight card (a link to the game page). `why`: the guide's hook on its line. */
export function gameCard(g, why = false) {
  const live = g.status === "live" || g.status === "halftime";
  const final = g.status === "final";
  const cls = `gcard ${teamCls(g)}${live ? " is-live" : g.differs && !final ? " differs" : ""}`;
  const big = final || live
    ? `<span class="d n cream" data-live="sc" data-fmt="dash">${g.homeScore == null ? "--" : `${g.awayScore}–${g.homeScore}`}</span>`
    : `<span data-live="pre">${g.hasCall ? `<span class="d n">${pct(g.side.prob)}</span> <span class="d s">${esc(g.side.team.abbreviation)}</span>` : '<span class="d n dim">--</span>'}</span><span class="d n cream" data-live="sc" data-fmt="dash" hidden></span>`;
  const cta = final ? "THE RESULT →" : live ? "FOLLOW IT →" : g.status === "postponed" ? "DETAILS →" : "CALL IT →";
  return `<a class="${cls}" href="${g.path}" data-gid="${g.id}" data-a="${g.away.abbreviation}" data-h="${g.home.abbreviation}">
<span class="gtop"><span class="d m">${esc(g.away.abbreviation)} @ ${esc(g.home.abbreviation)}</span><span class="d t" data-live="st">${esc(statusText(g, true))}</span></span>
<span class="gnum">${big}</span>
${rail(g.side ? g.side.prob : null, g.marketSide, true)}
<span class="gline"${why === true ? ' data-tour="why"' : ""}>${esc(cardLine(g))}</span>
<span class="mono cta">${cta}</span>
</a>`;
}

export { plainDriverLabel };
