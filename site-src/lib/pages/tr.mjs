// /tr/ and /tr/houston-rockets/ — a small Turkish trial (owner decision K2,
// 2026-10-23): Turkish readers follow the Rockets, and these two pages say in
// Turkish what the English paper says, with tip times in Turkey's time (TSİ).
// The game, Ledger and Learn pages they link to stay English. Built from the
// same data as every other page; checked for Turkish betting words too
// (build.mjs, TR_WORDS).

import { page, esc, PLAY, APP_STORE } from "../html.mjs";
import { pct, pickSide, rec } from "../copy.mjs";
import { chanceText } from "./playoffs.mjs";

/** Turkish words a review reads as wagering: never on a /tr/ page. ("oran" is out too: "isabet oranı" reads like a price.) */
export const TR_WORDS = /\b(bahis|bahsi|iddaa|kupon|oran|oranı|oranlar|kazandıran|banko)\b/i;

const tsi = (utc) => new Date(utc).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
const tsiDay = (iso, year = false) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" });
/** "%85", "<%1", ">%99" — the Turkish way round. */
const trChance = (p) => chanceText(p).replace(/^([<>]?)(\d+)%$/, "$1%$2");

function trHome(m) {
  const games = m.tonight ? m.nights[m.tonight] ?? [] : [];
  const r = m.record;
  const rows = games.map((g) => {
    const line = g.status === "final" && g.homeScore != null
      ? `Bitti: ${g.away.abbreviation} ${g.awayScore}–${g.homeScore} ${g.home.abbreviation}.`
      : g.hasCall ? `Clutch, ${esc(g.side.team.nickname)} için %${pct(g.side.prob)} kazanma olasılığı veriyor.` : "Clutch'ın sayısı maç günü sabah yayımlanır.";
    return `<li><a href="${g.path}">${esc(g.away.nickname)} – ${esc(g.home.nickname)}</a>${g.tipUtc ? ` · ${esc(tsi(g.tipUtc))} TSİ` : ""}: ${line}</li>`;
  }).join("");
  const body = `<div class="wrap r"><div class="rhead"><span class="kick">Clutch · Türkçe</span><h1 class="rh1">Her NBA maçı için tek bir sayı.</h1><p class="rdeck">Clutch, NBA'deki her maç için bir kazanma olasılığı yayımlar. Sayı maç başlamadan herkese açık bir dosyaya mühürlenir, maç bitince de ıskalar dahil herkesin önünde notlanır: ESPN'in BPI modeli, piyasa ve "her maç ev sahibi" ile aynı maçlarda.</p></div>
<div class="body">
${games.length ? `<section class="blk" aria-labelledby="gece"><h2 id="gece">Sıradaki maçlar</h2><ul class="spots">${rows}</ul><p class="note gap">Saatler Türkiye saatiyle (TSİ). Maç sayfaları İngilizce. <a href="/tonight/">Tüm maçlar →</a></p></section>` : ""}
<section class="blk" aria-labelledby="rockets"><h2 id="rockets">Houston Rockets ve Alperen Şengün</h2><p>Rockets'ın her maçı için Clutch'ın tahmini, playoff şansı ve son maçlar, Türkiye saatiyle: <a href="/tr/houston-rockets/">Houston Rockets sayfası →</a></p></section>
<section class="blk" aria-labelledby="kayit"><h2 id="kayit">Kayıt ortada</h2><p>${r ? `${esc(r.season)} sezonunda Clutch ${r.n} maçta notlandı: ${rec(r.hits, r.n)} (doğru–yanlış)${r.n < 20 ? "; 20 maçtan az olduğu için henüz yüzde verilmiyor" : ""}.` : "Sezonun ilk notları ilk maçların ertesi sabahı gelir."} Her tahmin maçtan önce GitHub'da mühürlenir; sonradan değiştirilemez, ıskalar da silinmez. <a href="/accuracy/">Doğruluk raporu →</a> · <a href="/learn/what-is-win-probability/">Kazanma olasılığı nedir? (İngilizce) →</a></p></section>
<section class="blk" aria-labelledby="oyna"><h2 id="oyna">Sen de tahmin et</h2><p>Her maçta Clutch'a karşı kendi tahminini yap; doğru tahminler puan kazandırır, sürpriz ne kadar büyükse puan o kadar yüksek. Ücretsiz, tarayıcıda ya da iPhone'da (uygulama İngilizce). <a href="${PLAY}">Tarayıcıda aç →</a> · <a href="${APP_STORE}">iPhone uygulaması →</a></p></section>
</div></div>`;
  const path = "/tr/";
  const title = "Clutch Türkçe: her NBA maçı için kazanma olasılığı · Clutch";
  return { path, title, html: page({ path, title, description: "Her NBA maçı için Clutch'ın kazanma olasılığı, Türkiye saatiyle. Tahminler maçtan önce mühürlenir, maçtan sonra herkesin önünde notlanır.", body, current: "tonight", og: "default", lang: "tr" }) };
}

