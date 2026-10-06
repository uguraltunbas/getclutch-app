// The Ledger and the proof (/receipts/) — the record, honestly: a new season's card
// until its first graded call, the retired model's season kept exactly as
// graded, a rate never quoted under twenty calls and never without its
// baseline.

import { page, esc, bar } from "../html.mjs";
import { comparisons, opener, verdictOf, rec, pct, shortHash, leadText, sealFileUrl, RATE_FLOOR, RECEIPTS_REPO, RECEIPTS_VERIFY_URL, RECEIPTS_ACTIVITY_URL, PRESEASON_START, REGULAR_SEASON_START } from "../copy.mjs";
import { mediumDate, shortDate, timeET, longDate } from "../time.mjs";
import { seasonOf } from "../time.mjs";

function recordBlock(r, heading) {
  const v = verdictOf(r);
  const rate = r.n >= RATE_FLOOR && r.hitRate != null;
  let html = `<section class="panel" aria-labelledby="${heading.id}"><span class="kick">${esc(heading.kick)}</span><h2 id="${heading.id}">${esc(heading.title)}</h2>
<div class="stat"><div><span class="d">${rec(r.hits, r.n)}</span><span class="mono">RIGHT–WRONG · ${r.n} GRADED CALLS</span></div>${rate ? `<div><span class="d amber">${r.hitRate.toFixed(1)}%</span><span class="mono">${r.ci ? `LIKELY RANGE ${Number(r.ci[0]).toFixed(1)}–${Number(r.ci[1]).toFixed(1)}%` : "RIGHT"}</span></div>` : ""}<div><span class="mono ${v.tone === "win" ? "" : "ink3"}">${esc(v.line)}</span></div></div>`;
  for (const c of comparisons(r)) {
    const val = (x, recd) => (c.small ? recd : `${x.toFixed(1)}%`);
    html += `<div class="cmp gap"><div class="cmp-h"><span class="t">${esc(c.title)}</span><span class="mono">THE SAME ${c.n} GAMES</span></div>
<div class="crow"><span>Clutch</span>${c.small ? "<span></span>" : bar(c.us, "amber")}<span class="d v amber">${val(c.us, c.usRec)}</span></div>
<div class="crow"><span class="ink3">${esc(c.themLabel)}</span>${c.small ? "<span></span>" : bar(c.them, "cream")}<span class="d v">${val(c.them, c.themRec)}</span></div></div>`;
  }
  const d = r.vsMarket?.disagree;
  if (d && d.n > 0) html += `<div class="split gap"><span class="d">${d.hits}<span class="dim">/${d.n}</span></span><p>When Model only — Clutch's number before the market — picked a different team from the market, it was right ${d.hits} ${d.hits === 1 ? "time" : "times"} in ${d.n}${d.readable && d.market_hit_rate != null ? ` (the market ${d.market_hit_rate}%)` : ""}. ${d.edge_is_readable ? "The bottom of its likely range clears 50%." : "Not proven yet — and the Ledger says so."}</p></div>`;
  const notes = [];
  if (r.excluded) notes.push(`${r.excluded} more ${r.excluded === 1 ? "call is" : "calls are"} left out because they can't be proven to predate tip — a record that quietly shrinks isn't one, so the count is printed.`);
  if (r.playoffs?.n) notes.push(`Playoffs: ${r.playoffs.n} of these calls, ${r.playoffs.hit_rate}% right. ${r.playoffs.note}`);
  if (r.dateRange?.start) notes.push(`Graded calls from ${mediumDate(r.dateRange.start)} to ${mediumDate(r.dateRange.end)}.`);
  if (notes.length) html += `<p class="note gap">${notes.map(esc).join(" ")}</p>`;
  return html + "</section>";
}

function callRows(calls, m) {
  if (!calls.length) return "";
  return `<div class="rlist">${calls.map((c) => {
    const g = m.pageGames.find((x) => x.id === c.game_id);
    const name = esc(c.matchup.replace(" @ ", " at "));
    return `<div class="callrow"><span class="mono">${esc(shortDate(c.game_date).toUpperCase())}</span><span>${g ? `<a href="${g.path}">${name}</a>` : name} <span class="mono hide-xs">· ${esc(c.final.replace("-", "–"))}${c.season_type === "Playoffs" ? " · PLAYOFFS" : ""}</span></span><span class="d">${esc(c.pick)} ${Math.round(c.claimed_pct)}</span><span>${c.correct ? '<span class="chip win">RIGHT</span>' : '<span class="chip loss">MISSED</span>'}</span></div>`;
  }).join("")}</div>`;
}

