// /matchups/<team>-vs-<team>/ — one pair of teams: every meeting this season
// (Clutch's number before tip, the final, the Ledger's grade), the meetings
// on the schedule ahead, every meeting last season with its series result
// (the games table holds all of 2025-26 since the ESPN backfill of
// 2026-10-25; the play-in counts in no series) and the Ledger's graded calls
// on the pair from seasons before that. A pair gets its page once it has a
// regular-season or playoff game that is final, has its own game page
// (tonight's slate included) or tips within the next week (people search
// "X vs Y prediction" in the days before, and a crawler needs those days),
// so the pages grow with the season instead of arriving as 435 empty shells. The two names are in alphabetical order,
// so a pair has one address whichever team is at home.

import { page, esc, ORIGIN, teamSlug } from "../html.mjs";
import { pct, normalizeStatus, finalLabel, rec } from "../copy.mjs";
import { shortDate, mediumDate, dayLabel, timeET, shift } from "../time.mjs";

const pairKey = (x, y) => [x, y].sort().join("|");
const LEAD_DAYS = 7;
const ordered = (t, u) => (teamSlug(t) < teamSlug(u) ? [t, u] : [u, t]);
export const matchupPath = (t, u) => { const [a, b] = ordered(t, u); return `/matchups/${teamSlug(a)}-vs-${teamSlug(b)}/`; };

/** Every pair with a page: Map pairKey → { a, b, path, games (this season's views), last (earlier seasons' graded calls) }. Built once per model. */
export function matchupIndex(m) {
  if (m._matchups) return m._matchups;
  const out = new Map();
  const seasonFrom = `${m.current.slice(0, 4)}-08-01`;
  const onPage = new Set(m.pageGames.map((g) => g.id));
  const soon = shift(m.today, LEAD_DAYS);
  const slot = (h, a) => {
    const k = pairKey(h.id, a.id);
    if (!out.has(k)) { const [x, y] = ordered(h, a); out.set(k, { a: x, b: y, path: matchupPath(x, y), games: [], prev: [], last: [], live: false }); }
    return out.get(k);
  };
  for (const g of m.games) {
    if (g.date < seasonFrom) continue;
    const s = slot(g.home, g.away);
    s.games.push({ ...g, page: onPage.has(g.id) });
    if (!g.preseason && (g.status === "final" || onPage.has(g.id) || (g.status === "scheduled" && g.date >= m.today && g.date <= soon))) s.live = true;
  }
  // Last season's meetings carry their own call (m.callBy), so "earlier seasons" keeps only the calls before that.
  const prevIds = new Set();
  for (const g of m.lastSeason) { prevIds.add(g.id); slot(g.home, g.away).prev.push(g); }
  for (const c of m.calls) {
    if (c.game_date >= seasonFrom || c.season_type === "Preseason" || prevIds.has(c.game_id)) continue;
    const [aw, hm] = String(c.matchup).split(" @ ").map((x) => m.byAbbr[x]);
    if (!aw || !hm) continue;
    slot(hm, aw).last.push(c);
  }
  for (const [k, s] of out) if (!s.live) out.delete(k);
  for (const s of out.values()) {
    s.games.sort((x, y) => (x.date + (x.tipUtc ?? "")).localeCompare(y.date + (y.tipUtc ?? "")));
    s.prev.sort((x, y) => x.date.localeCompare(y.date));
    s.last.sort((x, y) => x.game_date.localeCompare(y.game_date));
  }
  m._matchups = out;
  return out;
}

/** The page for two teams, or null when the pair has none yet. */
export const matchupFor = (m, t, u) => matchupIndex(m).get(pairKey(t.id, u.id)) ?? null;

/** Wins for each side in a list of finals: { a, b }. */
function series(s, finals) {
  let a = 0, b = 0;
  for (const g of finals) { const homeWon = g.homeScore > g.awayScore; const w = homeWon ? g.home : g.away; if (w.id === s.a.id) a++; else b++; }
  return { a, b };
}

