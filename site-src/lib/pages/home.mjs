// The front page (direction E, approved): the paper's language and the LED
// scoreboard. Every number on it is tonight's real one, or says why not.
// On a phone the first screen holds one button and tonight's LED game card;
// the page keeps six blocks (owner, 2026-10-27): the hero with the game of the
// night, tonight's games, three moves, the Ledger, Free and Pro, the close.
// The questions moved to /faq/, the free paper's cards to /faq/ and /pricing/.

import { page, esc, bar, APP_STORE, ORIGIN, PLAY, PLAY_PRO, WEB_APP_LIVE, LAUNCH_ON, LAUNCH_WORDS, passLink, webAppLink, playWords, priceFig, playNight } from "../html.mjs";
import { board, gameCard, lineIsWhy, scoreLine, statusText, tonightOpen } from "../parts.mjs";
import { pct, callPoints, comparisons, opener, verdictOf, rec, shortHash, RATE_FLOOR, REGULAR_SEASON_START } from "../copy.mjs";
import { longDate, dayLabel, shortDate, weekday, timeET, countWord, shift } from "../time.mjs";
import { FRONT_FREE, FRONT_PRO, PLAN } from "../../content/features.mjs";
import { worstMiss, lastGradedNight } from "../model.mjs";
import { organizationLd } from "../../content/company.mjs";

/**
 * The game of the night: the one the morning's publisher named — the free
 * predictions/today snapshot's clutch_pick_of_day, the game the app leads
 * with for every tier (owner, 2026-10-27: one rule, set in the publisher).
 * Without that id, or when it isn't on the night's list: the biggest matchup
 * still to be decided (two teams' win totals, the desk's proxy for interest).
 */
export function gameOfTheNight(games, publishedId = null) {
  const named = publishedId ? games.find((g) => g.id === publishedId && g.status !== "postponed") : null;
  if (named) return named;
  const open = games.filter((g) => g.status !== "final" && g.status !== "postponed");
  const pool = (open.length ? open : games).filter((g) => g.status !== "postponed");
  const withCall = pool.filter((g) => g.hasCall);
  return (withCall.length ? withCall : pool).slice().sort((a, b) => b.interest - a.interest)[0] ?? null;
}

/** "Clutch had the Spurs at 55%. The Knicks won 94–90." from a graded call. */
function missSentence(m, c) {
  const [awayAb, homeAb] = c.matchup.split(" @ ");
  const [as, hs] = String(c.final).split("-").map(Number);
  const pick = m.byAbbr[c.pick], winAb = as > hs ? awayAb : homeAb, win = m.byAbbr[winAb];
  const score = `${Math.max(as, hs)}–${Math.min(as, hs)}`;
  return `Clutch had the ${pick?.nickname ?? c.pick} at ${Math.round(c.claimed_pct)}%. The ${win?.nickname ?? winAb} won ${score}.`;
}