function trRockets(m) {
  const t = m.byAbbr.HOU;
  if (!t) return null;
  const mine = (g) => g.home_team_id === t.id || g.away_team_id === t.id;
  const opp = (g) => m.T[g.home_team_id === t.id ? g.away_team_id : g.home_team_id];
  const next = m.raw.upcoming.filter(mine).slice(0, 5);
  const last = m.raw.recent.filter(mine).slice(0, 6);
  const board = (m.seasonBoard?.teams ?? []).find((x) => x.team_id === t.id);
  const nextRows = next.map((g) => {
    const v = m.gameById[g.id];
    const p = v?.hasCall ? v.homeProb : m.raw.preds[g.id] ? +m.raw.preds[g.id].home_win_prob : null;
    const side = p == null ? null : pickSide(p, m.T[g.home_team_id], m.T[g.away_team_id]);
    const where = g.home_team_id === t.id ? "evinde" : "deplasmanda";
    const name = `${opp(g).nickname} (${where})${g.season_type === "Preseason" ? " · hazırlık" : ""}`;
    return `<div class="callrow"><span class="mono">${esc(g.game_time_utc ? tsi(g.game_time_utc) : tsiDay(g.game_date))}</span><span>${v?.path ? `<a href="${v.path}">${esc(name)}</a>` : esc(name)}</span><span class="d${side ? "" : " dim"}">${side ? `${esc(side.team.abbreviation)} ${pct(side.prob)}` : "--"}</span><span>${side ? '<span class="chip">Tahmin</span>' : '<span class="note">Maç sabahı</span>'}</span></div>`;
  }).join("");
  const lastRows = last.map((g) => {
    const us = g.home_team_id === t.id ? g.home_score : g.away_score, them = g.home_team_id === t.id ? g.away_score : g.home_score;
    const c = m.callBy[g.id], v = m.gameById[g.id];
    const label = `${us > them ? "G" : "M"} ${us}–${them} · ${opp(g).nickname}${g.season_type === "Preseason" ? " · hazırlık" : g.season_type === "Playoffs" ? " · playoff" : ""}`;
    return `<div class="callrow"><span class="mono">${esc(tsiDay(g.game_date, g.game_date < `${m.current.slice(0, 4)}-08-01`))}</span><span>${v?.path ? `<a href="${v.path}">${esc(label)}</a>` : esc(label)}</span>${c ? `<span class="d">${esc(c.pick)} ${Math.round(c.claimed_pct)}</span><span>${c.correct ? '<span class="chip win">✓ Doğru</span>' : '<span class="chip loss">✗ Yanlış</span>'}</span>` : `<span class="d dim">--</span><span><span class="note">${g.season_type === "Preseason" ? "Hazırlık" : "Notlanmadı"}</span></span>`}</div>`;
  }).join("");
  const graded = m.calls.filter((c) => c.matchup.split(" @ ").includes("HOU") && (c.season || "") === m.current);
  const right = graded.filter((c) => c.correct).length;
  const stats = [
    board?.playoff_pct != null ? `<div><span class="d">${trChance(board.playoff_pct)}</span><span class="mono">Playoff şansı</span></div>` : "",
    board ? `<div><span class="d">${board.wins ?? 0}–${board.losses ?? 0}</span><span class="mono">Galibiyet–mağlubiyet</span></div>` : "",
    graded.length ? `<div><span class="d">${rec(right, graded.length)}</span><span class="mono">Clutch'ın Rockets tahminleri</span></div>` : "",
  ].join("");
  const body = `<div class="wrap r"><div class="rhead h-HOU"><span class="kick">Houston Rockets · ${esc(m.current)} · Türkçe</span><h1 class="rh1">Houston Rockets: her maç için Clutch'ın tahmini</h1><p class="rdeck">Alperen Şengün'ün takımı Rockets'ın sıradaki maçları Türkiye saatiyle, her biri için Clutch'ın kazanma olasılığı, playoff şansı ve son maçların sonuçları. Tahminler maçtan önce mühürlenir, maçtan sonra notlanır.</p>${stats ? `<div class="stat gap">${stats}</div>` : ""}</div>
<div class="body">
<section aria-labelledby="sirada"><h2 class="sh" id="sirada">Sıradaki maçlar (TSİ)</h2>${nextRows || '<p class="sub">Fikstürde henüz maç yok.</p>'}<p class="note gap">Clutch'ın sayısı maç günü sabah (ABD saatiyle) yayımlanır ve maç başlamadan mühürlenir.</p></section>
<section aria-labelledby="son"><h2 class="sh s" id="son">Son maçlar</h2>${lastRows || '<p class="sub">Henüz biten maç yok.</p>'}<p class="note gap">Hazırlık maçları notlanmaz. Tarihler ABD saatiyle maç günü.</p></section>
<section class="blk" aria-labelledby="nasil"><h2 id="nasil">Sayı nereden geliyor?</h2><p>Model her maçı o sabah bilinenlerle anlatır: takımların bu sezonki ve son maçlardaki gücü, dinlenme ve arka arkaya maçlar, yolculuk, ve ligin resmî sakat listesi. Playoff şansı, sezonun kalanı her gece 10.000 kez oynatılarak bulunur. <a href="/playoff-chances/">Tüm takımların playoff şansı →</a> · <a href="${m.teamPath(t)}">İngilizce Rockets sayfası →</a></p></section>
<div class="btns"><a class="btn" href="${PLAY}">Rockets maçlarını tahmin et</a><a class="btn ghost" href="/tr/">Clutch Türkçe</a></div>
</div></div>`;
  const path = "/tr/houston-rockets/";
  const title = "Houston Rockets maçları ve Alperen Şengün: Clutch tahminleri · Clutch";
  const description = `Houston Rockets'ın sıradaki maçları Türkiye saatiyle, her maç için kazanma olasılığı${board?.playoff_pct != null ? `, playoff şansı ${trChance(board.playoff_pct)}` : ""}. Maçtan önce mühürlenir, sonra notlanır.`;
  return { path, title, html: page({ path, title, description, body, current: "teams", og: "default", lang: "tr" }) };
}

export function trPages(m) {
  return [trHome(m), trRockets(m)].filter(Boolean);
}