export function ledgerPage(m) {
  const current = m.current;
  const o = opener(current, m.today, m.sealed, !!m.last);
  const thisSeason = m.calls.filter((c) => (c.season || seasonOf(c.game_date)) === current);
  const lastSeason = m.last ? m.calls.filter((c) => (c.season || seasonOf(c.game_date)) === m.last.season) : [];
  let main = "";
  if (m.record) {
    main += recordBlock(m.record, { id: "season", kick: `${current} · THE SEASON SO FAR`, title: `Clutch's ${current} record` });
    main += `<section aria-labelledby="calls"><h2 class="sh" id="calls">Every call, ${esc(current)}</h2>${callRows(thisSeason.slice(0, 120), m)}${thisSeason.length > 120 ? `<p class="note gap">The newest 120 of ${thisSeason.length}. Every one is in the app's Ledger.</p>` : ""}</section>`;
  } else {
    main += `<section class="panel" aria-labelledby="open"><span class="kick">${esc(o.kicker)}</span><h2 id="open">${esc(o.title)}</h2><p class="sub">${esc(o.body)}</p>${o.sealedLine ? `<p class="mono amber gap">${esc(o.sealedLine)} ✓</p>` : ""}${o.sealedNote ? `<p class="note gap">${esc(o.sealedNote)}</p>` : ""}<p class="note gap">Preseason calls count for points in the app from ${esc(shortDate(PRESEASON_START))}; leagues and Clutch's record start on ${esc(shortDate(REGULAR_SEASON_START))}.</p></section>`;
  }
  if (m.last) {
    main += recordBlock(m.last, { id: "last", kick: `LAST SEASON · ${m.last.season}${m.last.retired ? " · THE RETIRED MODEL" : ""}`, title: m.last.retired ? "Last season, made by the model we retired" : `Last season, ${m.last.season}` });
    if (lastSeason.length) main += `<section aria-labelledby="lcalls"><h2 class="sh s" id="lcalls">Every graded call, ${esc(m.last.season)}</h2>${callRows(lastSeason, m)}</section>`;
  }
  main += `<section class="blk" aria-labelledby="rules"><h2 id="rules">How the Ledger keeps score</h2>
<p>Every number is written to Clutch's database and sealed in the public record before tip-off, and never edited afterwards. The market, ESPN and the simple rules are graded on the same games, not quoted from a backtest. Preseason is never graded. Right and wrong calls sit in the same list, in date order.</p>
<p>A rate is never quoted on fewer than ${RATE_FLOOR} graded calls — the record is written as right–wrong until then — and never without the baseline of picking the home team every night. <a href="/how-it-works/">How Clutch works →</a></p></section>`;
  const body = `<div class="wrap r"><div class="rhead"><span class="kick">THE LEDGER · ${esc(current)}${m.ledgerAt ? ` · UPDATED ${esc(mediumDate(m.ledgerAt.slice(0, 10)).toUpperCase())}` : ""}</span><h1 class="rh1">Every call, graded in public.</h1><p class="rdeck">Clutch writes down its number for every game before tip and grades it after the final — beside the market, ESPN and picking the home team every night. The misses stay on the record.</p></div><div class="body">${main}</div></div>`;
  const desc = m.record
    ? `Clutch's ${current} NBA record: ${rec(m.record.hits, m.record.n)} on ${m.record.n} graded calls, beside the market, ESPN and always picking the home team. Every call sealed before tip.`
    : `Clutch's ${current} record starts Oct 20. Every NBA call is sealed before tip and graded after the final, beside the market, ESPN and the home team.`;
  return { path: "/ledger/", title: "The Ledger: every Clutch call, graded in public · Clutch", html: page({ path: "/ledger/", title: "The Ledger: every Clutch call, graded in public · Clutch", description: desc, body, current: "ledger", og: "ledger" }) };
}