function tickerItems(m, games, tonightIsToday) {
  const it = [];
  for (const g of games.filter((g) => g.status === "live" || g.status === "halftime")) it.push(`${scoreLine(g).replace(/ · /, " ")} ${statusText(g)}`);
  const open = games.filter((g) => g.status === "scheduled");
  const first = open.map((g) => g.tipUtc).filter(Boolean).sort()[0];
  if (games.length) {
    const n = games.length;
    const when = tonightIsToday ? "tonight" : dayLabel(games[0].date);
    it.push(`${n} ${n === 1 ? "game" : "games"} ${when}${first ? ` · first tip ${timeET(first)}` : ""}`);
  } else it.push("No games on the schedule yet");
  if (games.some((g) => g.preseason)) it.push("Preseason · Your calls count for points");
  const sealed = games.filter((g) => g.receipt?.state === "sealed");
  if (sealed.length && sealed.length === games.filter((g) => g.status !== "postponed").length) {
    const t = sealed.map((g) => g.receipt.seal.committedAt).sort()[0];
    it.push(`All ${countWord(sealed.length, false)} sealed ${timeET(t)}`);
  } else if (sealed.length) it.push(`${sealed.length} of ${games.length} sealed before tip`);
  for (const g of games.filter((g) => g.differs && g.status === "scheduled").slice(0, 2)) {
    const mTeam = g.market >= 0.5 ? g.home : g.away;
    it.push(`${g.away.abbreviation} @ ${g.home.abbreviation}: Clutch ${g.side.team.abbreviation} ${pct(g.side.prob)} · Market ${mTeam.abbreviation} ${pct(g.market >= 0.5 ? g.market : 1 - g.market)}`);
  }
  for (const g of games.filter((g) => g.status === "scheduled")) {
    const out = g.absences.find((a) => /^out$/i.test(a.status));
    if (out) { it.push(`${String(out.name).split(" ").slice(-1)[0].replace(/\b\w/g, (c) => c.toUpperCase())} out (${out.team})`); if (it.length > 8) break; }
  }
  if (m.record) it.push(`Ledger ${m.record.season}: ${rec(m.record.hits, m.record.n)}`);
  else it.push(`The ${m.current} Ledger starts ${shortDate(REGULAR_SEASON_START)}`);
  const y = shift(m.today, -1);
  const wm = worstMiss(m, y);
  const yCalls = m.calls.filter((c) => c.game_date === y);
  if (yCalls.length) it.push(`Last night ${yCalls.filter((c) => c.correct).length} of ${yCalls.length}`);
  if (wm) it.push(`Worst miss: ${wm.call.pick} at ${Math.round(wm.call.claimed_pct)}`);
  if (m.sealed > 0) it.push(`${m.sealed.toLocaleString("en-US")} games sealed before tip so far`);
  return it;
}

function proof(m) {
  const stage = m.record ? "season" : "opening";
  const r = m.record ?? m.last;
  let left;
  if (stage === "season") {
    const v = verdictOf(r);
    left = `<span class="kick">The Ledger · ${esc(r.season)}${r.retired ? " · The retired model" : ""}</span><span class="big">${rec(r.hits, r.n)}</span>
<h3>${r.n >= RATE_FLOOR ? `${r.hitRate.toFixed(1)}% right, in public.` : "Too early for a rate."}</h3>
<p>Written down before tip, graded after the final, misses included. Against always picking the home team: ${esc(v.line.toLowerCase())}.</p>`;
  } else {
    const o = opener(m.current, m.today, m.sealed, !!m.last);
    left = `<span class="kick">The Ledger · ${esc(m.current)}</span><span class="big">0–0</span><h3>${esc(o.title)}</h3><p>${esc(o.body)}</p>${o.sealedLine ? `<span class="mono amber">${esc(o.sealedLine)} ✓</span>` : o.sealedNote ? `<span class="note">${esc(o.sealedNote)}</span>` : ""}`;
  }
  left += `<a class="more" href="/ledger/">See every call →</a> <a class="more" href="/accuracy/">How accurate? →</a>`;
  let right = "";
  if (r) {
    const label = stage === "season" ? "" : `<span class="mono ink3">Last season · ${esc(r.season)}${r.retired ? " · The retired model" : ""} · ${r.n} graded calls</span>`;
    right += label;
    for (const c of comparisons(r)) {
      const v = (x, recd) => (c.small ? recd : x.toFixed(1));
      right += `<div class="cmp"><div class="cmp-h"><span class="t">${esc(c.title)}</span><span class="mono">The same ${c.n} games</span></div>
<div class="crow"><span>Clutch</span>${c.small ? "<span></span>" : bar(c.us, "amber")}<span class="d v amber">${v(c.us, c.usRec)}</span></div>
<div class="crow"><span class="ink3">${esc(c.themLabel)}</span>${c.small ? "<span></span>" : bar(c.them, "cream")}<span class="d v">${v(c.them, c.themRec)}</span></div></div>`;
    }
    // (Model only against the market — the games the two disagree on — is on the Ledger page.)
  }
  right += `<div class="boxlink"><span><b>Every morning has a receipt</b>The night's calls are hashed and made public before the first tip. Nobody can change them after, not even us.</span><a href="/receipts/">Check it →</a></div>`;
  // The open data on the front page itself, not only in the footer (owner,
  // 2026-10-27: a public-APIs list's reviewer looked here and couldn't find it).
  right += `<div class="boxlink"><span><b>Every number is open data</b>This season's win probabilities as JSON and CSV: free, no key, CC BY 4.0.</span><a href="/data/">Get the data →</a></div>`;
  return `<div class="proof"><div class="proof-l" data-tour="ledger">${left}</div><div class="proof-r">${right}</div></div>`;
}

