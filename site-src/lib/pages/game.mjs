// /games/<date>/<away>-at-<home>/ — one game: the headline sentence, the
// instrument, why Clutch leans the way it does (the top three reasons only),
// who's out, and the page grading itself after the final. And
// /games/<date>/ — the night's games on one page.

import { page, esc, APP, APP_STORE, ORIGIN } from "../html.mjs";
import { board, gameCard, statusText, gradeChip } from "../parts.mjs";
import { pct, headlineFor, callPoints, receiptLine, shortHash, sealFileUrl, CALL_RULE, PRESEASON_DECK, rec, RATE_FLOOR, RECEIPTS_REPO } from "../copy.mjs";
import { longDate, mediumDate, shortDate, weekday, timeET, isoET } from "../time.mjs";

const the = (t) => `the ${t.nickname}`;

export function headline(g) {
  if (g.status === "postponed") return `${g.away.nickname} at ${g.home.nickname}: postponed.`;
  if (g.status === "final" && g.homeScore != null) {
    const homeWon = g.homeScore > g.awayScore;
    const [w, ws, l, ls] = homeWon ? [g.home, g.homeScore, g.away, g.awayScore] : [g.away, g.awayScore, g.home, g.homeScore];
    return `${w.nickname} ${ws}, ${l.nickname} ${ls}.`;
  }
  if (!g.hasCall) return `${g.away.nickname} at ${g.home.nickname}.`;
  return headlineFor(g.homeProb, g.home, g.away, g.preseason);
}

/** The deck: what Clutch said, the market beside it, and what happened. */
export function deck(g) {
  if (g.status === "postponed") return "Postponed. A postponed game has no tip-off, so there is nothing to seal or grade.";
  if (!g.hasCall) {
    if (g.status === "final") return "Final. Clutch published no number for this game.";
    return `Clutch's number for this game lands the morning of ${weekday(g.date)}, and it is sealed before tip.`;
  }
  const s = g.side, p = pct(s.prob);
  const where = s.isHome ? "at home against" : "on the road against";
  const mk = g.market == null ? "" : (() => {
    const mHome = g.market >= 0.5, team = mHome ? g.home : g.away, mp = pct(mHome ? g.market : 1 - g.market);
    return team.id === s.team.id ? ` The market has ${mp}%.` : ` The market differs: it has ${the(team)} at ${mp}%.`;
  })();
  if (g.status === "final") {
    const homeWon = g.homeScore > g.awayScore, winner = homeWon ? g.home : g.away;
    const said = `Clutch gave ${the(s.team)} a ${p}% chance before tip.`;
    if (g.grade === "preseason") return `${said} ${winner.id === s.team.id ? "They won" : `${capital(the(winner))} won`}. Preseason numbers are sealed, never graded.`;
    if (g.grade === "right") return `${said} The call held.${mk}`;
    if (g.grade === "missed") return `${said} ${capital(the(winner))} won.${mk}`;
    if (g.grade === "pending") return `${said} The Ledger grades it overnight.`;
    return `${said} Not graded: the Ledger counts only calls it can prove were made before tip, and this one isn't among them.`;
  }
  if (g.status === "live" || g.status === "halftime") return `Live. Before tip, Clutch gave ${the(s.team)} a ${p}% chance ${where} ${the(s.other)}.${mk}`;
  if (g.preseason) return `Preseason. Clutch gives ${the(s.team)} ${p}%, pulled toward 50/50. ${PRESEASON_DECK}`;
  const noMk = g.marketState === "none" ? " No market number yet, so Clutch's call is Model only." : "";
  return `Clutch gives ${the(s.team)} a ${p}% chance ${where} ${the(s.other)}.${mk}${noMk}`;
}
const capital = (s) => s[0].toUpperCase() + s.slice(1);

function sealLine(g, m) {
  const r = g.receipt;
  const parts = [`<span>${esc(receiptLine(r, g.date))}</span>`];
  if (r?.seal) parts.push(`<span>RECEIPT <a href="${sealFileUrl(r.seal)}">${esc(shortHash(r.seal.sha256))}</a></span>`);
  if (g.status !== "final" && g.status !== "postponed") parts.push(`<span>${g.preseason ? "PRESEASON: NOT GRADED" : "GRADED AFTER THE FINAL"}</span>`);
  if (g.hasCall && m.retired(g)) parts.push("<span>MADE BY THE RETIRED 2025-26 MODEL</span>");
  return `<div class="seal">${parts.join("")}</div>`;
}

