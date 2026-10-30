// The embeddable boxes: /embed/games/<date>/<away>-at-<home>/ (one game: its
// Clutch number, the teams, the tip and "Open in Clutch"; the publisher
// widget, t31), /embed/tonight/ (every game of the next night with Clutch's
// number) and /embed/team/<slug>/ (one team's next game, its last graded call
// and its playoff chance), made to sit in an <iframe> on a fan's blog — and
// /widget/, the page that hands out the code. The boxes are lean (no fonts,
// no scripts, embed.css only), noindex, framable (static/_headers /embed/*),
// and every link opens in a new tab. No box shows a score or a stat, live or
// final (ESPN's terms): after the final, Clutch's call and its grade. The
// code carries a plain link under the frame too: a link inside a frame counts
// for the framed site, the one under it for the host's readers and search.

import { page, esc, ORIGIN, teamSlug, WEB_APP_LIVE, playGame, appStoreLink } from "../html.mjs";
import { pct, pickSide, rec } from "../copy.mjs";
import { badgeSvg } from "../badge.mjs";
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

/** A graded call in a box: "✓ Right", "✗ Wrong", or why there is no grade yet. */
const gradeText = (g) => ({ right: "✓ Right", missed: "✗ Wrong", preseason: "Preseason, not graded", pending: "Graded overnight", ungraded: "Not graded" })[g.grade] ?? "";

/** "Open in Clutch": the game in the web app (its analytics reads the utm), or the App Store with the embed's campaign. */
const openGame = (g) => (WEB_APP_LIVE ? `${playGame(g.id)}?utm_source=embed&amp;utm_medium=widget&amp;utm_campaign=game` : esc(appStoreLink("/embed/")));

export const embedPath = (g) => `/embed${g.path}`;
const vs = (g) => (g.neutral ? "vs" : "at");

function gameBox(g) {
  const s = g.side;
  const live = g.status === "live" || g.status === "halftime";
  const when = g.status === "postponed" ? "Postponed" : g.status === "final" ? `${shortDate(g.date)} · Final` : live ? "Live now" : g.tipUtc ? `${dayLabel(g.date)} · Tip ${timeET(g.tipUtc)}` : dayLabel(g.date);
  const line = g.status === "postponed" ? "Postponed: nothing to seal or grade."
    : !g.hasCall ? (g.status === "final" ? "Clutch published no number for this game." : "Clutch's number lands the morning of the game.")
    : g.status === "final" ? `Clutch had the ${esc(s.team.nickname)} at ${pct(s.prob)}% · ${gradeText(g)}`
    : live ? `Before tip, Clutch had the ${esc(s.team.nickname)} at ${pct(s.prob)}%.`
    : `Clutch's number for the ${esc(s.team.nickname)} to win`;
  const num = g.hasCall && g.status !== "postponed" ? `<div><p><span class="big">${pct(s.prob)}%</span> <span class="m">${esc(s.team.abbreviation)}</span></p>${strip(s.prob)}</div>` : '<p><span class="big">--</span></p>';
  const inner = `<div class="hd">${out(ref(g.path, "game"), "Clutch", "b")}<span class="k">NBA · ${esc(when)}</span></div>
<p class="mu"><span class="m">${esc(g.away.abbreviation)}</span> ${esc(g.away.nickname)} <span class="k">${vs(g)}</span> <span class="m">${esc(g.home.abbreviation)}</span> ${esc(g.home.nickname)}</p>
${num}
<p class="k">${line}</p>
${g.status === "postponed" ? "" : out(openGame(g), "Open in Clutch", "go")}
<p class="ft">Sealed before tip, graded after the final. ${out(ref(g.path, "game"), "The game at clutchledger.com")}</p>`;
  const title = `Clutch box: ${g.away.nickname} ${vs(g)} ${g.home.nickname}, ${shortDate(g.date)}`;
  const path = embedPath(g);
  return { path, embed: true, title, html: shell({ path, title, description: `An embeddable box with Clutch's number for ${g.away.name} ${vs(g)} ${g.home.name} on ${shortDate(g.date)}: the teams, the tip time and the call.`, inner }) };
}