function missBand(m) {
  const y = shift(m.today, -1);
  const c = m.corrections;
  const link = (gid) => m.pageGames.find((g) => g.id === gid)?.path ?? "/ledger/";
  if (c && c.kind === "correction" && c.headline && c.date >= shift(m.today, -2)) {
    return `<a class="miss" href="${link(c.game_id)}"><span class="mono">${c.date === y ? "Last night's worst miss" : `Worst miss · ${esc(shortDate(c.date))}`}</span><span class="q">${esc(c.headline)}</span><span class="go">What fooled it →</span></a>`;
  }
  const wm = worstMiss(m, y);
  if (wm) return `<a class="miss" href="${link(wm.call.game_id)}"><span class="mono">Last night's worst miss</span><span class="q">${esc(missSentence(m, wm.call))}</span><span class="go">The game →</span></a>`;
  const d = lastGradedNight(m, m.today);
  const last = d && worstMiss(m, d);
  if (last) return `<a class="miss" href="/ledger/"><span class="mono">The Ledger's last miss · ${esc(shortDate(d))}</span><span class="q">${esc(missSentence(m, last.call))}</span><span class="go">Every call →</span></a>`;
  return "";
}

/** What tonight's games are doing, in a sentence. */
function tonightState(games, firstSeal) {
  const finals = games.filter((g) => g.status === "final"), live = games.filter((g) => g.status === "live" || g.status === "halftime");
  const graded = finals.filter((g) => g.grade === "right" || g.grade === "missed"), held = graded.filter((g) => g.grade === "right").length;
  if (finals.length === games.length) return graded.length ? `All final: Clutch's calls held in ${held} of ${graded.length}.` : "All final.";
  if (live.length) return `${live.length} live now${finals.length ? `, ${finals.length} final` : ""}. Every number was sealed before its tip.`;
  return firstSeal ? `Every number was sealed at ${timeET(firstSeal)} and can't change.` : "Every number is sealed before its tip and can't change after.";
}

/** The nights after tonight, when tonight is light (the preseason, a quiet Monday): one row a night, each opening that night's games in the app. */
function comingUp(m, tonight, n) {
  if (!tonight || n >= 5) return "";
  const by = new Map();
  for (const g of m.games) if (g.date > tonight && g.status !== "postponed") { if (!by.has(g.date)) by.set(g.date, []); by.get(g.date).push(g); }
  const nights = [...by.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).slice(0, 5);
  if (!nights.length) return "";
  return `<div class="ahead"><span class="mono ink3">Coming up</span>${nights.map(([d, gs]) => {
    const first = gs.map((g) => g.tipUtc).filter(Boolean).sort()[0];
    return `<a class="arow" href="${playNight(d)}"><span class="d">${esc(dayLabel(d))}</span><span>${gs.length} ${gs.length === 1 ? "game" : "games"}${gs.some((g) => g.preseason) ? ", preseason" : ""}${first ? ` · first tip ${esc(timeET(first))}` : ""}</span><span class="go" aria-hidden="true">›</span></a>`;
  }).join("")}<p class="note gap">Each night's numbers land that morning.</p></div>`;
}

/**
 * "Clutch in a minute", the front page's guide (static/tour.js runs it). Its
 * words live here, in a <template>, so the betting-words check reads them and
 * the App Store link carries the page's campaign. Four stops, each on a real
 * element the page marks with data-tour (the script leaves out any that isn't
 * on tonight's page and counts the rest), then the end card.
 */