function whySection(g, m) {
  if (!g.hasCall) return "";
  const s = g.side;
  const name = (dir) => (dir === "home" ? g.home : g.away).nickname;
  const rows = g.reasons.map((r, i) => `<p${i === 0 ? ' class="first"' : ""}><strong>${esc(r.label)}.</strong> Toward the ${esc(name(r.toward))}${r.share != null ? `: ${r.share}% of the call` : ""}.</p>`).join("");
  const none = '<p class="first">No single factor stood out on this one — the model landed close to its base rate. That usually means a genuine toss-up, not a hidden edge.</p>';
  const verb = g.status === "final" ? "leaned" : "leans";
  if (m.retired(g)) return `<section aria-labelledby="why"><h2 class="sh" id="why">Why Clutch ${verb} ${esc(s.team.nickname)}</h2><p class="sub">This number came from the model Clutch retired after 2025-26. Its reasons weren't written in plain words, so they aren't reprinted here; the rebuilt model explains every number it makes. The graded call stands on the Ledger exactly as it was.</p></section>`;
  return `<section aria-labelledby="why"><h2 class="sh" id="why">Why Clutch ${verb} ${esc(s.team.nickname)}</h2>
<div class="why">${rows || none}<p class="probox"><strong>Pro</strong> weighs every factor, shows the projected final, and Model only — Clutch's own number before the market. <a href="/pricing/">See Pro →</a></p></div></section>`;
}

function spotsSection(g) {
  const spots = (g.explain?.blind_spots ?? []).filter(Boolean).slice(0, 3);
  if (!spots.length || g.status === "final") return "";
  return `<section aria-labelledby="spots"><h2 class="sh s" id="spots">What Clutch couldn't see</h2><ul class="spots">${spots.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>`;
}

function outSection(g) {
  if (g.status === "final" || g.status === "postponed") return "";
  const rows = g.absences.slice(0, 10);
  const title = (n) => String(n).replace(/\b\w/g, (c) => c.toUpperCase());
  const listed = new Set(rows.map((r) => r.team));
  const body = rows.map((a) => `<tr><td class="m">${esc(a.team)}</td><td><b>${esc(title(a.name))}</b></td><td class="st">${esc(a.status)}</td><td>${esc(a.note)}</td></tr>`).join("")
    + [g.away, g.home].filter((t) => !listed.has(t.abbreviation)).map((t) => `<tr><td class="m">${esc(t.abbreviation)}</td><td class="ink3">Nobody listed</td><td></td><td></td></tr>`).join("");
  return `<section aria-labelledby="out"><h2 class="sh s" id="out">Who's out</h2>
<div class="scroll"><table class="tbl"><thead><tr><th scope="col">TEAM</th><th scope="col">PLAYER</th><th scope="col">STATUS</th><th scope="col">${g.explain ? "MINUTES" : "NOTE"}</th></tr></thead><tbody>${body}</tbody></table></div>
<p class="note">From the league's official injury report (ESPN's list when the report isn't out). If a status changes before tip, this page and the number update.</p></section>`;
}

function gradeSection(g) {
  if (g.status === "final") {
    const r = g.receipt;
    const proof = r?.seal ? ` The receipt — <a href="${sealFileUrl(r.seal)}">${esc(shortHash(r.seal.sha256))}</a>, committed ${esc(timeET(r.seal.committedAt))} — proves the call came first.` : "";
    const text = {
      right: `Clutch's call held.${proof} It's in the Ledger with every other graded call.`,
      missed: `Clutch missed this one.${proof} It stays in the Ledger, like every other call.`,
      preseason: "Preseason numbers are sealed but never graded: starters rest and rotations are experiments.",
      pending: "The Ledger grades last night's finals overnight; this page updates with it.",
      ungraded: "The Ledger grades only calls it can prove were made before tip. This one can't be shown to predate tip, so it isn't graded — and isn't counted.",
      nocall: "Clutch published no number for this game, so there is nothing to grade.",
    }[g.grade] ?? "";
    return `<section class="gradebox done" aria-labelledby="grade"><span class="d" aria-hidden="true">${g.homeScore == null ? "--·--" : `${g.awayScore}·${g.homeScore}`}</span><div><h2 id="grade">${esc(statusText(g))} ${gradeChip(g)}</h2><p>${text}</p></div></section>`;
  }
  if (g.status === "postponed") return "";
  const live = g.status === "live" || g.status === "halftime";
  return `<section class="gradebox" aria-labelledby="grade"><span class="d" aria-hidden="true">--·--</span><div><h2 id="grade">This page grades itself</h2><p>${live ? "Live now. " : ""}After the final you'll see the score, whether Clutch was right, and the receipt that proves the call came first.</p></div></section>`;
}