/** "Knicks lead 2–1", "Level at 1–1", or "". */
function seriesText(s, x) {
  if (!x.a && !x.b) return "";
  if (x.a === x.b) return `Level at ${x.a}–${x.b}`;
  const [lead, hi, lo] = x.a > x.b ? [s.a, x.a, x.b] : [s.b, x.b, x.a];
  return `${lead.nickname} lead ${hi}–${lo}`;
}

/** Last season, from side a's view: the regular season (play-in left out) and the playoffs, each { a, b }. */
export function prevSeries(s) {
  return { reg: series(s, s.prev.filter((g) => g.seasonType === "Regular Season" && !g.playIn)), po: series(s, s.prev.filter((g) => g.seasonType === "Playoffs")) };
}

/** "Rockets won the season series 3–1. Rockets won their playoff series 4–2." or "". */
function prevText(s, x) {
  const out = [];
  if (x.reg.a || x.reg.b) {
    if (x.reg.a === x.reg.b) out.push(`They split the season series ${x.reg.a}–${x.reg.b}`);
    else { const [w, hi, lo] = x.reg.a > x.reg.b ? [s.a, x.reg.a, x.reg.b] : [s.b, x.reg.b, x.reg.a]; out.push(`${w.nickname} won the season series ${hi}–${lo}`); }
  }
  const hi = Math.max(x.po.a, x.po.b);
  if (hi === 4) { const [w, lo] = x.po.a === 4 ? [s.a, x.po.b] : [s.b, x.po.a]; out.push(`${w.nickname} won their playoff series 4–${lo}`); }
  return out.join(". ");
}

function prevRow(g, m) {
  const c = m.callBy[g.id];
  const label = `${g.away.abbreviation} at ${g.home.abbreviation} · ${g.awayScore}–${g.homeScore}${g.period > 4 ? ` ${finalLabel(g.period).replace("Final/", "")}` : ""}${g.playIn ? " · play-in" : g.seasonType === "Playoffs" ? " · playoffs" : ""}`;
  const grade = c ? `<span class="d">${esc(c.pick)} ${Math.round(c.claimed_pct)}</span><span>${c.correct ? '<span class="chip win">✓ Right</span>' : '<span class="chip loss">✗ Missed</span>'}</span>` : '<span class="d dim">--</span><span><span class="note">Not graded</span></span>';
  return `<div class="callrow"><span class="mono">${esc(shortDate(g.date))}</span><span>${esc(label)}</span>${grade}</div>`;
}

function row(g) {
  const final = g.status === "final" && g.homeScore != null;
  const label = `${g.away.abbreviation} at ${g.home.abbreviation}${final ? ` · ${g.awayScore}–${g.homeScore}${g.period > 4 ? ` ${finalLabel(g.period).replace("Final/", "")}` : ""}` : ""}${g.preseason ? " · preseason" : g.seasonType === "Playoffs" ? " · playoffs" : ""}`;
  const name = g.page ? `<a href="${g.path}">${esc(label)}</a>` : esc(label);
  const when = final || g.status === "postponed" ? shortDate(g.date) : dayLabel(g.date);
  const tip = !final && g.status === "scheduled" && g.tipUtc ? ` <span class="mono hide-xs">· ${esc(timeET(g.tipUtc))}</span>` : "";
  const num = g.hasCall ? `${esc(g.side.team.abbreviation)} ${pct(g.side.prob)}` : "--";
  let chip;
  if (g.status === "postponed") chip = '<span class="chip">Postponed</span>';
  else if (final) chip = g.grade === "right" ? '<span class="chip win">✓ Right</span>' : g.grade === "missed" ? '<span class="chip loss">✗ Missed</span>' : `<span class="note">${g.preseason ? "Preseason" : g.grade === "pending" ? "Graded overnight" : "Not graded"}</span>`;
  else if (g.status === "live" || g.status === "halftime") chip = '<span class="chip hot">Live</span>';
  else chip = g.hasCall ? '<span class="chip">The call</span>' : '<span class="note">That morning</span>';
  return `<div class="callrow"><span class="mono">${esc(when)}</span><span>${name}${tip}</span><span class="d${g.hasCall ? "" : " dim"}">${num}</span><span>${chip}</span></div>`;
}