function guide(lead, isToday, play) {
  const after = lead && lead.status !== "scheduled";
  const num = after
    ? "How likely Clutch thought each team was to take the game — set that morning, before tip."
    : isToday
      ? "How likely Clutch thinks each team is to take tonight's game — set every morning, before tip."
      : "How likely Clutch thinks each team is to take the game — set that morning, before tip.";
  const stops = [
    ["num", "This is Clutch's number.", num],
    ["why", "And this is why.", "The key reasons behind the number, in plain words."],
    ["call", "Now make your call.", "Pick a side before tip. Upsets you call score more."],
    ["ledger", "Every number is sealed before tip.", "Graded after the final, in public — misses included."],
  ];
  const [endLine, endLinks] = LAUNCH_ON
    ? [`Sign in with Apple or Google and claim your Launch Pass: ${LAUNCH_WORDS}.`, `<a class="btn" href="${passLink("tour-end")}">Claim your Launch Pass →</a><a class="btn ghost" href="${APP_STORE}">Get the iPhone app</a>`]
    : WEB_APP_LIVE
      ? ["Call every game in your browser, or on iPhone.", `<a class="btn" href="${webAppLink("tour-end")}">${play}</a><a class="btn ghost" href="${APP_STORE}">Get the iPhone app</a>`]
      : ["Call every game in the iPhone app. Every number is on this site too.", `<a class="btn" href="${APP_STORE}">Get the iPhone app →</a>`];
  return `<template id="tour"><div class="tour">
<div class="tdim"></div><div class="tdim"></div><div class="tdim"></div><div class="tdim"></div><div class="tring"></div>
<div class="tcard gl" role="dialog" aria-modal="true" aria-labelledby="tour-h" aria-describedby="tour-p" tabindex="-1">
<p class="tn"><span class="tc"></span>Clutch in a minute<span class="te"> · Done</span></p>
<h2 id="tour-h"></h2>
<p id="tour-p"></p>
<div class="tb"><button type="button" class="tsk" data-a="skip">Skip</button><button type="button" class="btn ghost" data-a="back">Back</button><button type="button" class="btn" data-a="next">Next</button></div>
<div class="tend">${endLinks}<button type="button" class="btn ghost" data-a="done">Done</button><p class="note">Replay it any time: 1-minute tour, under Three moves a night.</p></div>
</div>
<ol hidden>${stops.map(([k, h, p]) => `<li data-s="${k}"><b>${esc(h)}</b><i>${esc(p)}</i></li>`).join("")}<li class="end"><b>That's Clutch.</b><i>${esc(endLine)}</i></li></ol>
</div></template>`;
}

