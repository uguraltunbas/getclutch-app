// The Ledger and the receipts — the record, honestly: a new season's card
// until its first graded call, the retired model's season kept exactly as
// graded, a rate never quoted under twenty calls and never without its
// baseline.

import { page, esc, bar } from "../html.mjs";
import { comparisons, opener, verdictOf, rec, shortHash, RATE_FLOOR, RECEIPTS_REPO, RECEIPTS_VERIFY_URL, RECEIPTS_ACTIVITY_URL, PRESEASON_START, REGULAR_SEASON_START } from "../copy.mjs";
import { mediumDate, shortDate, timeET, longDate } from "../time.mjs";
import { seasonOf } from "../time.mjs";

function recordBlock(r, heading) {
  const v = verdictOf(r);
  const rate = r.n >= RATE_FLOOR && r.hitRate != null;
  let html = `<section class="panel" aria-labelledby="${heading.id}"><span class="kick">${esc(heading.kick)}</span><h2 id="${heading.id}">${esc(heading.title)}</h2>
<div class="stat"><div><span class="d">${rec(r.hits, r.n)}</span><span class="mono">RIGHT–WRONG · ${r.n} GRADED CALLS</span></div>${rate ? `<div><span class="d amber">${r.hitRate.toFixed(1)}%</span><span class="mono">${r.ci ? `LIKELY RANGE ${r.ci[0]}–${r.ci[1]}%` : "RIGHT"}</span></div>` : ""}<div><span class="mono ${v.tone === "win" ? "" : "ink3"}">${esc(v.line)}</span></div></div>`;
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
    : `Clutch's ${current} record starts Oct 20. Every NBA call is sealed before tip and graded after the final, beside the market, ESPN and picking the home team — last season's record kept exactly as graded.`;
  return { path: "/ledger/", title: "The Ledger: every Clutch call, graded in public · Clutch", html: page({ path: "/ledger/", title: "The Ledger: every Clutch call, graded in public · Clutch", description: desc, body, current: "ledger", og: "ledger" }) };
}

export function receiptsPage(m) {
  const byDate = new Map();
  for (const r of m.receipts) { if (!byDate.has(r.slate_date)) byDate.set(r.slate_date, []); byDate.get(r.slate_date).push(r); }
  const dates = [...byDate.keys()].sort().reverse();
  const nights = dates.length
    ? `<div class="rlist">${dates.map((d) => {
      const files = byDate.get(d).sort((a, b) => a.committed_at.localeCompare(b.committed_at));
      const night = m.nights[d] ? `<a class="more" href="/games/${d}/">THE NIGHT'S GAMES →</a>` : "";
      return `<div class="rnight"><div><span class="d">${esc(shortDate(d).toUpperCase())}</span><br>${night}</div><div>${files.map((f) => `<div class="rfile"><span class="mono ${f.kind === "seal" ? "amber" : "ink3"}">${f.kind === "seal" ? "SEAL" : "REVEAL"} · ${esc(timeET(f.committed_at))}${f.n_games ? ` · ${f.n_games} ${f.n_games === 1 ? "GAME" : "GAMES"}` : ""}</span><span>sha256 <code>${esc(f.sha256)}</code></span>${f.prev_sha256 ? `<span class="note">chained to ${esc(shortHash(f.prev_sha256))}</span>` : ""}${f.commit_url ? `<a href="${esc(f.commit_url)}">The commit on GitHub →</a>` : ""}</div>`).join("")}</div></div>`;
    }).join("")}</div>`
    : `<section class="panel" aria-labelledby="first"><span class="kick">${esc(m.current)} · THE FIRST SEAL</span><h2 id="first">The first receipt lands on ${esc(shortDate(PRESEASON_START))}.</h2><p class="sub">Seals begin with the 2026-27 preseason: on ${esc(longDate(PRESEASON_START))}, before the first tip, the night's numbers go into the public repository. From then on every night lands here, newest first.</p></section>`;
  const body = `<div class="wrap r"><div class="rhead"><span class="kick">THE RECEIPTS</span><h1 class="rh1">Sealed before tip. Checkable by a stranger.</h1><p class="rdeck">Before each game tips, Clutch writes its number into a public file on GitHub and records its seal — a SHA-256 hash. The file can't change without the seal changing, and GitHub keeps its own clock of when it arrived. The number the Ledger grades is the one in that file.</p></div>
<div class="body">
${nights}
<section class="blk" aria-labelledby="verify"><h2 id="verify">Check one yourself</h2>
<p>1. Open the commit on GitHub. The seal file lists each game with Clutch's number for it.</p>
<p>2. Download that file and run <code>shasum -a 256 &lt;file&gt;</code> (Windows: <code>certutil -hashfile &lt;file&gt; SHA256</code>). It prints the seal.</p>
<p>3. Open the repository's Activity page. GitHub's own clock shows when the file arrived: before tip-off.</p>
<p>After the final, a reveal file opens the Pro numbers that were sealed as salted hashes, so they can be checked too. <a href="${RECEIPTS_VERIFY_URL}">The full method (VERIFY.md) →</a></p>
<p><a href="${RECEIPTS_REPO}">The repository →</a> · <a href="${RECEIPTS_ACTIVITY_URL}">Its activity →</a></p></section>
</div></div>`;
  const desc = "Every Clutch NBA call is sealed with a SHA-256 hash in a public GitHub repository before tip — the receipts, night by night, and how to check one yourself.";
  return { path: "/receipts/", title: "Receipts: every call sealed before tip · Clutch", html: page({ path: "/receipts/", title: "Receipts: every call sealed before tip · Clutch", description: desc, body, current: "receipts", og: "ledger" }) };
}
