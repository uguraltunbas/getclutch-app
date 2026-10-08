// The Clutch desk — today's ready-to-post cards and videos, from public data only.
//
//   node desk-src/make.mjs [--out _site/desk] [--date 2026-10-22]
//
// Reads with the public anon key (the same numbers the free app shows: the
// published win probability and its top reason, games, teams, the Win Totals
// lines, the receipts index) — never a Pro column, never a Win Totals pick of
// the Machine before the lock. Renders with desk-src/render.mjs (headless
// Chrome + ffmpeg) and writes one page, desk/index.html, that opens on a phone:
// every item with its image or video, a download link and captions (EN + TR)
// to copy.
//
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, CHROME_PATH (CI), DESK_DATE (ET date to
// build for; default today in New York).

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUT = resolve(arg("--out", join(HERE, "..", "_site", "desk")));
const URL = (process.env.SUPABASE_URL || "https://rgksgqnajvcsoftqncqe.supabase.co").replace(/\/$/, "") + "/rest/v1";
const KEY = process.env.SUPABASE_ANON_KEY;
if (!KEY) { console.error("SUPABASE_ANON_KEY is not set"); process.exit(1); }

const LOCK = Date.parse("2026-10-20T19:00:00Z"); // Win Totals locks at the first tip
const RECEIPTS_REPO = "github.com/uguraltunbas/clutch-receipts";

// ── dates, in the league's own time zone ──
const etDate = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const TODAY = arg("--date", process.env.DESK_DATE || etDate(new Date()));
const shift = (iso, days) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
const YESTERDAY = shift(TODAY, -1);
const nice = (iso, lang = "en") => new Date(iso + "T12:00:00Z").toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const tipET = (utc) => new Date(utc).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET";
const tipTR = (utc) => new Date(utc).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }) + " TSİ";