export function homePage(m) {
  const tonight = m.tonight;
  const games = tonight ? m.nights[tonight] ?? [] : [];
  const isToday = tonight === m.today;
  const published = tonight ? m.raw.snaps?.[`predictions/today/${tonight}`]?.body?.clutch_pick_of_day?.game_id ?? null : null;
  const lead = gameOfTheNight(games, published);
  const liveOne = games.find((g) => (g.status === "live" || g.status === "halftime") && g.id !== lead?.id);
  const n = games.length;
  const right = !tonight ? "No games scheduled" : isToday ? `${countWord(n)} ${n === 1 ? "game" : "games"} tonight` : `<span class="hide-s">No games tonight · </span>Next ${esc(dayLabel(tonight))}`;

  const leadBoard = lead
    ? `<div class="inst a-${lead.away.abbreviation} h-${lead.home.abbreviation}"><span class="blob l" aria-hidden="true"></span><span class="blob r" aria-hidden="true"></span>
${board(lead, { kicker: isToday ? "Game of the night" : `Next up<span class="hide-s"> · ${esc(dayLabel(lead.date))}</span>`, link: lead.path, tour: true })}
${liveOne ? `<a class="livechip gl d" href="${liveOne.path}" data-gid="${liveOne.id}" data-a="${liveOne.away.abbreviation}" data-h="${liveOne.home.abbreviation}"><span class="pulse" aria-hidden="true"></span><span data-live="sc">${esc(scoreLine(liveOne))}</span><span class="hot" data-live="st">${esc(statusText(liveOne))}</span></a>` : ""}</div>`
    : `<div class="panel"><h2>The schedule isn't out yet.</h2><p class="sub">Clutch's numbers return with the next night of games.</p></div>`;

  const ticks = tickerItems(m, games, isToday);
  const ticker = `<div class="ticker gl" role="region" aria-label="Stop press"><span class="lbl">Stop press</span><div class="view"><div class="tick"><span>${ticks.map(esc).join("</span><span>")}</span><span aria-hidden="true">${ticks.map(esc).join('</span><span aria-hidden="true">')}</span></div></div></div>`;

  const sealedAll = games.length && games.every((g) => g.status === "postponed" || g.receipt?.state === "sealed");
  const firstSeal = sealedAll ? games.filter((g) => g.receipt?.seal).map((g) => g.receipt.seal.committedAt).sort()[0] : null;
  const tonightSub = !tonight
    ? "No games on the schedule yet."
    : isToday
      ? `${countWord(n)} ${n === 1 ? "game" : "games"}. ${tonightState(games, firstSeal)}`
      : `No games tonight. The next night is ${weekday(tonight)}, ${shortDate(tonight)}: ${countWord(n, false)} ${games.some((g) => g.preseason) ? "preseason " : ""}${n === 1 ? "game" : "games"}. Every number is sealed before its tip.`;

  const latestSeal = m.receipts.find((r) => r.kind === "seal");
  // Move 02's pair, away left and home right: Clutch's side tagged, the other shown as a reader's
  // call in the one selected look the app uses (fill, ✓, "Your call"), the upset scoring more.
  const pts = lead?.hasCall ? [lead.away, lead.home].map((t) => { const home = t.id === lead.home.id; return [t, callPoints(home ? lead.homeProb : 1 - lead.homeProb), t.id === lead.side.team.id]; }) : null;

  const nextTip = games.filter((g) => g.status === "scheduled" && g.tipUtc).map((g) => g.tipUtc).sort()[0];
  const lastH = !tonight ? "The paper returns with the next game." : isToday && games.some((g) => g.hasCall) ? "Tonight's paper is out." : isToday ? "Tonight's paper is being set." : `The next paper is out ${weekday(tonight)}.`;

  // One button (owner, 2026-10-27): the web app; the iPhone app is a small link under it.
  // Its one name (html.mjs playWords) is the masthead's, the closing's and the Free plan's too.
  const play = playWords(tonightOpen(m));
  const cta = (where) => WEB_APP_LIVE
    ? `<div class="cta"><a class="btn lg" href="${webAppLink(where)}">${play}</a><a class="alt" href="${APP_STORE}">Get the iPhone app</a></div>`
    : `<div class="cta"><a class="btn lg" href="${APP_STORE}">Get the iPhone app →</a><a class="alt" href="/ledger/">Read the Ledger</a></div>`;
  const promise = LAUNCH_ON
    ? `<div class="promise"><span><a href="${passLink("hero")}"><b class="o">Launch Pass</b> · Pro free on the web →</a></span></div>`
    : WEB_APP_LIVE
      ? '<div class="promise"><span>Free</span><span>No download</span><span>Public Ledger</span></div>'
      : '<div class="promise"><span>Free</span><span>Public Ledger</span><span>Coming to your browser</span></div>';

  const body = `<section class="heroband"><span class="dots" aria-hidden="true"></span><div class="wrap">
<div class="edition"><span><span class="ed"></span> Edition<span class="hide-s"> · ${esc(m.current)}</span></span><span class="hide-s">${esc(longDate(m.today))}</span><span>${right}</span></div>
<h1 class="h1">Call every game.<br><em>Beat Clutch.</em></h1>
<div class="hero"><div class="hero-l">
<p class="lede">Clutch puts a number on every NBA game, tells you why, and seals it before tip. Make your own call — the morning grades you both.</p>
${cta("hero")}
${promise}
</div><div class="hero-r">${leadBoard}
<button class="tchip" type="button" data-tour-go>New here? <strong>Take the 1-minute tour</strong><span class="amber" aria-hidden="true">→</span></button></div></div></div>
${ticker}</section>

<section class="sec t" id="tonight" aria-labelledby="tonight-h"><div class="wrap">
<div class="shead"><div><h2 class="h2" id="tonight-h">${isToday ? "Tonight, in numbers" : "Next up, in numbers"}</h2><p class="sub">${esc(tonightSub)}</p></div>${tonight ? `<a class="more" href="/tonight/">All of ${isToday ? "Tonight" : esc(dayLabel(tonight))} →</a>` : ""}</div>
<div class="cards">${games.map((g) => gameCard(g, g.id === lead?.id && lineIsWhy(g))).join("")}</div>
${comingUp(m, tonight, games.length)}
</div></section>

<section class="sec" id="how" aria-labelledby="how-h"><div class="wrap">
<h2 class="h2" id="how-h">Three moves a night. <em>That's the whole game.</em></h2>
<button class="tl" type="button" data-tour-go>1-minute tour</button>
<div class="g3 mt">
<div class="move"><span class="no" aria-hidden="true">01</span><h3>Clutch makes its call</h3><p>Every morning, a win probability for every game, from form, rest, travel, the injury report and the market. Sealed before the first tip.</p><span class="hash">${latestSeal ? `sha256 ${esc(shortHash(latestSeal.sha256))}` : "sha256 · the first seal lands Oct 3"}</span></div>
<div class="move"><span class="no" aria-hidden="true">02</span><h3>You make yours</h3><p>Pick a side before tip. Upsets you call score more.</p>${pts ? `<span class="pills">${pts.map(([t, p, clutch]) => (clutch ? `<span class="pill">${esc(t.nickname)} +${p} pts · <span class="amber">Clutch's call</span></span>` : `<span class="pill you">✓ Your call · ${esc(t.nickname)} +${p} pts</span>`)).join("")}</span>` : ""}</div>
<div class="move"><span class="no" aria-hidden="true">03</span><h3>The morning grades you both</h3><p>Every call goes in the Ledger. Beat Clutch and the night goes in your Scrapbook.</p><span class="pills"><span class="chip win">✓ Right</span><span class="chip loss">✗ Missed</span></span></div>
</div></div></section>

<section class="sec" id="ledger" aria-label="The Ledger"><div class="wrap">
${proof(m)}
${missBand(m)}
</div></section>

<section class="sec" id="pricing" aria-labelledby="price-h"><div class="wrap">
<h2 class="h2 hm" id="price-h">Free for good. <em>Pro when you want the whole lab.</em></h2>
<div class="plans">
<div class="plan"><h3>Free</h3><div class="price"><span class="d">$0</span><span>for good</span></div><ul>${FRONT_FREE.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><a class="btn ghost" href="${PLAY}">${WEB_APP_LIVE ? play : "Get the free iPhone app"}</a></div>
<div class="plan pro"><span class="tag">${PLAN.trialDays} days free on annual</span><h3>Pro</h3><div class="price"><span class="d">${priceFig(PLAN.monthly)}</span><span>a month · or ${PLAN.annual} a year</span></div>${LAUNCH_ON ? '<p class="offer">Free on the web during the launch, with the Launch Pass.</p>' : ""}<ul>${FRONT_PRO.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>${LAUNCH_ON ? `<a class="btn" href="${passLink("pricing")}">Claim your Launch Pass</a>` : `<a class="btn" href="${PLAY_PRO}">Try Pro free for ${PLAN.trialDays} days${WEB_APP_LIVE ? "" : " on iPhone"}</a>`}</div>
</div>
<p class="note gap">Prices in US dollars. Cancel any time; Pro runs to the end of the period you paid for. <a href="/pricing/">Everything in Free and Pro →</a> · <a href="/refunds/">Refunds</a> · <a href="/terms/">Terms</a></p>
</div></section>

<section class="sec" aria-labelledby="last-h"><div class="wrap"><div class="last">
<span class="mono ink3">${nextTip ? `Next tip ${esc(dayLabel(tonight))} · ${esc(timeET(nextTip))}` : esc(longDate(m.today))}</span>
<h2 class="h2" id="last-h">${esc(lastH)}</h2>
${cta("closing")}
<a class="more" href="/faq/">Questions, answered →</a>
</div></div></section>
${guide(lead, isToday, play)}`;

  const desc = `Clutch puts a win probability on every NBA game, tells you why, and seals it before tip. Call every game free ${WEB_APP_LIVE ? "in your browser or on iPhone" : "on iPhone"} — the public Ledger grades every call.`;
  const ld = [
    // alternateName: Google's site name for search results reads WebSite, and
    // "Clutch" alone is shared with ClutchPoints and Clutch.co.
    { "@context": "https://schema.org", "@type": "WebSite", name: "Clutch", alternateName: "Clutch Ledger", url: ORIGIN + "/", description: desc },
    organizationLd(ORIGIN),
  ];
  // The words people search come first ("NBA win probability"); the brand line
  // ("call every game, beat Clutch") stays in the h1 and the share card.
  const title = "Clutch — NBA win probability for every game, graded in public";
  return { path: "/", title, html: page({ path: "/", title, description: desc, body, current: "", og: "home", jsonld: ld, live: games.some((g) => g.status !== "final" && g.status !== "postponed"), tour: true }) };
}