function aside(g, m, night) {
  const s = g.side;
  let call = "";
  if (g.status === "scheduled" && g.hasCall) {
    const fav = s.team, dog = s.other;
    const pf = callPoints(s.prob), pd = callPoints(1 - s.prob);
    call = `<section class="callcard" aria-labelledby="mk"><h2 id="mk">Make your call</h2><p>Call it before tip. ${esc(CALL_RULE.replace("Right calls", "Right calls"))}</p>
<div class="two"><a href="${APP}/games/${g.id}">${esc(fav.nickname)} · ${pf}</a><a class="ghost" href="${APP}/games/${g.id}">${esc(dog.nickname)} · ${pd}</a></div>
<small>Free, right here in your browser. No download.</small><a class="iph" href="${APP_STORE}"><span>On iPhone? Get the app</span><span class="amber">→</span></a></section>`;
  } else {
    call = `<section class="callcard" aria-labelledby="mk"><h2 id="mk">Call tonight's games</h2><p>Every game gets Clutch's call. Make yours before tip and the morning grades you both.</p><div class="two"><a href="${APP}/">Play free</a><a class="ghost" href="${APP_STORE}">iPhone app</a></div></section>`;
  }
  const mk = g.marketSide == null
    ? `<span class="ink3">${g.marketState === "none" ? "No number yet" : "Not on record"}</span>`
    : `<span class="d">${esc(s.team.abbreviation)} ${pct(g.marketSide)}</span>`;
  const vs = `<section aria-labelledby="vs"><h2 class="side-h" id="vs">Clutch and the market</h2>
<div class="kv"><span>Clutch's call</span><span class="d amber">${s ? `${esc(s.team.abbreviation)} ${pct(s.prob)}` : "--"}</span></div>
<div class="kv"><span>The market, cut taken out</span>${s ? mk : '<span class="ink3">--</span>'}</div>
<div class="kv"><span>Projected final</span><a class="pro-tag" href="/pricing/">PRO</a></div></section>`;
  const r = m.record;
  const ledger = r
    ? `<span class="d rec">${rec(r.hits, r.n)}</span><p>${r.season}, every call graded after the final${r.n >= RATE_FLOOR ? ` — ${r.hitRate.toFixed(1)}% right.` : "."}</p>`
    : `<span class="d rec">0–0</span><p>${m.current}: the record starts on Oct 20. Last season's, made by the model we retired, is on the Ledger exactly as graded.</p>`;
  const also = night.filter((x) => x.id !== g.id);
  const alsoHtml = also.length
    ? `<section class="also" aria-labelledby="also"><h2 class="side-h" id="also">${g.date === m.today ? "Also tonight" : `Also on ${esc(shortDate(g.date))}`}</h2>${also.map((x) => `<a class="h-${x.home.abbreviation}" href="${x.path}" data-gid="${x.id}" data-a="${x.away.abbreviation}" data-h="${x.home.abbreviation}"><span class="sw"></span><span><b>${esc(x.away.abbreviation)} at ${esc(x.home.abbreviation)}</b><span class="mono" data-live="st">${esc(statusText(x))}</span></span><span class="d">${x.status === "final" && x.homeScore != null ? `<span class="cream">${x.awayScore}–${x.homeScore}</span>` : x.hasCall ? `${esc(x.side.team.abbreviation)} ${pct(x.side.prob)}` : "--"}</span></a>`).join("")}</section>`
    : "";
  return `<aside class="aside" aria-label="Make your call, the market and the Ledger">${call}${vs}<section class="mini" aria-labelledby="led"><h2 class="side-h" id="led">The Ledger</h2>${ledger}<a class="more" href="/ledger/">SEE EVERY CALL →</a></section>${alsoHtml}</aside>`;
}