async function get(path) {
  const r = await fetch(`${URL}/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`${path.split("?")[0]}: HTTP ${r.status} ${await r.text()}`);
  return r.json();
}
const inList = (ids) => `in.(${ids.join(",")})`;

// ── data ──
const teams = await get("teams?select=id,abbreviation,name,nickname,city,conference,primary_color,secondary_color");
const T = Object.fromEntries(teams.map((t) => [t.id, t]));
const lines = await get("win_total_lines?select=team_id,line,season&season=like.2026*");

async function slateOf(date) {
  const games = await get(`games?select=id,game_date,game_time_utc,status,season_type,home_team_id,away_team_id,home_score,away_score&game_date=eq.${date}&status=neq.postponed&order=game_time_utc`);
  if (!games.length) return [];
  const preds = await get(`game_predictions?select=game_id,home_win_prob,key_factors,generated_at&is_latest=eq.true&game_id=${inList(games.map((g) => g.id))}`);
  const P = Object.fromEntries(preds.map((p) => [p.game_id, p]));
  return games.filter((g) => P[g.id]).map((g) => {
    const p = +P[g.id].home_win_prob, home = T[g.home_team_id], away = T[g.away_team_id];
    const homeFav = p >= 0.5, fav = homeFav ? home : away, dog = homeFav ? away : home, fp = homeFav ? p : 1 - p;
    const why = (P[g.id].key_factors || [])[0]?.label || null;
    return { g, home, away, fav, dog, fp, pct: Math.round(fp * 100), why, homeFav };
  });
}

const tonight = await slateOf(TODAY);
const last = (await slateOf(YESTERDAY)).filter((x) => x.g.status === "final" && x.g.season_type !== "Preseason");
let receipt = null;
try { receipt = (await get(`receipts?select=kind,slate_date,sha256,prev_sha256,committed_at,n_games,commit_url&slate_date=eq.${TODAY}&order=committed_at.desc&limit=1`))[0] || null; } catch (e) { console.warn("receipts:", e.message); }

// fresh lines for the Win Totals templates
const teamsJs = teams.map((t) => ({ abbr: t.abbreviation, name: t.name, city: t.city, nickname: t.nickname, conf: t.conference, c1: t.primary_color, c2: t.secondary_color, line: String(lines.find((l) => l.team_id === t.id)?.line ?? "") })).filter((t) => t.line).sort((a, b) => +b.line - +a.line);
writeFileSync(join(HERE, "data", "teams.js"), "window.TEAMS=" + JSON.stringify(teamsJs) + ";\n");

// ── items ──
const items = [];
const cards = [], videos = [];
const q = (o) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(typeof v === "string" ? v : JSON.stringify(v))}`).join("&");
const card = (name, query, w = 1080, h = 1350) => { cards.push({ page: "cards.html", query: q(query), out: join(OUT, TODAY, name), w, h }); return `${TODAY}/${name}`; };
const video = (name, query) => { videos.push({ page: "scenes.html", query: q(query), out: join(OUT, TODAY, name), w: 1080, h: 1920, fps: 30, cover: 6 }); return `${TODAY}/${name}`; };

// 1 · last night's worst miss (regular season and playoffs only; preseason is sealed but not graded)
const misses = last.filter((x) => (x.homeFav ? x.g.home_score < x.g.away_score : x.g.away_score < x.g.home_score)).sort((a, b) => b.fp - a.fp);
if (misses.length) {
  const x = misses[0];
  const favScore = x.homeFav ? x.g.home_score : x.g.away_score, dogScore = x.homeFav ? x.g.away_score : x.g.home_score;
  const m = { short: `the ${x.fav.nickname}`, date: YESTERDAY, fav: x.fav.abbreviation, favName: x.fav.nickname, favCity: x.fav.city, dog: x.dog.abbreviation, dogName: x.dog.nickname, p: Math.round(x.fp * 1000) / 10, favScore, dogScore };
  const held = last.length - misses.length;
  const body = `Sealed before tip in the public record. Last night: ${held} of ${last.length} calls held.`;
  const bodyTr = `Maçtan önce herkese açık kayda mühürlendi. Dün gece: ${last.length} tahminin ${held}'i tuttu.`;
  items.push({ kind: "Last night's worst miss", when: "Morning · X, Threads, Instagram", img: card("miss.png", { t: "tabloid", m, ed: "Morning edition", lbl: "Last night's worst miss", b: body }), vid: video("miss.mp4", { s: "miss", m, lbl: "LAST NIGHT'S WORST MISS", b: body }), vidTr: video("miss-tr.mp4", { s: "miss", m: { ...m, short: m.favName }, lang: "tr", lbl: "DÜN GECENİN EN KÖTÜ ISKASI", b: bodyTr }),
    en: `Last night Clutch had the ${m.favName} at ${Math.round(m.p)}%. The ${m.dogName} won ${dogScore}–${favScore}.\n\nIt stays on the record, like every other call. ${held} of ${last.length} held last night.`,
    tr: `Dün gece Clutch ${m.favName} için %${Math.round(m.p)} dedi. ${m.dogName} ${dogScore}–${favScore} kazandı.\n\nKayıtta kalıyor, diğer her tahmin gibi. Dün gece ${last.length} tahminin ${held}'i tuttu.` });
  // the TR card
  items[items.length - 1].imgTr = card("miss-tr.png", { t: "tabloid", m, lang: "tr", ed: "Sabah baskısı", lbl: "Dün gecenin en kötü ıskası", h: `${m.favName} için %${Math.round(m.p)} dedik.`, h2: `${m.dogName} kazandı.`, b: bodyTr });
}

// 2 · tonight's calls on one board, and the three biggest games as jumbo cards
if (tonight.length) {
  const showBoard = tonight.length >= 3;
  const board = tonight.map((x) => ({ fav: x.fav.nickname, dog: x.dog.nickname, p: x.pct, tip: tipET(x.g.game_time_utc) }));
  const pre = tonight[0].g.season_type === "Preseason";
  if (showBoard) items.push({ kind: pre ? "Tonight's calls (preseason)" : "Tonight's calls", when: "Afternoon · X, Threads, IG story", img: card("tonight.png", { t: "slate", g: board, d: nice(TODAY) + (pre ? " · preseason" : ""), ...(pre ? { pre: 1 } : {}) }),
    en: `Tonight's calls from Clutch${pre ? " (preseason: sealed, not graded)" : ""}, all sealed before tip:\n\n${tonight.map((x) => `${x.fav.nickname} ${x.pct}% over ${x.dog.nickname}`).join("\n")}\n\nWhich one is wrong?`,
    tr: `Clutch'ın bu geceki tahminleri${pre ? " (hazırlık: mühürlü, notlanmıyor)" : ""}:\n\n${tonight.map((x) => `${x.fav.nickname} %${x.pct} (${x.dog.nickname}'a karşı) · ${tipTR(x.g.game_time_utc)}`).join("\n")}\n\nHangisi yanlış?` });
  // "biggest" = the two teams with the highest win totals between them (a proxy for interest)
  const lineOf = (t) => +(lines.find((l) => l.team_id === t.id)?.line ?? 40);
  const top = tonight.slice().sort((a, b) => lineOf(b.home) + lineOf(b.away) - (lineOf(a.home) + lineOf(a.away))).slice(0, 3);
  top.forEach((x, i) => {
    const h = `${x.fav.nickname} over <em>${x.dog.nickname}.</em>`;
    items.push({ kind: `Tonight's number · ${x.away.abbreviation} @ ${x.home.abbreviation}`, when: "Before tip · X (with a poll), Threads", img: card(`jumbo-${i + 1}.png`, { t: "jumbo", num: `${x.pct}%`, e: "Clutch's call", d: `${nice(TODAY)}${pre ? " · preseason" : ""} · ${tipET(x.g.game_time_utc)}`, h, b: `${x.why ? x.why.replace(/\s*\((favors|favours) (home|away)\)\s*$/i, "") + ". " : ""}Sealed before tip. <b>Your call?</b>` }),
      en: `Clutch: ${x.fav.nickname} ${x.pct}% over the ${x.dog.nickname} tonight (${tipET(x.g.game_time_utc)}).\n\n${pre ? "Preseason: sealed before tip, never graded." : "Sealed before tip, graded after the final."} Your call?`,
      tr: `Clutch: bu gece ${x.fav.nickname} %${x.pct}, rakip ${x.dog.nickname} (${tipTR(x.g.game_time_utc)}).\n\n${pre ? "Hazırlık maçı: maçtan önce mühürlü, notlanmıyor." : "Maçtan önce mühürlü, maçtan sonra notlanıyor."} Sen ne diyorsun?`,
      poll: [x.fav.nickname, x.dog.nickname] });
  });
}

// 3 · today's receipt
if (receipt) {
  const short = (h) => (h ? `${h.slice(0, 8)}…${h.slice(-6)}` : "—");
  const at = new Date(receipt.committed_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/New_York" }) + " ET";
  const games = tonight.slice(0, 7).map((x) => [`${x.away.abbreviation} @ ${x.home.abbreviation}`, `${x.fav.abbreviation} ${(x.fp * 100).toFixed(1)}%`]);
  const qq = { kind: "SEAL", slate: `SLATE ${TODAY} · ${receipt.n_games ?? tonight.length} GAMES`, games, at, sha: short(receipt.sha256), prev: short(receipt.prev_sha256) };
  items.push({ kind: "Today's receipt", when: "Midday · X, Threads", img: card("receipt.png", { t: "receipt", ...qq, stamp: "Sealed ✓", f: RECEIPTS_REPO }), vid: video("receipt.mp4", { s: "receipt", ...qq }),
    en: `Today's receipt: ${receipt.n_games ?? tonight.length} calls committed to the public repo at ${at}, before any of them tipped.\n\nsha256 ${short(receipt.sha256)}, chained to yesterday's ${short(receipt.prev_sha256)}.\n${RECEIPTS_REPO}`,
    tr: `Bugünün fişi: ${receipt.n_games ?? tonight.length} tahmin, hiçbiri başlamadan ${at}'de herkese açık depoya yazıldı.\n\nsha256 ${short(receipt.sha256)}, dünküne (${short(receipt.prev_sha256)}) zincirli.\n${RECEIPTS_REPO}` });
}

// 4 · Win Totals, until the lock: the countdown and today's two team cards (Oct 3 → Oct 17, by line)
const now = Date.parse(TODAY + "T16:00:00Z");
if (now < LOCK) {
  const days = Math.ceil((LOCK - now) / 86400000);
  const lock = "Free to enter · prizes are Clutch Pro time · Apple is not a sponsor.";
  if ([10, 5, 3, 1].includes(days) || days <= 0) {
    const d = days <= 1 ? "0" : String(days);
    items.push({ kind: `Win Totals · ${days <= 1 ? "last day" : days + " days left"}`, when: "Morning · IG and X stories", img: card(`count-${d}.png`, { t: "count", d }, 1080, 1920), imgTr: card(`count-${d}-tr.png`, { t: "count", d, lang: "tr" }, 1080, 1920),
      en: days <= 1 ? `Last call. Win Totals locks at today's first tip (3 PM ET). 30 teams, over or under, three stars. ${lock}` : `${days} days to seal your Win Totals. 30 teams, over or under, three stars. First place wins a year of Clutch Pro. ${lock}`,
      tr: days <= 1 ? `Son çağrı. Win Totals bugün 22:00'de (TSİ) ilk hücumla kilitleniyor. 30 takım, fazla ya da az. Katılım ücretsiz · ödül Pro süresidir · Apple sponsor değildir.` : `Win Totals'ı mühürlemek için ${days} gün. 30 takım, fazla ya da az, üç yıldız. Birinciye 1 yıl Clutch Pro. Katılım ücretsiz · ödül Pro süresidir · Apple sponsor değildir.` });
  }
  const start = Date.parse("2026-10-03T16:00:00Z");
  const k = Math.floor((now - start) / 86400000);
  if (k >= 0 && k < 15) {
    teamsJs.slice(k * 2, k * 2 + 2).forEach((t) => {
      items.push({ kind: `Win Totals · ${t.nickname} ${t.line}`, when: "Morning · X, Threads, IG", img: card(`wt-${t.abbr.toLowerCase()}.png`, { t: "tote", team: t.abbr }),
        en: `The market has the ${t.nickname} at ${t.line} wins. Over or under?\n\nCall all 30 in Clutch before the first tip on Oct 20. ${lock}`,
        tr: `Piyasa ${t.nickname} için ${t.line.replace(".", ",")} galibiyet diyor. Fazla mı, az mı?\n\n30 takımın hepsini 20 Ekim 22:00'ye (TSİ) kadar Clutch'ta mühürle. Katılım ücretsiz · ödül Pro süresidir · Apple sponsor değildir.` });
    });
  }
}

// 5 · Clutch's Cards (migration 065): tonight's three, last night's results (every leg, the
// misses too) and, on Mondays, last week's record. From the snapshot's free row only — the
// published chances, never the market's numbers. Last night's results are read from the
// finals here (the Overnight grade lands after the morning desk run).
async function cardsOf(date) {
  try { return (await get(`api_snapshots?select=body&key=eq.${encodeURIComponent("cards/" + date)}&tier=eq.free&limit=1`))[0]?.body || null; }
  catch (e) { console.warn("cards:", e.message); return null; }
}
const TIER = { solid: "Solid", balanced: "Balanced", bold: "Bold" };
const pctOf = (chance) => (chance >= 0.01 ? String(Math.round(chance * 100)) : "<1");
const cardsTonight = await cardsOf(TODAY);
if (cardsTonight?.cards?.length) {
  const at = cardsTonight.built_at ? tipET(cardsTonight.built_at) : "morning";
  const c = cardsTonight.cards.map((k) => ({ tier: TIER[k.tier], legs: k.legs.map((l) => l.team), p: pctOf(k.chance), pts: k.points }));
  items.push({ kind: "Tonight's cards", when: "Morning · X, Threads, IG story", img: card("cards-tonight.png", { t: "cards", c, d: nice(TODAY), at }),
    en: `Clutch's three cards tonight, built from its ${at} numbers and sealed before tip:\n\n${c.map((k) => `${k.tier}: ${k.legs.join(" · ")} (${k.p}%, +${k.pts} pts if every leg is right)`).join("\n")}\n\nWhich one lands? Copy one in the app and beat Clutch.` });
}
const cardsLast = await cardsOf(YESTERDAY);
if (cardsLast?.cards?.length) {
  const G = Object.fromEntries(last.map((x) => [x.g.id, x.g]));
  const c = cardsLast.cards.map((k) => {
    const legs = k.legs.map((l) => {
      const g = G[l.game_id];
      if (!g || g.home_score == null || g.away_score == null) return { team: l.team, ok: null, score: "" };
      const winner = g.home_score > g.away_score ? g.home_team_id : g.away_team_id;
      const score = l.home ? `${g.home_score}–${g.away_score}` : `${g.away_score}–${g.home_score}`;
      return { team: l.team, ok: winner === l.team_id, score };
    });
    const status = legs.some((l) => l.ok === false) ? "lost" : legs.every((l) => l.ok === true) ? "won" : k.status === "void" ? "void" : "pending";
    return { tier: TIER[k.tier], status, p: pctOf(k.chance), pts: k.points, right: legs.filter((l) => l.ok === true).length, n: legs.length, legs };
  });
  if (c.every((k) => k.status !== "pending")) {
    const hit = c.filter((k) => k.status === "won"), miss = c.filter((k) => k.status === "lost");
    const names = (xs) => xs.map((k) => k.tier).join(" and ");
    const h = !hit.length ? "No card hit last night." : !miss.length ? "Every card hit." : `${names(hit)} hit. <em style="font-style:normal;color:var(--amber)">${names(miss)} missed.</em>`;
    items.push({ kind: "Last night's cards", when: "Morning · X, Threads", img: card("cards-last.png", { t: "cardsres", c, d: nice(YESTERDAY), h }),
      en: `Clutch's cards last night:\n\n${c.map((k) => `${k.tier}: ${k.status === "won" ? `hit, ${k.n} for ${k.n} (+${k.pts} pts)` : k.status === "lost" ? `missed, ${k.right} of ${k.n}` : "void"}`).join("\n")}\n\nAll sealed before tip. The misses stay on the record.` });
  }
}
// "Mar 9–15", or "Mar 30–Apr 5" across a month
const weekSpan = (mon) => { const a = nice(mon), z = nice(shift(mon, 6)); return a.split(" ")[0] === z.split(" ")[0] ? `${a}–${z.split(" ")[1]}` : `${a}–${z}`; };
if (new Date(TODAY + "T12:00:00Z").getUTCDay() === 1) {
  let w = null;
  try { w = (await get(`api_snapshots?select=body&key=like.cards/*&tier=eq.free&game_date=gte.${shift(TODAY, -7)}&game_date=lte.${YESTERDAY}&order=game_date.desc&limit=1`))[0]?.body?.week || null; }
  catch (e) { console.warn("cards week:", e.message); }
  if (w?.nights?.length) {
    const rec = (k) => `${w.nights.filter((x) => x[k] === "won").length}/${w.nights.filter((x) => x[k] === "won" || x[k] === "lost").length}`;
    items.push({ kind: "The week's record", when: "Monday morning · X, Threads", img: card("cards-week.png", { t: "cardsweek", w, d: weekSpan(w.monday) }),
      en: `Clutch's cards last week: Solid ${rec("solid")} · Balanced ${rec("balanced")} · Bold ${rec("bold")}. ${w.points?.total ?? 0} points from cards.\n\nEvery card sealed before tip. Beat Clutch's week in the app.` });
  }
}

// ── render ──
rmSync(join(OUT, TODAY), { recursive: true, force: true });
mkdirSync(join(OUT, TODAY), { recursive: true });
function run(mode, jobs) {
  if (!jobs.length) return;
  const f = join(OUT, `.${mode}.json`);
  writeFileSync(f, JSON.stringify(jobs.map((j) => ({ ...j, out: relative(HERE, j.out) }))));
  const r = spawnSync(process.execPath, [join(HERE, "render.mjs"), mode, f], { cwd: HERE, stdio: "inherit" });
  rmSync(f, { force: true });
  if (r.status !== 0) throw new Error(`render ${mode} failed`);
}
run("cards", cards);
try { run("video", videos); } catch (e) { console.warn(e.message, "— continuing with the cards"); items.forEach((it) => { if (it.vid && !existsSync(join(OUT, it.vid))) delete it.vid; if (it.vidTr && !existsSync(join(OUT, it.vidTr))) delete it.vidTr; }); }

// ── the page ──
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const block = (label, text, id) => `<div class="post"><div class="ph"><span>${label}</span><button type="button" data-copy="${id}">Copy</button></div><pre id="${id}">${esc(text)}</pre></div>`;
let n = 0;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Clutch Desk · ${esc(TODAY)}</title>
<style>
:root{--paper:#15130F;--card:#1C1914;--ink:#F1E9D8;--ink2:#CFC4AE;--ink3:#B4AA97;--rule:rgba(241,233,216,.14);--amber:#FFB020;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 -apple-system,"Segoe UI",Roboto,sans-serif;padding:20px 16px 80px}
.w{max-width:720px;margin:0 auto;display:flex;flex-direction:column;gap:28px}
h1{font:800 30px/1.1 Georgia,serif;margin:0}.eb{font:600 12px/1.4 ui-monospace,Menlo,monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--amber)}
.it{background:var(--card);border:1px solid var(--rule);padding:14px;display:flex;flex-direction:column;gap:12px}
.it h2{font:700 20px/1.2 Georgia,serif;margin:0}.when{font:600 12px/1.3 ui-monospace,Menlo,monospace;color:var(--ink3);letter-spacing:.08em}
.media{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.media img,.media video{width:100%;display:block;border:1px solid var(--rule);background:#000}
a.dl{display:inline-block;margin-top:6px;font:600 12px/1 ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--amber)}
.post{border:1px solid var(--rule)}.ph{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-bottom:1px solid var(--rule);font:600 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.1em;color:var(--ink3)}
.ph button{background:var(--amber);color:#15130F;border:0;padding:8px 10px;font:700 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase}
pre{margin:0;padding:10px 12px;white-space:pre-wrap;word-break:break-word;font:15px/1.5 -apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink)}
.empty{color:var(--ink3)}
</style></head><body><div class="w">
<div><div class="eb">Clutch desk · ${esc(TODAY)} (ET)</div><h1>Today's posts</h1><p class="empty">Made automatically from public data. Long-press an image or video to save it, or tap Download; copy the text. Keep the link in the profile.</p></div>
${items.length ? items.map((it) => `<div class="it"><div><h2>${esc(it.kind)}</h2><div class="when">${esc(it.when)}</div></div>
<div class="media">${[it.img, it.imgTr, it.vid, it.vidTr].filter(Boolean).map((f) => `<div>${f.endsWith(".mp4") ? `<video src="${f}" controls muted playsinline preload="metadata" poster="${f.replace(/\.mp4$/, ".cover.png")}"></video>` : `<img src="${f}" alt="" loading="lazy">`}<a class="dl" href="${f}" download>Download</a></div>`).join("")}</div>
${block("English", it.en, "c" + ++n)}${it.tr ? block("Turkish", it.tr, "c" + ++n) : ""}${it.poll ? `<p class="when">X poll: ${esc(it.poll.join(" / "))}</p>` : ""}</div>`).join("\n") : `<p class="empty">Nothing to post today (no games and no graded night).</p>`}
<p class="when">Built ${new Date().toISOString()} · source: desk-src/make.mjs</p>
</div><script>
document.querySelectorAll("[data-copy]").forEach(function(b){b.addEventListener("click",function(){var t=document.getElementById(b.dataset.copy).innerText;function ok(){b.textContent="Copied";setTimeout(function(){b.textContent="Copy"},1500)}if(navigator.clipboard){navigator.clipboard.writeText(t).then(ok,function(){})}});});
</script></body></html>`;
writeFileSync(join(OUT, "index.html"), html);
writeFileSync(join(OUT, TODAY, "index.html"), html.replaceAll(`src="${TODAY}/`, 'src="').replaceAll(`href="${TODAY}/`, 'href="').replaceAll(`poster="${TODAY}/`, 'poster="'));
console.log(`desk ${TODAY}: ${items.length} items, ${cards.length} cards, ${videos.length} videos → ${OUT}`);