function tonightBox(m) {
  const date = m.tonight;
  const games = date ? m.nights[date] ?? [] : [];
  // Eight games at most, so the box never scrolls inside someone else's page: on a bigger night
  // the finished games give way first, the rest stay in tip order, and a link opens all of them.
  const done = (g) => g.status === "final" || g.status === "postponed";
  const shown = games.length > TONIGHT_MAX ? [...games.filter((g) => !done(g)), ...games.filter(done)].slice(0, TONIGHT_MAX).sort((a, b) => games.indexOf(a) - games.indexOf(b)) : games;
  const rows = shown.map((g) => {
    const right = g.hasCall ? `${esc(g.side.team.abbreviation)} ${pct(g.side.prob)}%` : "--";
    const sub = g.status === "final" ? (g.grade === "right" || g.grade === "missed" ? gradeText(g) : "Final") : g.status === "postponed" ? "Postponed" : g.status === "live" || g.status === "halftime" ? "Live" : g.tipUtc ? `${timeET(g.tipUtc)}` : "";
    return `<li>${out(ref(g.path, "tonight"), `<span class="g"><span class="m">${esc(g.away.abbreviation)} @ ${esc(g.home.abbreviation)}</span><span class="k">${esc(sub)}</span><span class="n">${right}</span>${g.hasCall && g.status !== "final" ? strip(g.side.prob) : ""}</span>`)}</li>`;
  }).join("");
  const inner = `<div class="hd">${out(ref("/", "tonight"), "Clutch", "b")}<span class="k">${date ? `NBA · ${esc(dayLabel(date))} · Win probability` : "NBA · Win probability"}</span></div>
${games.length ? `<ul class="gs">${rows}</ul>` : '<p class="k">No games on the schedule yet.</p>'}${shown.length < games.length ? `<p class="all">${out(ref("/tonight/", "tonight"), `All ${games.length} games →`)}</p>` : ""}
<p class="ft">Every number sealed before tip, graded after the final. ${out(ref("/tonight/", "tonight"), "More at clutchledger.com")}</p>`;
  return { path: "/embed/tonight/", embed: true, title: "Clutch box: NBA win probability tonight", html: shell({ path: "/embed/tonight/", title: "Clutch box: NBA win probability tonight", description: "An embeddable box with Clutch's win probability for every NBA game of the night.", inner }) };
}

/** A team's next game: the raw row, its page view, the opponent and the team's own win probability (null until there is a number). */
function nextFor(t, m) {
  const nextRaw = m.raw.upcoming.find((g) => g.home_team_id === t.id || g.away_team_id === t.id);
  const v = nextRaw ? m.gameById[nextRaw.id] : null;
  const p = v?.hasCall ? v.homeProb : nextRaw && m.raw.preds[nextRaw.id] ? +m.raw.preds[nextRaw.id].home_win_prob : null;
  const side = nextRaw && p != null ? pickSide(p, m.T[nextRaw.home_team_id], m.T[nextRaw.away_team_id]) : null;
  const mine = side ? (side.team.id === t.id ? side.prob : 1 - side.prob) : null;
  const opp = nextRaw ? m.T[nextRaw.home_team_id === t.id ? nextRaw.away_team_id : nextRaw.home_team_id] : null;
  return { nextRaw, v, mine, opp };
}

function teamBox(t, m) {
  const slug = teamSlug(t);
  const { nextRaw, v, mine, opp } = nextFor(t, m);
  const lastCall = m.calls.find((c) => c.matchup.split(" @ ").includes(t.abbreviation));
  const chance = (m.seasonBoard?.teams ?? []).find((x) => x.team_id === t.id)?.playoff_pct;
  const target = v?.path ?? m.teamPath(t);
  const next = nextRaw
    ? `<div>${out(ref(target, "team"), `<span class="k">Next · ${esc(dayLabel(nextRaw.game_date))}${nextRaw.game_time_utc ? ` · ${esc(timeET(nextRaw.game_time_utc))}` : ""}</span><br><span class="m">${nextRaw.home_team_id === t.id ? "vs" : "at"} ${esc(opp.name)}</span>`)}</div>
<div><span class="big">${mine == null ? "--" : `${pct(mine)}%`}</span> <span class="k">${mine == null ? "Clutch's number lands the morning of the game" : `${esc(t.nickname)} win probability`}</span>${mine == null ? "" : strip(mine)}</div>`
    : '<p class="k">No games on the schedule yet.</p>';
  const last = lastCall ? `<p class="k">Last call · ${esc(shortDate(lastCall.game_date))} · ${esc(lastCall.matchup)} · ${esc(lastCall.pick)} ${Math.round(lastCall.claimed_pct)}% · <span class="m">${lastCall.correct ? "✓ Right" : "✗ Wrong"}</span></p>` : "";
  const inner = `<div class="hd">${out(ref(m.teamPath(t), "team"), "Clutch", "b")}<span class="k">${esc(t.name)}</span></div>
${next}
${last}${chance != null ? `<p class="k">Playoff chance · ${esc(chanceText(chance))}</p>` : ""}
<p class="ft">Sealed before tip, graded after the final. ${out(ref(m.teamPath(t), "team"), `Every ${esc(t.nickname)} game at clutchledger.com`)}</p>`;
  const path = `/embed/team/${slug}/`;
  const title = `Clutch box: ${t.name} next game`;
  return { path, embed: true, title, html: shell({ path, title, description: `An embeddable box with Clutch's win probability for the next ${t.name} game, the last graded call and the playoff chance.`, inner }) };
}