// ── Proof (/receipts/) ─────────────────────────────────────────────────
// Each file said in words first — when it was sealed and how long before the
// tip, what was opened after the final and how each game came out — with the
// fingerprint, the chain and the commit one tap below. A sentence is printed
// only when the data behind it is loaded: no tip time, no "before the tip";
// no game row, no result; no check from receipts_for_date, no ✓.

/** The newest nights in full, then one line a night, then one a month — the page stays in budget all season. */
const FULL_NIGHTS = 5;
const LINE_NIGHTS = 30;
const gameCount = (n) => `${n} ${n === 1 ? "game" : "games"}`;
const commitSha = (f) => String(f.commit_url ?? "").match(/\/commit\/([0-9a-f]{40,64})$/)?.[1] ?? null;
/** A night's folder in the repository ("2026-27/2026-10-05"), or the season's ("2026-27"). */
const folderUrl = (f, depth = 2) => (/^[0-9]{4}-[0-9]{2}\/[0-9]{4}-[0-9]{2}-[0-9]{2}\//.test(f.path ?? "") ? `${RECEIPTS_REPO}/tree/main/${f.path.split("/").slice(0, depth).join("/")}` : RECEIPTS_REPO);

/** The games a file holds, as views — null unless every one is known (then nothing is inferred from a part). */
function heldGames(f, m) {
  const held = m.receiptGames[f.id];
  if (!held?.length) return null;
  const ids = [...new Set(held.map((x) => x.gameId))];
  const views = ids.map((id) => m.gameById[id]);
  return views.every(Boolean) ? views : null;
}

/** "Sealed 10:01 AM ET — 8 h 59 min before the first tip · 4 games" (and, again later, how many numbers moved). */
function sealText(f, earlier, m) {
  const views = heldGames(f, m);
  const tips = views?.every((g) => g.tipUtc) ? views.map((g) => g.tipUtc).sort() : [];
  const lead = tips.length ? leadText(f.committed_at, tips[0]) : null;
  let moved = 0;
  if (earlier.length && earlier.every((e) => m.receiptGames[e.id]?.length)) {
    for (const x of m.receiptGames[f.id] ?? []) {
      const before = earlier.map((e) => m.receiptGames[e.id].find((y) => y.gameId === x.gameId)).filter(Boolean).pop();
      if (before && before.homeWinProb !== x.homeWinProb) moved++;
    }
  }
  const verb = earlier.length ? "Sealed again" : "Sealed";
  return `<b class="amber">${verb} ${esc(timeET(f.committed_at))}</b>${lead ? ` — ${esc(lead)} before the ${earlier.length ? "next" : "first"} tip` : ""}${f.n_games ? ` · ${gameCount(f.n_games)}` : ""}${moved ? ` · ${moved} ${moved === 1 ? "number" : "numbers"} moved` : ""}`;
}

/** One game a reveal opened: the final, Clutch's sealed number, how it came out, and whether the graded number is the sealed one. */
function openedGame(g) {
  const parts = [`<a href="${g.path}">${esc(g.status === "final" && g.homeScore != null ? `${g.away.abbreviation} ${g.awayScore}, ${g.home.abbreviation} ${g.homeScore}` : `${g.away.abbreviation} at ${g.home.abbreviation}`)}</a>`];
  if (g.hasCall) parts.push(`Clutch: ${esc(g.side.team.abbreviation)} ${pct(g.side.prob)}%`);
  if (g.grade === "right") parts.push('<span class="win">right</span>');
  else if (g.grade === "missed") parts.push('<span class="hot">missed</span>');
  else if (g.grade === "preseason") parts.push("preseason, not graded");
  if (g.receipt?.state === "sealed") parts.push('<span class="amber">matches the seal ✓</span>');
  else if (g.receipt?.state === "late") parts.push("changed after its last seal");
  return `<li>${parts.join(" · ")}</li>`;
}

function details(f) {
  const sha = commitSha(f);
  const file = sha && f.path ? sealFileUrl({ commitSha: sha, path: f.path, commitUrl: f.commit_url }) : null;
  const links = [file ? `<a href="${esc(file)}">The file →</a>` : "", f.commit_url ? `<a href="${esc(f.commit_url)}">The commit on GitHub →</a>` : ""].filter(Boolean).join(" · ");
  return `<details class="fp"><summary class="mono ink3">The fingerprint and the commit</summary><div class="note">
<p>SHA-256 <code>${esc(f.sha256)}</code></p>
<p>${f.prev_sha256 ? `Chained to the file before it: <code>${esc(shortHash(f.prev_sha256))}</code>` : "The first file in the chain."}</p>${links ? `
<p>${links}</p>` : ""}
</div></details>`;
}

function fullNight(d, files, m) {
  const seals = [];
  let html = "";
  for (const f of files) {
    if (f.kind === "seal") {
      html += `<div class="rfile"><p>${sealText(f, seals, m)}</p>${details(f)}</div>`;
      seals.push(f);
      continue;
    }
    const views = heldGames(f, m);
    const games = views ? views.slice().sort((a, b) => String(a.tipUtc ?? "").localeCompare(String(b.tipUtc ?? "")) || a.id.localeCompare(b.id)) : [];
    html += `<div class="rfile"><p><b class="cream">Opened ${esc(timeET(f.committed_at))}, after the ${f.n_games === 1 ? "final" : "finals"}</b>${f.n_games ? ` · ${gameCount(f.n_games)}` : ""}</p>${games.length ? `<ul class="spots">${games.map(openedGame).join("")}</ul>` : ""}${details(f)}</div>`;
  }
  if (!files.some((f) => f.kind === "reveal")) html += `<p class="note gap">Opened overnight, after the finals.</p>`;
  const night = m.nights[d] ? `<a class="more" href="/games/${d}/">THE NIGHT'S GAMES →</a>` : "";
  return `<div class="rnight"><div><span class="d">${esc(shortDate(d).toUpperCase())}</span><br>${night}</div><div>${html}</div></div>`;
}

function shortNight(d, files, m) {
  const seals = files.filter((f) => f.kind === "seal");
  const opened = files.some((f) => f.kind === "reveal");
  const line = seals.length
    ? `${sealText(seals[0], [], m)}${seals.length > 1 ? ` · sealed ${seals.length} times` : ""} · ${opened ? "opened after the finals" : "not opened yet"}`
    : opened ? '<b class="cream">Opened after the finals</b>' : "";
  return `<div class="rnight"><div><span class="d">${esc(shortDate(d).toUpperCase())}</span></div><div class="rfile"><p>${line}</p><a class="more" href="${esc(folderUrl(files[0]))}">THE NIGHT'S FILES →</a></div></div>`;
}

/** A month of older nights in one line: how many, how many games sealed (a night's largest seal), how many opened. */
function monthRow(ym, dates, filesOf) {
  let games = 0, opened = 0;
  for (const d of dates) {
    const files = filesOf(d);
    games += Math.max(0, ...files.filter((f) => f.kind === "seal").map((f) => Number(f.n_games) || 0));
    if (files.some((f) => f.kind === "reveal")) opened++;
  }
  const n = dates.length;
  const label = new Date(`${ym}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase();
  return `<div class="rnight"><div><span class="d">${esc(label)}</span></div><div class="rfile"><p>${n} ${n === 1 ? "night" : "nights"} · ${games} ${games === 1 ? "game" : "games"} sealed before tip · ${opened === n ? "all opened after the finals" : `${opened} of ${n} opened after the finals`}</p><a class="more" href="${esc(folderUrl(filesOf(dates[0])[0], 1))}">THE SEASON'S FILES →</a></div></div>`;
}

export function receiptsPage(m) {
  const byDate = new Map();
  for (const r of m.receipts) { if (!byDate.has(r.slate_date)) byDate.set(r.slate_date, []); byDate.get(r.slate_date).push(r); }
  const dates = [...byDate.keys()].sort().reverse();
  const filesOf = (d) => byDate.get(d).slice().sort((a, b) => a.committed_at.localeCompare(b.committed_at));
  const lines = dates.slice(FULL_NIGHTS, LINE_NIGHTS);
  const months = new Map();
  for (const d of dates.slice(LINE_NIGHTS)) { const ym = d.slice(0, 7); if (!months.has(ym)) months.set(ym, []); months.get(ym).push(d); }
  const older = lines.map((d) => shortNight(d, filesOf(d), m)).join("") + [...months].map(([ym, ds]) => monthRow(ym, ds, filesOf)).join("");
  const nights = dates.length
    ? `<section aria-labelledby="nights"><h2 class="sh" id="nights">Night by night</h2><div class="rlist">${dates.slice(0, FULL_NIGHTS).map((d) => fullNight(d, filesOf(d), m)).join("")}</div>${older.length ? `
<h3 class="side-h mt" id="earlier">Earlier nights</h3><p class="note">One line a night${months.size ? ", then one a month" : ""}. Every file, fingerprint and commit is in the repository.</p><div class="rlist">${older}</div>` : ""}</section>`
    : `<section class="panel" aria-labelledby="first"><span class="kick">${esc(m.current)} · THE FIRST SEAL</span><h2 id="first">The first seal lands on ${esc(shortDate(PRESEASON_START))}.</h2><p class="sub">Seals begin with the 2026-27 preseason: on ${esc(longDate(PRESEASON_START))}, before the first tip, the night's numbers go into the public repository. From then on every night lands here, newest first.</p></section>`;
  const body = `<div class="wrap r"><div class="rhead"><span class="kick">PROOF · SEALED BEFORE TIP</span><h1 class="rh1">Every number is on the record before tip-off.</h1><p class="rdeck">Anyone can say they called it once the game is over. Clutch puts its number for every game in a public file before the game starts, where it can't be changed or backdated without it showing — misses included.</p></div>
<div class="body">
<section class="blk" aria-labelledby="how"><h2 id="how">How it works, in three steps</h2>
<div class="g3 steps gap">
<div class="move"><span class="no" aria-hidden="true">01</span><h3>Sealed before tip-off</h3><p>Before tip-off, Clutch writes its number for every game into a public file and takes the file's fingerprint (a SHA-256 hash). Change one character and the fingerprint changes.</p></div>
<div class="move"><span class="no" aria-hidden="true">02</span><h3>Stamped by GitHub's clock</h3><p>GitHub stamps the time the file arrived, and nobody — Clutch included — can set that clock. So it proves the number came before the game.</p></div>
<div class="move"><span class="no" aria-hidden="true">03</span><h3>Checked after the final</h3><p>The result is checked against that same sealed number. The Pro numbers, sealed as a locked fingerprint, are opened so anyone can check them too.</p></div>
</div>
<p class="note gap">When news moves a number during the day, it is sealed again; the last seal before a game tips is the one that counts. Preseason numbers are sealed too, but never graded.</p></section>
${nights}
<section class="blk" aria-labelledby="verify"><h2 id="verify">Check one yourself</h2>
<p>1. On any night above, open “The fingerprint and the commit”, then the file. It lists each game with Clutch's number: <code>"home_win_prob": "0.5396"</code> means 54% for the home team.</p>
<p>2. Download the file and run <code>shasum -a 256 &lt;file&gt;</code> in a terminal (Windows: <code>certutil -hashfile &lt;file&gt; SHA256</code>). It prints the fingerprint — the same 64 characters shown here.</p>
<p>3. Open the repository's Activity page: GitHub's own clock, showing when the file arrived — before tip-off. (The dates beside each commit are typed by whoever commits, so on their own they prove nothing.)</p>
<p>4. Every file names the fingerprint of the one before it, so an old file can't be swapped without breaking the chain. After the final, the reveal file prints the Pro numbers and the random salt behind each sealed fingerprint; hash them again and you get the fingerprint from the seal. <a href="${RECEIPTS_VERIFY_URL}">The full method, with a short script (VERIFY.md) →</a></p>
<p><a href="${RECEIPTS_REPO}">The repository →</a> · <a href="${RECEIPTS_ACTIVITY_URL}">Its activity →</a></p></section>
</div></div>`;
  const title = "Proof: every Clutch number sealed before tip · Clutch";
  const desc = "Every Clutch NBA number goes into a public GitHub file before tip-off and is checked after the final. Three steps, every night, and how to check one yourself.";
  return { path: "/receipts/", title, html: page({ path: "/receipts/", title, description: desc, body, current: "receipts", og: "ledger" }) };
}