function lastRow(c) {
  const label = `${c.matchup.replace(" @ ", " at ")} · ${c.final.replace("-", "–")}${c.season_type === "Playoffs" ? " · playoffs" : ""}`;
  return `<div class="callrow"><span class="mono">${esc(shortDate(c.game_date))}</span><span>${esc(label)}</span><span class="d">${esc(c.pick)} ${Math.round(c.claimed_pct)}</span><span>${c.correct ? '<span class="chip win">✓ Right</span>' : '<span class="chip loss">✗ Missed</span>'}</span></div>`;
}

function matchupPage(s, m) {
  const { a, b, path } = s;
  const played = s.games.filter((g) => g.status === "final" && g.homeScore != null && !g.preseason);
  const ahead = s.games.filter((g) => g.status === "scheduled");
  const graded = played.filter((g) => g.grade === "right" || g.grade === "missed");
  const right = graded.filter((g) => g.grade === "right").length;
  const now = series(s, played);
  const lastRight = s.last.filter((c) => c.correct).length;
  const prev = prevSeries(s);
  const pt = prevText(s, prev);
  const prevCalls = s.prev.map((g) => m.callBy[g.id]).filter(Boolean);
  const prevRight = prevCalls.filter((c) => c.correct).length;
  const next = ahead[0] ?? null;
  const stats = [
    played.length ? `<div><span class="d">${now.a}–${now.b}</span><span class="mono">${esc(`${a.abbreviation}–${b.abbreviation}`)} · ${esc(m.current)}</span></div>` : "",
    graded.length ? `<div><span class="d">${rec(right, graded.length)}</span><span class="mono">Clutch's graded calls</span></div>` : "",
    prev.reg.a || prev.reg.b ? `<div><span class="d">${prev.reg.a}–${prev.reg.b}</span><span class="mono">${esc(`${a.abbreviation}–${b.abbreviation}`)} · ${esc(m.prevSeason)}</span></div>` : "",
    s.last.length ? `<div><span class="d">${rec(lastRight, s.last.length)}</span><span class="mono">Clutch's calls · Earlier seasons</span></div>` : "",
  ].join("");
  const st = seriesText(s, now);
  const deck = `Every ${a.name}–${b.name} game this season: Clutch's number for each before tip, the final, and whether the call held. ${st ? `${st} this season.` : "Their first meeting of the season is on the schedule below."}${pt ? ` Last season: ${pt}.` : ""}`;
  const thisSeason = s.games.filter((g) => g.status === "final" || g.status === "postponed" || g.status === "live" || g.status === "halftime");
  const body = `<div class="wrap r"><div class="rhead"><span class="kick">Head to head · ${esc(m.current)}</span><h1 class="rh1">${esc(a.nickname)} vs ${esc(b.nickname)}</h1><p class="rdeck">${esc(deck)}</p>${stats ? `<div class="stat gap">${stats}</div>` : ""}</div>
<div class="body">
<section aria-labelledby="season"><h2 class="sh" id="season">This season</h2>${thisSeason.length ? thisSeason.map(row).join("") : '<p class="sub">No finals yet between these two this season.</p>'}</section>
${ahead.length ? `<section aria-labelledby="ahead"><h2 class="sh s" id="ahead">Still to come</h2>${ahead.map(row).join("")}<p class="note gap">Clutch's number for each game lands the morning of the game and is sealed before tip.</p></section>` : ""}
${s.prev.length ? `<section aria-labelledby="lastseason"><h2 class="sh s" id="lastseason">Last season, ${esc(m.prevSeason)}</h2>${s.prev.map((g) => prevRow(g, m)).join("")}<p class="note gap">${pt ? `${esc(pt)}. ` : ""}${prevCalls.length ? `Clutch's graded calls on these games: ${rec(prevRight, prevCalls.length)}${m.last?.retired && m.last.season === m.prevSeason ? ", made by the model Clutch has since retired" : ""}. ` : ""}${s.prev.some((g) => g.playIn) ? "The play-in counts in no series." : ""}</p></section>` : ""}
${s.last.length ? `<section aria-labelledby="earlier"><h2 class="sh s" id="earlier">Clutch's calls, earlier seasons</h2>${s.last.map(lastRow).join("")}<p class="note gap">The Ledger's graded calls on this pair: ${rec(lastRight, s.last.length)}${m.last?.retired ? `, made by the model Clutch has since retired` : ""}. Only calls it could prove were made before tip are graded.</p></section>` : ""}
<p class="note">Clutch's call is graded only when the Ledger can prove it was made before tip; preseason is never graded. <a href="/accuracy/">How accurate Clutch is →</a></p>
<div class="btns"><a class="btn ghost" href="${m.teamPath(a)}">${esc(a.name)}</a><a class="btn ghost" href="${m.teamPath(b)}">${esc(b.name)}</a></div>
</div></div>`;
  const title = `${a.nickname} vs ${b.nickname} prediction and head to head, ${m.current} · Clutch`;
  const description = `${a.name} vs ${b.name} head to head: Clutch's win probability before every meeting and the final${st ? `. ${st} this season` : ""}${pt ? `. Last season: ${pt}` : ""}${next ? `. Next: ${mediumDate(next.date)}` : ""}.`;
  const ld = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Teams", item: `${ORIGIN}/teams/` },
      { "@type": "ListItem", position: 2, name: a.name, item: ORIGIN + m.teamPath(a) },
      { "@type": "ListItem", position: 3, name: `${a.nickname} vs ${b.nickname}`, item: ORIGIN + path },
    ],
  };
  // The share card: the next meeting's (lib/ogcards.mjs), else the latest meeting that has one.
  const coming = s.games.find((g) => g.status !== "final" && g.status !== "postponed");
  const card = (coming && m.og?.[coming.id]) || s.games.slice().reverse().map((g) => m.og?.[g.id]).find(Boolean) || null;
  return { path, title, html: page({ path, title, description, body, current: "teams", og: card?.name ?? "default", ...(card ? { ogAlt: card.alt } : {}), jsonld: ld }) };
}