function widgetPage(m) {
  const code = (src, h, label, href) => `<iframe src="${ORIGIN}${src}" width="100%" height="${h}" style="border:0;max-width:420px" title="${label}" loading="lazy"></iframe>
<p><a href="${ORIGIN}${href}">${label}</a> · Clutch</p>`;
  const hou = m.byAbbr.HOU ?? m.raw.teams[0];
  // The one-game example: tonight's first game still to tip with a number, else any with one, else tonight's first, else the latest game with a page.
  const night = m.nights[m.tonight] ?? [];
  const ex = night.find((g) => g.hasCall && g.status === "scheduled") ?? night.find((g) => g.hasCall) ?? night[0] ?? m.pageGames[m.pageGames.length - 1];
  const exName = ex ? `${ex.away.nickname} ${vs(ex)} ${ex.home.nickname}` : "";
  const gameCode = ex ? code(embedPath(ex), GAME_H, `${exName} · Clutch's number`, ex.path) : "";
  const tonightList = night.map((g) => `<li><code>${esc(embedPath(g))}</code> · ${esc(g.away.nickname)} ${vs(g)} ${esc(g.home.nickname)}</li>`).join("");
  const tonightCode = code("/embed/tonight/", TONIGHT_H, "NBA win probability tonight", "/tonight/");
  const teamCode = code(`/embed/team/${teamSlug(hou)}/`, 280, `${hou.name} win probability`, m.teamPath(hou));
  const houBadge = `${ORIGIN}${badgePath(teamSlug(hou))}`;
  const badgeMd = `[![${hou.name} win probability · Clutch](${houBadge})](${ORIGIN}${m.teamPath(hou)})`;
  const badgeHtml = `<a href="${ORIGIN}${m.teamPath(hou)}"><img src="${houBadge}" alt="${hou.name} win probability · Clutch" height="20"></a>`;
  const recordMd = `[![Clutch's graded NBA calls](${ORIGIN}${badgePath("record")})](${ORIGIN}/ledger/)`;
  const teams = m.raw.teams.slice().sort((a, b) => a.name.localeCompare(b.name)).map((t) => `<code>${esc(teamSlug(t))}</code>`).join(" · ");
  const body = `<div class="wrap r"><div class="rhead"><span class="kick">For fan sites · Free</span><h1 class="rh1">Put Clutch's number on your site.</h1><p class="rdeck">Small boxes for blogs, podcasts' and channels' pages, newsletters' web pages and team sites: one game, tonight's games, or your team's next game, each with Clutch's win probability. Free, no sign-up, no tracking in the box, and they update by themselves four times a day.</p></div>
<div class="body">
${ex ? `<section class="blk" aria-labelledby="game"><h2 id="game">One game</h2><p>Both teams, the tip time (Eastern), Clutch's number for the side it favors and an Open in Clutch button. After the final, the box shows Clutch's call and whether it was right. No score and no stats, live or final.</p>
<iframe class="gap" src="${esc(embedPath(ex))}" width="100%" height="${GAME_H}" title="Preview: ${esc(exName)}" loading="lazy"></iframe>
<p class="gap">Copy this into your page's HTML:</p><pre class="scroll"><code>${esc(gameCode)}</code></pre>
<p class="gap">Every game has a box: take the game's address on clutchledger.com and put <code>/embed</code> in front of <code>/games/</code>, in both addresses.</p>${tonightList ? `<details class="gap"><summary>Tonight's boxes</summary><ul class="note">${tonightList}</ul></details>` : ""}</section>` : ""}
<section class="blk" aria-labelledby="tonight"><h2 id="tonight">Tonight's games</h2><p>The next NBA night, up to eight games, each with Clutch's number for the side it favors and the tip time (Eastern); after the final, whether Clutch was right. On a bigger night the box links to all of them.</p>
<iframe class="gap" src="/embed/tonight/" width="100%" height="${TONIGHT_H}" title="Preview: NBA win probability tonight" loading="lazy"></iframe>
<p class="gap">Copy this into your page's HTML:</p><pre class="scroll"><code>${esc(tonightCode)}</code></pre></section>
<section class="blk" aria-labelledby="team"><h2 id="team">Your team's next game</h2><p>One team: its next game with Clutch's win probability, its last graded call and its playoff chance.</p>
<iframe class="gap" src="/embed/team/${esc(teamSlug(hou))}/" width="100%" height="280" title="Preview: ${esc(hou.name)} next game" loading="lazy"></iframe>
<p class="gap">Copy this, then put your team's name in the two addresses in place of <code>${esc(teamSlug(hou))}</code>:</p><pre class="scroll"><code>${esc(teamCode)}</code></pre>
<details class="gap"><summary class="mono">The 30 team names</summary><p class="note">${teams}</p></details></section>
<section class="blk" aria-labelledby="badge"><h2 id="badge">A badge, where a box won't fit</h2><p>GitHub, Substack and most forums won't show a box, but they show an image. The badge is one line, your team's next game with Clutch's number or the season's graded record, and it updates with the site.</p>
<p class="gap"><img src="${badgePath(teamSlug(hou))}" alt="${esc(hou.name)} win probability · Clutch" height="20"> <img src="${badgePath("record")}" alt="Clutch's graded NBA calls" height="20"></p>
<p class="gap">Markdown (GitHub, Discourse forums, many blogs), with your team's name in both addresses in place of <code>${esc(teamSlug(hou))}</code>:</p><pre class="scroll"><code>${esc(badgeMd)}</code></pre>
<p class="gap">HTML, for any page or newsletter that takes it:</p><pre class="scroll"><code>${esc(badgeHtml)}</code></pre>
<p class="gap">The season's record:</p><pre class="scroll"><code>${esc(recordMd)}</code></pre></section>
<section class="blk" aria-labelledby="rules"><h2 id="rules">The small print</h2><p>Use the boxes and badges on any site, free, as long as the box and the line under it stay as they are. Not for sites that take money on game results, or that send readers to one. The boxes set no cookies, run no scripts and count nothing about your readers: a box counts only the name of the site it is on and which box it is, so we know where Clutch is read. Links open clutchledger.com or the Clutch app in a new tab, tagged so we can tell a box sent the visit. Clutch is analytics for fans, with no affiliate links.</p>
<p>Using a box, or want one that isn't here? Tell us where through <a href="/support/">Support</a>: it's how we know who to tell before a box changes.</p></section>
</div></div>`;
  const title = "Free NBA win probability widget for your site · Clutch";
  return { path: "/widget/", title, html: page({ path: "/widget/", title, description: "Embed Clutch's NBA win probability on your blog or team site: tonight's games or your team's next game, free, no sign-up, no tracking, updated four times a day.", body, current: "", og: "default" }) };
}

/** The one-game box's height in the code: its lines fit from 280 px wide (measured: 275 px at 320, 300 at 280). */
const GAME_H = 300;
/** The tonight box: at most eight games; its height in the code fits them and the "All N games" link from 280 px wide (measured: 499 px at 320, 525 at 280; a final night's longer lines get the rest). */
const TONIGHT_MAX = 8;
const TONIGHT_H = 560;

export function embedPages(m) {
  return [...m.pageGames.map(gameBox), tonightBox(m), ...m.raw.teams.map((t) => teamBox(t, m)), widgetPage(m)];
}

export const BADGE = "/badge/";
export const badgePath = (name) => `${BADGE}${name}.svg`;

/** The badge files: /badge/<team>.svg (the team's next game) and /badge/record.svg (the season's graded record). */
export function badgeFiles(m) {
  const team = (t) => {
    const { nextRaw, mine, opp } = nextFor(t, m);
    const where = nextRaw ? (nextRaw.home_team_id === t.id ? "vs" : "at") : "";
    const day = nextRaw ? shortDate(nextRaw.game_date) : "";
    const message = !nextRaw ? `${t.nickname} · no games scheduled` : mine == null ? `${t.nickname} ${where} ${opp.nickname} · ${day} · number on game day` : `${t.nickname} ${pct(mine)}% ${where} ${opp.nickname} · ${day}`;
    const alt = !nextRaw || mine == null ? `Clutch: ${message}` : `Clutch: ${t.name} ${pct(mine)}% win probability ${where} the ${opp.name}, ${day}`;
    return { path: badgePath(teamSlug(t)), text: message, body: badgeSvg("Clutch", message, alt) };
  };
  const r = m.record;
  const record = r?.n ? `${rec(r.hits, r.n)} · ${Math.round((r.hits / r.n) * 100)}% right` : "first calls graded soon";
  return [
    ...m.raw.teams.map(team),
    { path: badgePath("record"), text: record, body: badgeSvg("Clutch Ledger", record, `Clutch's graded NBA calls this season: ${record}`) },
  ];
}
