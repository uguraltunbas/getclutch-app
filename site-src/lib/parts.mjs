// Game pieces shared by the front page, the game pages and the team pages:
// the scoreboard (the instrument), a Tonight card, status and score text.

import { esc, rail, playGame } from "./html.mjs";
import { pct, callPoints, liveLabel, finalLabel, plainDriverLabel } from "./copy.mjs";
import { timeET, tipShort } from "./time.mjs";

/** "TIP 7:00 PM ET", "Q3 4:22", "FINAL", "POSTPONED". */
export function statusText(g, short = false) {
  if (g.status === "postponed") return "Postponed";
  if (g.status === "final") return finalLabel(g.period);
  if (g.status === "live" || g.status === "halftime") return liveLabel(g.status, g.period, g.clock);
  const t = short ? tipShort(g.tipUtc) : timeET(g.tipUtc);
  return t ? (short ? t : `Tip ${t}`) : "Tip TBD";
}

/** "MIA 99 · TOR 104" (away first), or "". */
export const scoreLine = (g) => (g.homeScore == null ? "" : `${g.away.abbreviation} ${g.awayScore} · ${g.home.abbreviation} ${g.homeScore}`);

const teamCls = (g) => `a-${g.away.abbreviation} h-${g.home.abbreviation}`;
const appGame = (g) => playGame(g.id);

/** Does tonight (today, New York) still have a game to call? The main action's words follow it (html.mjs playWords). */
export const tonightOpen = (m) => m.tonight === m.today && (m.nights[m.tonight] ?? []).some((g) => g.status !== "final" && g.status !== "postponed");