export function matchupPages(m) {
  return [...matchupIndex(m).values()].sort((x, y) => x.path.localeCompare(y.path)).map((s) => matchupPage(s, m));
}

/** A team's regular-season record in a list of finals (play-in left out): { w, l, vs: { oppId: { w, l } } }. */
export function recordIn(finals, t) {
  const out = { w: 0, l: 0, vs: {} };
  for (const g of finals) {
    if (g.seasonType !== "Regular Season" || g.playIn || (g.home.id !== t.id && g.away.id !== t.id)) continue;
    const isHome = g.home.id === t.id, won = isHome === g.homeScore > g.awayScore;
    const v = (out.vs[(isHome ? g.away : g.home).id] ??= { w: 0, l: 0 });
    if (won) { out.w++; v.w++; } else { out.l++; v.l++; }
  }
  return out;
}

/** Last season's record, and against each opponent (the head-to-head lines). */
export const prevRecord = (m, t) => recordIn(m.lastSeason, t);

/** A team's head-to-head pages, by opponent's name (the team pages list them). */
export function matchupsOf(m, t) {
  return [...matchupIndex(m).values()].filter((s) => s.a.id === t.id || s.b.id === t.id).map((s) => ({ opp: s.a.id === t.id ? s.b : s.a, path: s.path })).sort((x, y) => x.opp.nickname.localeCompare(y.opp.nickname));
}
