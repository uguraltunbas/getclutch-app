// The embeddable boxes: /embed/tonight/ (every game of the next night with
// Clutch's number) and /embed/team/<slug>/ (one team's next game, its last
// graded call and its playoff chance), made to sit in an <iframe> on a fan's
// blog — and /widget/, the page that hands out the code. The boxes are lean
// (no fonts, no scripts, embed.css only), noindex, framable (static/_headers
// /embed/*), and every link opens clutchledger.com in a new tab. The code
// carries a plain link under the frame too: a link inside a frame counts for
// the framed site, the one under it for the host's readers and search.

import { page, esc, ORIGIN, teamSlug } from "../html.mjs";
import { pct, pickSide } from "../copy.mjs";
import { timeET, dayLabel, shortDate } from "../time.mjs";
import { chanceText } from "./playoffs.mjs";

const ref = (path, box) => `${ORIGIN}${path}?utm_source=embed&amp;utm_medium=widget&amp;utm_campaign=${box}`;
const out = (href, inner, cls = "") => `<a href="${href}" target="_blank" rel="noopener"${cls ? ` class="${cls}"` : ""}>${inner}</a>`;
const strip = (p) => `<svg class="s" viewBox="0 0 100 5" preserveAspectRatio="none" aria-hidden="true"><rect class="bg" width="100" height="5"/><rect class="fg" width="${(p * 100).toFixed(1)}" height="5"/></svg>`;

function shell({ path, title, description, inner }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="dark light">
<link rel="stylesheet" href="/embed.css">
</head>
<body><div class="cl">${inner}</div></body>
</html>
`;
}

function tonightBox(m) {
  const date = m.tonight;
  const games = date ? m.nights[date] ?? [] : [];
  const rows = games.map((g) => {
    const right = g.status === "final" && g.homeScore != null ? `${g.awayScore}–${g.homeScore}` : g.hasCall ? `${esc(g.side.team.abbreviation)} ${pct(g.side.prob)}%` : "--";
    const sub = g.status === "final" ? "FINAL" : g.status === "postponed" ? "POSTPONED" : g.tipUtc ? `${timeET(g.tipUtc)}` : "";
    return `<li>${out(ref(g.path, "tonight"), `<span class="g"><span class="m">${esc(g.away.abbreviation)} @ ${esc(g.home.abbreviation)}</span><span class="n">${right}</span><span class="k">${esc(sub)}</span><span></span>${g.hasCall && g.status !== "final" ? strip(g.side.prob) : ""}</span>`)}</li>`;
  }).join("");
  const inner = `<div class="hd">${out(ref("/", "tonight"), "CLUTCH", "b")}<span class="k">${date ? `NBA · ${esc(dayLabel(date))} · WIN PROBABILITY` : "NBA · WIN PROBABILITY"}</span></div>
${games.length ? `<ul class="gs">${rows}</ul>` : '<p class="k">No games on the schedule yet.</p>'}
<p class="ft">Every number sealed before tip, graded after the final. ${out(ref("/tonight/", "tonight"), "More at clutchledger.com")}</p>`;
  return { path: "/embed/tonight/", embed: true, title: "Clutch box: NBA win probability tonight", html: shell({ path: "/embed/tonight/", title: "Clutch box: NBA win probability tonight", description: "An embeddable box with Clutch's win probability for every NBA game of the night.", inner }) };
}

function teamBox(t, m) {
  const slug = teamSlug(t);
  const nextRaw = m.raw.upcoming.find((g) => g.home_team_id === t.id || g.away_team_id === t.id);
  const v = nextRaw ? m.gameById[nextRaw.id] : null;
  const p = v?.hasCall ? v.homeProb : nextRaw && m.raw.preds[nextRaw.id] ? +m.raw.preds[nextRaw.id].home_win_prob : null;
  const side = nextRaw && p != null ? pickSide(p, m.T[nextRaw.home_team_id], m.T[nextRaw.away_team_id]) : null;
  const mine = side ? (side.team.id === t.id ? side.prob : 1 - side.prob) : null;
  const opp = nextRaw ? m.T[nextRaw.home_team_id === t.id ? nextRaw.away_team_id : nextRaw.home_team_id] : null;
  const lastCall = m.calls.find((c) => c.matchup.split(" @ ").includes(t.abbreviation));
  const chance = (m.seasonBoard?.teams ?? []).find((x) => x.team_id === t.id)?.playoff_pct;
  const target = v?.path ?? m.teamPath(t);
  const next = nextRaw
    ? `<div>${out(ref(target, "team"), `<span class="k">NEXT · ${esc(dayLabel(nextRaw.game_date).toUpperCase())}${nextRaw.game_time_utc ? ` · ${esc(timeET(nextRaw.game_time_utc))}` : ""}</span><br><span class="m">${nextRaw.home_team_id === t.id ? "vs" : "at"} ${esc(opp.name)}</span>`)}</div>
<div><span class="big">${mine == null ? "--" : `${pct(mine)}%`}</span> <span class="k">${mine == null ? "CLUTCH'S NUMBER LANDS THE MORNING OF THE GAME" : `${esc(t.nickname.toUpperCase())} WIN PROBABILITY`}</span>${mine == null ? "" : strip(mine)}</div>`
    : '<p class="k">No games on the schedule yet.</p>';
  const last = lastCall ? `<p class="k">LAST CALL · ${esc(shortDate(lastCall.game_date).toUpperCase())} · ${esc(lastCall.matchup)} · ${esc(lastCall.pick)} ${Math.round(lastCall.claimed_pct)}% · <span class="${lastCall.correct ? "ok" : "no"}">${lastCall.correct ? "RIGHT" : "MISSED"}</span></p>` : "";
  const inner = `<div class="hd">${out(ref(m.teamPath(t), "team"), "CLUTCH", "b")}<span class="k">${esc(t.name.toUpperCase())}</span></div>
${next}
${last}${chance != null ? `<p class="k">PLAYOFF CHANCE · ${esc(chanceText(chance))}</p>` : ""}
<p class="ft">Sealed before tip, graded after the final. ${out(ref(m.teamPath(t), "team"), `Every ${esc(t.nickname)} game at clutchledger.com`)}</p>`;
  const path = `/embed/team/${slug}/`;
  const title = `Clutch box: ${t.name} next game`;
  return { path, embed: true, title, html: shell({ path, title, description: `An embeddable box with Clutch's win probability for the next ${t.name} game, the last graded call and the playoff chance.`, inner }) };
}