/** What one grade reads like, as a chip. */
export function gradeChip(g) {
  switch (g.grade) {
    case "right": return '<span class="chip win">✓ Right</span>';
    case "missed": return '<span class="chip loss">✗ Wrong</span>';
    case "preseason": return '<span class="chip">Preseason · Not graded</span>';
    case "pending": return '<span class="chip">Graded overnight</span>';
    case "ungraded": return '<span class="chip">Not graded</span>';
    case "postponed": return '<span class="chip">Postponed</span>';
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
export function board(g, { kicker = "The call", link = null, headingLevel = 0, tour = false } = {}) {
  const s = g.side;
  const favHome = s ? s.isHome : true;
  const awayPct = s ? pct(1 - g.homeProb) : null, homePct = s ? pct(g.homeProb) : null;
  const num = (p, big) => (p == null ? '<span class="pc lo">--</span>' : big ? `<span class="pc hi">${p}<small>%</small></span>` : `<span class="pc lo">${p}</span>`);
  const nm = (t, where) => `<span class="nm">${esc(t.nickname)} · ${where}</span>`;
  const live = g.status === "live" || g.status === "halftime";
  const final = g.status === "final";
  const sealedAt = g.receipt?.state === "sealed" ? `Sealed ${timeET(g.receipt.seal.committedAt).replace(" ET", "")} ET` : g.preseason ? "Preseason" : "";
  const legend = !g.hasCall
    ? "<span>No number yet: it lands the morning of the game</span>"
    : `<span><b class="amber">Clutch ${esc(s.team.abbreviation)} ${pct(s.prob)}</b> · <b class="cream">${g.marketSide == null ? (g.marketState === "none" ? "No market number" : "Market —") : `Market ${pct(g.marketSide)}`}</b></span>${sealedAt ? `<span>${sealedAt}</span>` : ""}`;
  let foot;
  if (final || live) {
    foot = `<div class="bfinal"><span class="d" data-live="sc">${esc(scoreLine(g))}</span>${final ? gradeChip(g) : '<span class="chip hot">Live</span>'}</div>`;
  } else if (g.status === "postponed") {
    foot = `<div class="bfinal"><span class="d">Postponed</span><span class="chip">Nothing to grade</span></div>`;
  } else if (g.hasCall) {
    // One look for both sides (UI/UX study, 2026-10-28): a fill means only "Your call" (the
    // app's), so Clutch's side is the small amber tag, not a filled button. Away left, home right.
    const pa = callPoints(1 - g.homeProb), ph = callPoints(g.homeProb);
    const btn = (t, pts, fav) => `<a class="cbtn" href="${appGame(g)}"><b><span class="vh">Call the </span>${esc(t.nickname)}</b><span class="pts">+${pts} pts if right</span>${fav ? `<span class="cl">Clutch's call</span>` : ""}</a>`;
    foot = `<div class="bcall"${tour ? ' data-tour="call"' : ""}>${btn(g.away, pa, !favHome)}${btn(g.home, ph, favHome)}</div>`;
  } else {
    foot = `<div class="bcall"${tour ? ' data-tour="call"' : ""}><a class="cbtn wide" href="${appGame(g)}"><b>Call it in the app</b></a></div>`;
  }
  const head = link ? `<a class="bk" href="${link}">${kicker}</a>` : `<span class="bk">${kicker}</span>`;
  return `<div class="board gl ${teamCls(g)}${live ? " is-live" : ""}" data-gid="${g.id}" data-a="${g.away.abbreviation}" data-h="${g.home.abbreviation}"><span class="rs" aria-hidden="true"></span>
${tour && s ? '<div data-tour="num">' : ""}<div class="bhead">${headingLevel ? `<h${headingLevel} class="bk-h">${head}</h${headingLevel}>` : head}<span class="ink3" data-live="st">${esc(statusText(g))}</span></div>
<div class="bteams">
<div class="side"><span class="ab">${esc(g.away.abbreviation)}</span>${nm(g.away, "Away")}${num(awayPct, !favHome && !!s)}</div>
<div class="side r"><span class="ab">${esc(g.home.abbreviation)}</span>${nm(g.home, "Home")}${num(homePct, favHome && !!s)}</div>
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
  if (g.status === "live" || g.status === "halftime") return g.hasCall ? `Clutch had the ${g.side.team.nickname} at ${pct(g.side.prob)} before tip.` : "Live.";
  if (!g.hasCall) return "Clutch's number lands the morning of the game.";
  if (g.preseason) return g.reasons[0] ? `${g.reasons[0].label}. Preseason: not graded.` : "Preseason: sealed before tip, not graded.";
  if (g.differs) return `The market differs: it has ${g.side.other.nickname} at ${pct(g.side.isHome ? 1 - g.market : g.market)}.`;
  if (g.reasons[0]) return g.reasons[0].label + ".";
  return "";
}

/**
 * Does a card's line say why the number is what it is? (The front page's
 * guide points at it: a reason — not a score, the market's other side, the
 * preseason's "not graded", or a number still to come.)
 */
export const lineIsWhy = (g) => g.status === "scheduled" && g.hasCall && !!g.reasons[0] && (g.preseason || !g.differs);

/** A Tonight card (a link to the game page). `why`: the guide's hook on its line. */
export function gameCard(g, why = false) {
  const live = g.status === "live" || g.status === "halftime";
  const final = g.status === "final";
  const cls = `gcard ${teamCls(g)}${live ? " is-live" : g.differs && !final ? " differs" : ""}`;
  const big = final || live
    ? `<span class="d n cream" data-live="sc" data-fmt="dash">${g.homeScore == null ? "--" : `${g.awayScore}–${g.homeScore}`}</span>`
    : `<span data-live="pre">${g.hasCall ? `<span class="d n">${pct(g.side.prob)}</span> <span class="d s">${esc(g.side.team.abbreviation)}</span>` : '<span class="d n dim">--</span>'}</span><span class="d n cream" data-live="sc" data-fmt="dash" hidden></span>`;
  const cta = final ? "The result →" : live ? "Follow it →" : g.status === "postponed" ? "Details →" : "Call it →";
  return `<a class="${cls}" href="${g.path}" data-gid="${g.id}" data-a="${g.away.abbreviation}" data-h="${g.home.abbreviation}">
<span class="gtop"><span class="d m">${esc(g.away.abbreviation)} @ ${esc(g.home.abbreviation)}</span><span class="d t" data-live="st">${esc(statusText(g, true))}</span></span>
<span class="gnum">${big}</span>
${rail(g.side ? g.side.prob : null, g.marketSide, true)}
<span class="gline"${why === true ? ' data-tour="why"' : ""}>${esc(cardLine(g))}</span>
<span class="mono cta">${cta}</span>
</a>`;
}

/**
 * A game as one row, the design system's MiniScoreRow (no box): the two codes,
 * each with its team's colour on the outer edge and Clutch's side lit; Clutch's
 * number between them and, under it, its side and the tip — or the clock and
 * score (static/live.js), or the final score and the grade. A link to the game page.
 */
export function slateRow(g) {
  const live = g.status === "live" || g.status === "halftime";
  const final = g.status === "final";
  const lit = (t) => (g.hasCall && g.side.team.id === t.id ? " lit" : "");
  const num = g.hasCall ? `<b class="d">${pct(g.side.prob)}%</b>` : '<b class="d dim">--</b>';
  const scored = (live || final) && g.homeScore != null;
  const sc = `<span data-live="sc" data-fmt="dash"${scored ? "" : " hidden"}>${scored ? `${g.awayScore}–${g.homeScore}` : ""}</span>`;
  const grade = final && (g.grade === "right" || g.grade === "missed") ? ` · ${g.grade === "right" ? "✓ Right" : "✗ Wrong"}` : "";
  const st = g.status === "scheduled" ? (g.tipUtc ? timeET(g.tipUtc) : "Tip TBD") : statusText(g);
  const lead = g.hasCall && !live && !final ? `${esc(g.side.team.nickname)} · ` : "";
  return `<li><a class="srow ${teamCls(g)}" href="${g.path}" data-gid="${g.id}" data-a="${g.away.abbreviation}" data-h="${g.home.abbreviation}">
<span class="code${lit(g.away)}">${esc(g.away.abbreviation)}</span>
<span class="smid">${num}<small>${lead}<span data-live="st">${esc(st)}</span>${sc}${grade}</small></span>
<span class="code home${lit(g.home)}">${esc(g.home.abbreviation)}</span>
</a></li>`;
}

export { plainDriverLabel };
