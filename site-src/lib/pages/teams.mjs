// /teams/ and /teams/<slug>/ — each team's next games with Clutch's call
// where it exists, its playoff chance (free: the season board's free row),
// its Win Totals line, and its latest finals with the Ledger's grade.

import { page, esc, APP, ORIGIN, teamSlug } from "../html.mjs";
import { pct, pickSide, normalizeStatus, finalLabel, RATE_FLOOR } from "../copy.mjs";
import { dayLabel, shortDate, mediumDate, timeET, seasonOf as seasonOfDate } from "../time.mjs";

export function teamPages(m) {
  const board = m.seasonBoard;
  const chance = Object.fromEntries((board?.teams ?? []).map((t) => [t.team_id, t.playoff_pct]));
  const pageOf = Object.fromEntries(m.pageGames.map((g) => [g.id, g]));
  const out = [];

  for (const t of m.raw.teams) {
    const next = m.raw.upcoming.filter((g) => g.home_team_id === t.id || g.away_team_id === t.id).slice(0, 5);
    const last = m.raw.recent.filter((g) => g.home_team_id === t.id || g.away_team_id === t.id).slice(0, 6);
    const opp = (g) => m.T[g.home_team_id === t.id ? g.away_team_id : g.home_team_id];
    const at = (g) => (g.home_team_id === t.id ? "vs" : "at");

    const nextRows = next.map((g) => {
      const o = opp(g), v = pageOf[g.id];
      const p = v?.hasCall ? v.homeProb : m.raw.preds[g.id] ? +m.raw.preds[g.id].home_win_prob : null;
      const home = m.T[g.home_team_id], away = m.T[g.away_team_id];
      const side = p == null ? null : pickSide(p, home, away);
      const num = side ? `${esc(side.team.abbreviation)} ${pct(side.prob)}` : "--";
      const label = `${at(g)} ${o.nickname}${g.season_type === "Preseason" ? " · preseason" : ""}`;
      const tip = g.game_time_utc ? timeET(g.game_time_utc) : "";
      const name = v ? `<a href="${v.path}">${esc(label)}</a>` : esc(label);
      return `<div class="callrow"><span class="mono">${esc(dayLabel(g.game_date).toUpperCase())}</span><span>${name} <span class="mono hide-xs">· ${esc(tip)}</span></span><span class="d">${num}</span><span>${side ? '<span class="chip">THE CALL</span>' : '<span class="note">That morning</span>'}</span></div>`;
    }).join("");

    const lastRows = last.map((g) => {
      const o = opp(g), c = m.callBy[g.id];
      const us = g.home_team_id === t.id ? g.home_score : g.away_score, them = g.home_team_id === t.id ? g.away_score : g.home_score;
      const res = us > them ? "W" : "L";
      const v = pageOf[g.id];
      const label = `${res} ${us}–${them} ${at(g)} ${o.nickname}${g.season_type === "Playoffs" ? " · playoffs" : ""}${normalizeStatus(g.status) === "final" && g.period > 4 ? ` · ${finalLabel(g.period).replace("FINAL/", "")}` : ""}`;
      const name = v ? `<a href="${v.path}">${esc(label)}</a>` : esc(label);
      const grade = c ? `<span class="d">${esc(c.pick)} ${Math.round(c.claimed_pct)}</span><span>${c.correct ? '<span class="chip win">RIGHT</span>' : '<span class="chip loss">MISSED</span>'}</span>` : `<span class="d dim">--</span><span><span class="note">${g.season_type === "Preseason" ? "Preseason" : "Not graded"}</span></span>`;
      return `<div class="callrow"><span class="mono">${esc(shortDate(g.game_date).toUpperCase())}</span><span>${name}</span>${grade}</div>`;
    }).join("");

    const line = m.lines[t.id];
    const pc = chance[t.id];
    const mine = m.calls.filter((c) => c.matchup.split(" @ ").includes(t.abbreviation));
    const seasonOfCall = (c) => c.season || seasonOfDate(c.game_date);
    const gradedSeason = mine.some((c) => seasonOfCall(c) === m.current) ? m.current : mine[0] ? seasonOfCall(mine[0]) : null;
    const graded = mine.filter((c) => seasonOfCall(c) === gradedSeason);
    const right = graded.filter((c) => c.correct).length;
    const stats = [
      line ? `<div><span class="d amber">${Number(line.line).toFixed(1)}</span><span class="mono">WIN TOTAL · ${esc((line.source || "Market consensus").toUpperCase())}</span></div>` : "",
      pc != null ? `<div><span class="d">${(pc * 100).toFixed(0)}%</span><span class="mono">CLUTCH'S PLAYOFF CHANCE</span></div>` : "",
      graded.length ? `<div><span class="d">${right}–${graded.length - right}</span><span class="mono">CLUTCH'S CALLS IN ${esc(t.nickname.toUpperCase())} GAMES · ${esc(gradedSeason)}${gradedSeason !== m.current && m.last?.retired && m.last.season === gradedSeason ? " · RETIRED MODEL" : ""}</span></div>` : "",
    ].join("");
    const path = `/teams/${teamSlug(t)}/`;
    const nextG = next[0];
    const deck = `Clutch's number on every ${t.nickname} game, sealed before tip and graded in public — plus their playoff chance, their season win total and how Clutch's calls on their games have gone.`;
    const body = `<div class="wrap r"><div class="rhead h-${t.abbreviation}"><span class="kick">${esc(t.conference.toUpperCase())} · ${esc((t.division || "").toUpperCase())}</span><h1 class="rh1">${esc(t.name)}</h1><p class="rdeck">${esc(deck)}</p>${stats ? `<div class="stat gap">${stats}</div>` : ""}</div>
<div class="body">
<section aria-labelledby="next"><h2 class="sh" id="next">Next up</h2>${nextRows || '<p class="sub">No games on the schedule yet.</p>'}</section>
<section aria-labelledby="last"><h2 class="sh s" id="last">Latest finals</h2>${lastRows || '<p class="sub">No finals yet.</p>'}<p class="note gap">Clutch's call is graded only when the Ledger can prove it was made before tip; preseason is never graded.</p></section>
${pc != null ? `<p class="note">Playoff chance: ${esc(board.method ? `${board.runs?.toLocaleString("en-US") ?? "10,000"} simulated seasons` : "the season simulation")}, ratings as of ${esc(mediumDate(board.as_of))}${board.phase === "preseason" ? " (preseason)" : ""}. Every team's chances are free in the app, updated nightly.</p>` : ""}
<div class="btns"><a class="btn" href="${APP}/">Call ${esc(t.nickname)} games in your browser</a><a class="btn ghost" href="/teams/">All 30 teams</a></div>
</div></div>`;
    const title = `${t.name}: Clutch's call on every game · Clutch`;
    const description = `${t.name} win probability for every game${nextG ? `, next ${at(nextG)} the ${opp(nextG).nickname} on ${mediumDate(nextG.game_date)}` : ""}${pc != null ? `; playoff chance ${(pc * 100).toFixed(0)}%` : ""}${line ? `; win total ${Number(line.line).toFixed(1)}` : ""}. Sealed before tip, graded in public.`;
    const ld = { "@context": "https://schema.org", "@type": "SportsTeam", name: t.name, sport: "Basketball", url: ORIGIN + path, memberOf: { "@type": "SportsOrganization", name: "NBA" } };
    out.push({ path, title, html: page({ path, title, description, body, current: "", og: "default", jsonld: ld }) });
  }

  const byConf = (c) => m.raw.teams.filter((t) => t.conference === c).map((t) => `<a class="h-${t.abbreviation}" href="/teams/${teamSlug(t)}/"><span class="sw"></span><span><b>${esc(t.name)}</b><span class="mono">${m.lines[t.id] ? `WIN TOTAL ${Number(m.lines[t.id].line).toFixed(1)}` : ""}${chance[t.id] != null ? ` · PLAYOFFS ${(chance[t.id] * 100).toFixed(0)}%` : ""}</span></span></a>`).join("");
  const body = `<div class="wrap"><div class="rhead"><span class="kick">THE TEAMS</span><h1 class="rh1">Thirty teams, every game called.</h1><p class="rdeck">Each team's next games with Clutch's call, its playoff chance, its season win total and its latest finals, graded.</p></div>
<div class="body"><section aria-labelledby="east"><h2 class="sh" id="east">East</h2><div class="teamgrid">${byConf("East")}</div></section><section aria-labelledby="west"><h2 class="sh" id="west">West</h2><div class="teamgrid">${byConf("West")}</div></section></div></div>`;
  out.push({ path: "/teams/", title: "NBA teams: Clutch's call on every game · Clutch", html: page({ path: "/teams/", title: "NBA teams: Clutch's call on every game · Clutch", description: "All 30 NBA teams: each one's next games with Clutch's win probability, playoff chance, season win total and latest graded finals.", body, og: "default" }) });
  return out;
}

export function notFoundPage() {
  const body = `<div class="wrap r"><div class="rhead"><span class="kick">404 · NOT IN THIS EDITION</span><h1 class="rh1">That page isn't in the paper.</h1><p class="rdeck">Game pages run from tonight back seven nights; older calls live in the Ledger. The front page has tonight's numbers.</p><div class="btns"><a class="btn" href="/">The front page</a><a class="btn ghost" href="/ledger/">The Ledger</a></div></div></div>`;
  return { path: "/404.html", title: "Not found · Clutch", html: page({ path: "/404.html", title: "Not found · Clutch", description: "This page isn't in the paper.", body, noindex: true }) };
}

/** Old links (the GitHub Pages files) on the new domain: a redirect page each. */
export function redirectPage(from, to) {
  const url = ORIGIN + to;
  return { path: from, redirect: true, html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Moved · Clutch</title><link rel="canonical" href="${url}"><meta http-equiv="refresh" content="0; url=${to}"></head><body><p>This page moved: <a href="${to}">${url}</a></p></body></html>\n` };
}