function widgetPage(m) {
  const code = (src, h, label, href) => `<iframe src="${ORIGIN}${src}" width="100%" height="${h}" style="border:0;max-width:420px" title="${label}" loading="lazy"></iframe>
<p><a href="${ORIGIN}${href}">${label}</a> · Clutch</p>`;
  const hou = m.byAbbr.HOU ?? m.raw.teams[0];
  const tonightCode = code("/embed/tonight/", 440, "NBA win probability tonight", "/tonight/");
  const teamCode = code(`/embed/team/${teamSlug(hou)}/`, 260, `${hou.name} win probability`, m.teamPath(hou));
  const teams = m.raw.teams.slice().sort((a, b) => a.name.localeCompare(b.name)).map((t) => `<code>${esc(teamSlug(t))}</code>`).join(" · ");
  const body = `<div class="wrap r"><div class="rhead"><span class="kick">FOR FAN SITES · FREE</span><h1 class="rh1">Put Clutch's number on your site.</h1><p class="rdeck">Two small boxes for blogs, newsletters' web pages and team sites: tonight's NBA games with Clutch's win probability, or your team's next game. Free, no sign-up, no tracking in the box, and they update by themselves four times a day.</p></div>
<div class="body">
<section class="blk" aria-labelledby="tonight"><h2 id="tonight">Tonight's games</h2><p>Every game of the next NBA night, each with Clutch's number for the side it favours, the tip time (Eastern), and the final once it's in.</p>
<iframe class="gap" src="/embed/tonight/" width="100%" height="440" title="Preview: NBA win probability tonight" loading="lazy"></iframe>
<p class="gap">Copy this into your page's HTML:</p><pre class="scroll"><code>${esc(tonightCode)}</code></pre></section>
<section class="blk" aria-labelledby="team"><h2 id="team">Your team's next game</h2><p>One team: its next game with Clutch's win probability, its last graded call and its playoff chance.</p>
<iframe class="gap" src="/embed/team/${esc(teamSlug(hou))}/" width="100%" height="260" title="Preview: ${esc(hou.name)} next game" loading="lazy"></iframe>
<p class="gap">Copy this, then put your team's name in the two addresses in place of <code>${esc(teamSlug(hou))}</code>:</p><pre class="scroll"><code>${esc(teamCode)}</code></pre>
<details class="gap"><summary class="mono">THE 30 TEAM NAMES</summary><p class="note">${teams}</p></details></section>
<section class="blk" aria-labelledby="rules"><h2 id="rules">The small print</h2><p>Use the boxes anywhere, free, as long as the box and the line under it stay as they are. They set no cookies, run no scripts and count nothing about your readers; links open clutchledger.com in a new tab. Clutch is analytics for fans, with no affiliate links. Questions: <a href="/support/">Support</a>.</p></section>
</div></div>`;
  const title = "Free NBA win probability widget for your site · Clutch";
  return { path: "/widget/", title, html: page({ path: "/widget/", title, description: "Embed Clutch's NBA win probability on your blog or team site: tonight's games or your team's next game, free, no sign-up, no tracking, updated four times a day.", body, current: "", og: "default" }) };
}

export function embedPages(m) {
  return [tonightBox(m), ...m.raw.teams.map((t) => teamBox(t, m)), widgetPage(m)];
}
