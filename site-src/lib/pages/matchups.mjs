// /matchups/<team>-vs-<team>/ — one pair of teams: every meeting this season
// (Clutch's number before tip, the final, the Ledger's grade), the meetings
// on the schedule ahead, and the Ledger's graded calls on the pair from
// earlier seasons (from the calls themselves: the games table misses part of
// last season, so no series total is drawn from it). A pair gets its page once it has a
// regular-season or playoff game that is final or has its own game page
// (tonight's slate included), so the pages grow with the season instead of
// arriving as 435 empty shells. The two names are in alphabetical order,
// so a pair has one address whichever team is at home.

import { page, esc, ORIGIN, teamSlug } from "../html.mjs";
import { pct, normalizeStatus, finalLabel, rec } from "../copy.mjs";
import { shortDate, mediumDate, dayLabel, timeET } from "../time.mjs";

const pairKey = (x, y) => [x, y].sort().join("|");
const ordered = (t, u) => (teamSlug(t) < teamSlug(u) ? [t, u] : [u, t]);
export const matchupPath = (t, u) => { const [a, b] = ordered(t, u); return `/matchups/${teamSlug(a)}-vs-${teamSlug(b)}/`; };

/** Every pair with a page: Map pairKey → { a, b, path, games (this season's views), last (earlier seasons' graded calls) }. Built once per model. */
export function matchupIndex(m) {
  if (m._matchups) return m._matchups;
  const out = new Map();
  const seasonFrom = `${m.current.slice(0, 4)}-08-01`;
  const onPage = new Set(m.pageGames.map((g) => g.id));
  const slot = (h, a) => {
    const k = pairKey(h.id, a.id);
    if (!out.has(k)) { const [x, y] = ordered(h, a); out.set(k, { a: x, b: y, path: matchupPath(x, y), games: [], last: [], live: false }); }
    return out.get(k);
  };
  for (const g of m.games) {
    if (g.date < seasonFrom) continue;
    const s = slot(g.home, g.away);
    s.games.push({ ...g, page: onPage.has(g.id) });
    if (!g.preseason && (g.status === "final" || onPage.has(g.id))) s.live = true;
  }
  for (const c of m.calls) {
    if (c.game_date >= seasonFrom || c.season_type === "Preseason") continue;
    const [aw, hm] = String(c.matchup).split(" @ ").map((x) => m.byAbbr[x]);
    if (!aw || !hm) continue;
    slot(hm, aw).last.push(c);
  }
  for (const [k, s] of out) if (!s.live) out.delete(k);
  for (const s of out.values()) {
    s.games.sort((x, y) => (x.date + (x.tipUtc ?? "")).localeCompare(y.date + (y.tipUtc ?? "")));
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

function row(g) {
  const final = g.status === "final" && g.homeScore != null;
  const label = `${g.away.abbreviation} at ${g.home.abbreviation}${final ? ` · ${g.awayScore}–${g.homeScore}${g.period > 4 ? ` ${finalLabel(g.period).replace("FINAL/", "")}` : ""}` : ""}${g.preseason ? " · preseason" : g.seasonType === "Playoffs" ? " · playoffs" : ""}`;
  const name = g.page ? `<a href="${g.path}">${esc(label)}</a>` : esc(label);
  const when = final || g.status === "postponed" ? shortDate(g.date) : dayLabel(g.date);
  const tip = !final && g.status === "scheduled" && g.tipUtc ? ` <span class="mono hide-xs">· ${esc(timeET(g.tipUtc))}</span>` : "";
  const num = g.hasCall ? `${esc(g.side.team.abbreviation)} ${pct(g.side.prob)}` : "--";
  let chip;
  if (g.status === "postponed") chip = '<span class="chip">POSTPONED</span>';
  else if (final) chip = g.grade === "right" ? '<span class="chip win">RIGHT</span>' : g.grade === "missed" ? '<span class="chip loss">MISSED</span>' : `<span class="note">${g.preseason ? "Preseason" : g.grade === "pending" ? "Graded overnight" : "Not graded"}</span>`;
  else if (g.status === "live" || g.status === "halftime") chip = '<span class="chip hot">LIVE</span>';
  else chip = g.hasCall ? '<span class="chip">THE CALL</span>' : '<span class="note">That morning</span>';
  return `<div class="callrow"><span class="mono">${esc(when.toUpperCase())}</span><span>${name}${tip}</span><span class="d${g.hasCall ? "" : " dim"}">${num}</span><span>${chip}</span></div>`;
}

function lastRow(c) {
  const label = `${c.matchup.replace(" @ ", " at ")} · ${c.final.replace("-", "–")}${c.season_type === "Playoffs" ? " · playoffs" : ""}`;
  return `<div class="callrow"><span class="mono">${esc(shortDate(c.game_date).toUpperCase())}</span><span>${esc(label)}</span><span class="d">${esc(c.pick)} ${Math.round(c.claimed_pct)}</span><span>${c.correct ? '<span class="chip win">RIGHT</span>' : '<span class="chip loss">MISSED</span>'}</span></div>`;
}

function matchupPage(s, m) {
  const { a, b, path } = s;
  const played = s.games.filter((g) => g.status === "final" && g.homeScore != null && !g.preseason);
  const ahead = s.games.filter((g) => g.status === "scheduled");
  const graded = played.filter((g) => g.grade === "right" || g.grade === "missed");
  const right = graded.filter((g) => g.grade === "right").length;
  const now = series(s, played);
  const lastRight = s.last.filter((c) => c.correct).length;
  const next = ahead[0] ?? null;
  const stats = [
    played.length ? `<div><span class="d">${now.a}–${now.b}</span><span class="mono">${esc(`${a.abbreviation}–${b.abbreviation}`)} · ${esc(m.current)}</span></div>` : "",
    graded.length ? `<div><span class="d">${rec(right, graded.length)}</span><span class="mono">CLUTCH'S GRADED CALLS</span></div>` : "",
    s.last.length ? `<div><span class="d">${rec(lastRight, s.last.length)}</span><span class="mono">CLUTCH'S CALLS · EARLIER SEASONS</span></div>` : "",
  ].join("");
  const st = seriesText(s, now);
  const deck = `Every ${a.name}–${b.name} game this season: Clutch's number for each before tip, the final, and whether the call held. ${st ? `${st} this season.` : "Their first meeting of the season is on the schedule below."}`;
  const thisSeason = s.games.filter((g) => g.status === "final" || g.status === "postponed" || g.status === "live" || g.status === "halftime");
  const body = `<div class="wrap r"><div class="rhead"><span class="kick">HEAD TO HEAD · ${esc(m.current)}</span><h1 class="rh1">${esc(a.nickname)} vs ${esc(b.nickname)}</h1><p class="rdeck">${esc(deck)}</p>${stats ? `<div class="stat gap">${stats}</div>` : ""}</div>
<div class="body">
<section aria-labelledby="season"><h2 class="sh" id="season">This season</h2>${thisSeason.length ? thisSeason.map(row).join("") : '<p class="sub">No finals yet between these two this season.</p>'}</section>
${ahead.length ? `<section aria-labelledby="ahead"><h2 class="sh s" id="ahead">Still to come</h2>${ahead.map(row).join("")}<p class="note gap">Clutch's number for each game lands the morning of the game and is sealed before tip.</p></section>` : ""}
${s.last.length ? `<section aria-labelledby="earlier"><h2 class="sh s" id="earlier">Clutch's calls, earlier seasons</h2>${s.last.map(lastRow).join("")}<p class="note gap">The Ledger's graded calls on this pair: ${rec(lastRight, s.last.length)}${m.last?.retired ? `, made by the model Clutch has since retired` : ""}. Only calls it could prove were made before tip are graded.</p></section>` : ""}
<p class="note">Clutch's call is graded only when the Ledger can prove it was made before tip; preseason is never graded. <a href="/accuracy/">How accurate Clutch is →</a></p>
<div class="btns"><a class="btn ghost" href="${m.teamPath(a)}">${esc(a.name)}</a><a class="btn ghost" href="${m.teamPath(b)}">${esc(b.name)}</a></div>
</div></div>`;
  const title = `${a.nickname} vs ${b.nickname} prediction and head to head, ${m.current} · Clutch`;
  const description = `${a.name} vs ${b.name} head to head: Clutch's win probability before every meeting and the final${st ? `. ${st} this season` : ""}${next ? `. Next: ${mediumDate(next.date)}` : ""}.`;
  const ld = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Teams", item: `${ORIGIN}/teams/` },
      { "@type": "ListItem", position: 2, name: a.name, item: ORIGIN + m.teamPath(a) },
      { "@type": "ListItem", position: 3, name: `${a.nickname} vs ${b.nickname}`, item: ORIGIN + path },
    ],
  };
  return { path, title, html: page({ path, title, description, body, current: "teams", og: "default", jsonld: ld }) };
}

export function matchupPages(m) {
  return [...matchupIndex(m).values()].sort((x, y) => x.path.localeCompare(y.path)).map((s) => matchupPage(s, m));
}

/** A team's head-to-head pages, by opponent's name (the team pages list them). */
export function matchupsOf(m, t) {
  return [...matchupIndex(m).values()].filter((s) => s.a.id === t.id || s.b.id === t.id).map((s) => ({ opp: s.a.id === t.id ? s.b : s.a, path: s.path })).sort((x, y) => x.opp.nickname.localeCompare(y.opp.nickname));
}
