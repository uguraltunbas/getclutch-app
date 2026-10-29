// /tonight/ — one address that is always the next night of games: each game
// in a sentence (who Clutch favours and by how much, when it tips), the cards,
// and how last night's calls came out. The dated page (/games/<date>/) stays
// the night's permanent record; this one carries the "today" searches and
// keeps the links it earns from day to day.

import { page, esc, ORIGIN } from "../html.mjs";
import { gameCard } from "../parts.mjs";
import { pct } from "../copy.mjs";
import { longDate, mediumDate, shortDate, weekday, timeET } from "../time.mjs";
import { lastGradedNight } from "../model.mjs";
import { PLAYOFFS_PATH } from "./playoffs.mjs";

export const TONIGHT_PATH = "/tonight/";

function glance(g) {
  const name = `${g.away.nickname} at ${g.home.nickname}`;
  let line;
  if (g.status === "postponed") line = "postponed.";
  else if (g.status === "final" && g.homeScore != null) line = `final, ${g.away.abbreviation} ${g.awayScore}–${g.homeScore} ${g.home.abbreviation}.`;
  else if (g.status === "live" || g.status === "halftime") line = `live now${g.hasCall ? `; Clutch had the ${g.side.team.nickname} at ${pct(g.side.prob)}% before tip` : ""}.`;
  else if (g.hasCall) line = `${g.tipUtc ? `${timeET(g.tipUtc)}. ` : ""}Clutch gives the ${g.side.team.nickname} a ${pct(g.side.prob)}% chance to win${g.preseason ? " (preseason)" : ""}.`;
  else line = `${g.tipUtc ? `${timeET(g.tipUtc)}. ` : ""}Clutch's number lands the morning of the game.`;
  return `<li><a href="${g.path}">${esc(name)}</a>: ${esc(line)}</li>`;
}

export function tonightPage(m) {
  const date = m.tonight;
  const games = date ? m.nights[date] ?? [] : [];
  const isToday = date === m.today;
  const last = lastGradedNight(m, m.today);
  const lastCalls = last ? m.calls.filter((c) => c.game_date === last && c.season_type !== "Preseason") : [];
  const held = lastCalls.filter((c) => c.correct).length;
  const lastBlock = lastCalls.length
    ? `<section class="blk" aria-labelledby="lastnight"><h2 id="lastnight">${last === m.today ? "Earlier today" : `Last graded night, ${esc(shortDate(last))}`}</h2><p>Clutch's calls held in ${held} of ${lastCalls.length} ${lastCalls.length === 1 ? "game" : "games"}. Right and wrong, every one stays on the record. <a href="/games/${last}/">That night's games →</a> · <a href="/accuracy/">How accurate Clutch is →</a></p></section>`
    : "";
  let body;
  if (!games.length) {
    body = `<div class="wrap"><div class="rhead"><span class="kick">Tonight</span><h1 class="rh1">No NBA games on the schedule yet.</h1><p class="rdeck">This page shows the next night of games as soon as it is on the schedule, with Clutch's win probability for each.</p></div><div class="body">${lastBlock}</div></div>`;
  } else {
    const h1 = isToday ? "NBA predictions today" : `NBA predictions for ${weekday(date)}`;
    const deck = `${games.length} ${games.length === 1 ? "game" : "games"} ${isToday ? "tonight" : `on ${longDate(date)}`}. Clutch's win probability for each, sealed before tip, with the market's number beside it. Every one is graded after the final.`;
    body = `<div class="wrap"><div class="rhead"><span class="kick">${isToday ? "Tonight" : "Next up"} · ${esc(longDate(date))}</span><h1 class="rh1">${esc(h1)}</h1><p class="rdeck">${esc(deck)}</p></div>
<div class="body">
<section class="blk" aria-labelledby="glance"><h2 id="glance">At a glance</h2><ul class="spots">${games.map(glance).join("")}</ul></section>
<div class="cards">${games.map((g) => gameCard(g)).join("")}</div>
<p class="note">Amber is Clutch's number for the side it favours; the cream segment is the market's number for that side. Times are Eastern. <a href="/games/${date}/">This night's permanent page →</a> · <a href="${PLAYOFFS_PATH}">Every team's playoff chances →</a></p>
${lastBlock}
</div></div>`;
  }
  const title = date ? `NBA predictions tonight (${mediumDate(date)}): who wins every game · Clutch` : "NBA predictions tonight: who wins every game · Clutch";
  const description = games.length
    ? `Who wins tonight? Clutch's win probability for all ${games.length} NBA ${games.length === 1 ? "game" : "games"} on ${longDate(date)}, sealed before tip and graded after the final.`
    : "Who wins tonight? Clutch's win probability for every NBA game on the next night of the schedule, sealed before tip and graded after the final.";
  const ld = games.length ? {
    "@context": "https://schema.org", "@type": "ItemList",
    name: `NBA games, ${longDate(date)}`,
    itemListElement: games.map((g, i) => ({ "@type": "ListItem", position: i + 1, url: ORIGIN + g.path, name: `${g.away.name} at ${g.home.name}` })),
  } : null;
  return { path: TONIGHT_PATH, title, html: page({ path: TONIGHT_PATH, title, description, body, current: "tonight", og: "game", jsonld: ld, live: games.some((g) => g.status !== "final" && g.status !== "postponed") }) };
}