export function gamePage(g, m) {
  const night = m.nights[g.date] ?? [g];
  const h1 = headline(g), dk = deck(g);
  const crumbDate = `${longDate(g.date)} · ${g.home.city}${g.tipUtc && g.status === "scheduled" ? ` · TIP ${timeET(g.tipUtc)}` : ""}`;
  const kicker = g.preseason ? "PRESEASON" : g.seasonType === "Playoffs" ? "PLAYOFFS" : "THE CALL";
  const body = `<div class="wrap n">
<div class="ghead">
<div class="crumb"><span><a href="/games/${g.date}/">${g.date === m.today ? "TONIGHT" : esc(shortDate(g.date).toUpperCase())}</a> › ${esc(g.away.abbreviation)} AT ${esc(g.home.abbreviation)}</span><span class="hide-s">${esc(crumbDate.toUpperCase())}</span></div>
<h1 class="gh1${h1.length > 30 ? " long" : ""}">${esc(h1)}</h1>
<p class="deck">${esc(dk)}</p>
${sealLine(g, m)}
</div>
<div class="stack">
<article class="art">
${board(g, { kicker })}
${whySection(g, m)}
${spotsSection(g)}
${outSection(g)}
${gradeSection(g)}
</article>
${aside(g, m, night)}
</div>
</div>`;
  const title = g.status === "final" && g.homeScore != null
    ? `${g.away.nickname} ${g.awayScore}, ${g.home.nickname} ${g.homeScore} (${mediumDate(g.date)}) · Clutch`
    : g.hasCall
      ? `${g.away.nickname} at ${g.home.nickname}, ${mediumDate(g.date)}: ${g.side.team.nickname} ${pct(g.side.prob)}% · Clutch`
      : `${g.away.nickname} at ${g.home.nickname}, ${mediumDate(g.date)} · Clutch`;
  const team = (t) => ({ "@type": "SportsTeam", name: t.name, sport: "Basketball", url: `${ORIGIN}${m.teamPath(t)}` });
  const ld = {
    "@context": "https://schema.org", "@type": "SportsEvent",
    name: `${g.away.name} at ${g.home.name}`, description: dk, url: ORIGIN + g.path, sport: "Basketball",
    ...(g.tipUtc ? { startDate: isoET(g.tipUtc) } : { startDate: g.date }),
    eventStatus: g.status === "postponed" ? "https://schema.org/EventPostponed" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    homeTeam: team(g.home), awayTeam: team(g.away), competitor: [team(g.away), team(g.home)],
    location: { "@type": "Place", name: g.home.city, address: { "@type": "PostalAddress", addressLocality: g.home.city } },
  };
  const live = g.status !== "final" && g.status !== "postponed" ? true : night.some((x) => x.status !== "final" && x.status !== "postponed");
  return { path: g.path, title, html: page({ path: g.path, title, description: dk, body, current: "tonight", og: "game", ogType: "article", jsonld: ld, live }) };
}

/** /games/<date>/ — one night. */
export function nightPage(date, m) {
  const games = m.nights[date] ?? [];
  const dates = Object.keys(m.nights).sort();
  const isTonight = date === m.tonight;
  const finals = games.filter((g) => g.status === "final");
  const graded = finals.filter((g) => g.grade === "right" || g.grade === "missed");
  const held = graded.filter((g) => g.grade === "right").length;
  const h1 = date === m.today ? "Tonight" : isTonight ? `Next up: ${weekday(date)}` : longDate(date);
  const pre = games.some((g) => g.preseason);
  const lines = [
    `${games.length} ${games.length === 1 ? "game" : "games"}${pre ? " in the preseason" : ""}.`,
    graded.length ? `Clutch's calls held in ${held} of ${graded.length} graded ${graded.length === 1 ? "game" : "games"}.` : finals.length && pre ? "Preseason numbers are sealed, never graded." : "Every number is sealed before its tip.",
  ];
  const body = `<div class="wrap">
<div class="rhead"><span class="kick">${esc(longDate(date).toUpperCase())}</span><h1 class="rh1">${esc(h1)}</h1><p class="rdeck">${esc(lines.join(" "))}</p>
<nav class="nights" aria-label="Nights">${dates.map((d) => `<a href="/games/${d}/"${d === date ? ' aria-current="page"' : ""}>${esc(shortDate(d).toUpperCase())}</a>`).join("")}</nav></div>
<div class="body"><div class="cards">${games.map(gameCard).join("")}</div>
<p class="note">Amber is Clutch's number for the side it favours; the cream segment is the market's number for that side, the bookmaker's cut taken out. <a href="/how-it-works/">How it works →</a></p></div>
</div>`;
  const path = `/games/${date}/`;
  const title = `NBA games, ${mediumDate(date)}: Clutch's call on every game · Clutch`;
  const description = `${games.length} NBA ${games.length === 1 ? "game" : "games"} on ${longDate(date)}: Clutch's win probability for each, the market beside it, and the result once it's final.`;
  return { path, title, html: page({ path, title, description, body, current: "tonight", og: "game", live: games.some((g) => g.status !== "final" && g.status !== "postponed") }) };
}

export { RECEIPTS_REPO };
