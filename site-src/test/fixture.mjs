// A realistic, made-up night-by-night season for building the site without
// Supabase: the 30 teams, the preseason (Oct 3–17, sealed, never graded), the
// regular season from Oct 20 (graded, misses included), tonight's slate still
// to tip and the next week on the schedule. Numbers come from a seeded
// generator, so the same date always gives the same data. Nothing here is a
// real call or a real result.
//
//   node site-src/test/fixture.mjs [--date 2026-10-26] [--out fixture.json]
//   node site-src/build.mjs --load-data fixture.json --date 2026-10-26 --out /tmp/site
//
// The shape is lib/data.mjs loadAll()'s: the build reads it with --load-data.

import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { shift, seasonOf } from "../lib/time.mjs";

// [abbr, city, nickname, conference, division, primary, secondary, arena]
const TEAMS = [
  ["ATL", "Atlanta", "Hawks", "East", "Southeast", "#E03A3E", "#C1D32F", "State Farm Arena"],
  ["BOS", "Boston", "Celtics", "East", "Atlantic", "#007A33", "#BA9653", "TD Garden"],
  ["BKN", "Brooklyn", "Nets", "East", "Atlantic", "#000000", "#FFFFFF", "Barclays Center"],
  ["CHA", "Charlotte", "Hornets", "East", "Southeast", "#1D1160", "#00788C", "Spectrum Center"],
  ["CHI", "Chicago", "Bulls", "East", "Central", "#CE1141", "#000000", "United Center"],
  ["CLE", "Cleveland", "Cavaliers", "East", "Central", "#860038", "#FDBB30", "Rocket Arena"],
  ["DAL", "Dallas", "Mavericks", "West", "Southwest", "#00538C", "#B8C4CA", "American Airlines Center"],
  ["DEN", "Denver", "Nuggets", "West", "Northwest", "#0E2240", "#FEC524", "Ball Arena"],
  ["DET", "Detroit", "Pistons", "East", "Central", "#C8102E", "#1D42BA", "Little Caesars Arena"],
  ["GSW", "Golden State", "Warriors", "West", "Pacific", "#1D428A", "#FFC72C", "Chase Center"],
  ["HOU", "Houston", "Rockets", "West", "Southwest", "#CE1141", "#000000", "Toyota Center"],
  ["IND", "Indiana", "Pacers", "East", "Central", "#002D62", "#FDBB30", "Gainbridge Fieldhouse"],
  ["LAC", "LA", "Clippers", "West", "Pacific", "#C8102E", "#1D428A", "Intuit Dome"],
  ["LAL", "Los Angeles", "Lakers", "West", "Pacific", "#552583", "#FDB927", "Crypto.com Arena"],
  ["MEM", "Memphis", "Grizzlies", "West", "Southwest", "#5D76A9", "#12173F", "FedExForum"],
  ["MIA", "Miami", "Heat", "East", "Southeast", "#98002E", "#F9A01B", "Kaseya Center"],
  ["MIL", "Milwaukee", "Bucks", "East", "Central", "#00471B", "#EEE1C6", "Fiserv Forum"],
  ["MIN", "Minnesota", "Timberwolves", "West", "Northwest", "#0C2340", "#236192", "Target Center"],
  ["NOP", "New Orleans", "Pelicans", "West", "Southwest", "#0C2340", "#C8102E", "Smoothie King Center"],
  ["NYK", "New York", "Knicks", "East", "Atlantic", "#006BB6", "#F58426", "Madison Square Garden"],
  ["OKC", "Oklahoma City", "Thunder", "West", "Northwest", "#007AC1", "#EF3B24", "Paycom Center"],
  ["ORL", "Orlando", "Magic", "East", "Southeast", "#0077C0", "#C4CED4", "Kia Center"],
  ["PHI", "Philadelphia", "76ers", "East", "Atlantic", "#006BB6", "#ED174C", "Xfinity Mobile Arena"],
  ["PHX", "Phoenix", "Suns", "West", "Pacific", "#1D1160", "#E56020", "Mortgage Matchup Center"],
  ["POR", "Portland", "Trail Blazers", "West", "Northwest", "#E03A3E", "#000000", "Moda Center"],
  ["SAC", "Sacramento", "Kings", "West", "Pacific", "#5A2D81", "#63727A", "Golden 1 Center"],
  ["SAS", "San Antonio", "Spurs", "West", "Southwest", "#C4CED4", "#000000", "Frost Bank Center"],
  ["TOR", "Toronto", "Raptors", "East", "Atlantic", "#CE1141", "#000000", "Scotiabank Arena"],
  ["UTA", "Utah", "Jazz", "West", "Northwest", "#002B5C", "#F9A01B", "Delta Center"],
  ["WAS", "Washington", "Wizards", "East", "Southeast", "#002B5C", "#E31837", "Capital One Arena"],
];
const STATE = { ATL: "GA", BOS: "MA", BKN: "NY", CHA: "NC", CHI: "IL", CLE: "OH", DAL: "TX", DEN: "CO", DET: "MI", GSW: "CA", HOU: "TX", IND: "IN", LAC: "CA", LAL: "CA", MEM: "TN", MIA: "FL", MIL: "WI", MIN: "MN", NOP: "LA", NYK: "NY", OKC: "OK", ORL: "FL", PHI: "PA", PHX: "AZ", POR: "OR", SAC: "CA", SAS: "TX", TOR: "ON", UTA: "UT", WAS: "DC" };
const WIN_TOTAL = { OKC: 62.5, CLE: 57.5, BOS: 52.5, NYK: 53.5, DEN: 52.5, HOU: 52.5, MIN: 49.5, LAL: 47.5, LAC: 46.5, ORL: 47.5, DET: 45.5, GSW: 45.5, IND: 41.5, ATL: 46.5, MIL: 43.5, SAS: 44.5, MEM: 44.5, PHI: 41.5, MIA: 38.5, DAL: 40.5, CHI: 33.5, PHX: 35.5, POR: 34.5, SAC: 33.5, TOR: 36.5, NOP: 31.5, CHA: 27.5, UTA: 21.5, BKN: 22.5, WAS: 20.5 };

/** mulberry32: a small seeded generator. */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const sha = (s) => createHash("sha256").update(s).digest("hex");
const uuid = (s) => { const h = sha(s); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`; };

export function fixture(today) {
  const R = rng(20261020);
  const teams = TEAMS.map(([abbreviation, city, nickname, conference, division, primary_color, secondary_color, arena], i) => ({
    id: i + 1, abbreviation, name: `${city === "LA" ? "LA" : city} ${nickname}`, nickname, city, conference, division, primary_color, secondary_color, arena, arena_city: city === "LA" ? "Inglewood" : city === "Golden State" ? "San Francisco" : city, arena_state: STATE[abbreviation],
  }));
  const strength = Object.fromEntries(teams.map((t) => [t.id, (WIN_TOTAL[t.abbreviation] - 41) / 41]));
  const season = seasonOf(today);
  const preStart = "2026-10-03", regStart = "2026-10-20";
  const from = preStart, to = shift(today, 14);

  // The schedule: 4–11 games a night (the preseason ends Oct 17; Oct 18–19 are dark).
  const games = [];
  let id = 41000;
  for (let d = from; d <= to; d = shift(d, 1)) {
    if (d === "2026-10-18" || d === "2026-10-19") continue;
    const pre = d < regStart;
    const n = pre ? 3 + Math.floor(R() * 4) : d === regStart ? 2 : 4 + Math.floor(R() * 8);
    const pool = teams.map((t) => t.id).sort(() => R() - 0.5);
    for (let k = 0; k < n; k++) {
      const home = pool[2 * k], away = pool[2 * k + 1];
      const hourUtc = [23, 23, 23, 0, 0, 1, 2, 2, 3][Math.min(8, k)];
      const tipDay = hourUtc < 12 ? shift(d, 1) : d;
      const tip = `${tipDay}T${String(hourUtc).padStart(2, "0")}:${k % 2 ? "30" : "00"}:00+00:00`;
      const g = { id: ++id, game_date: d, game_time_utc: tip, status: "scheduled", season_type: pre ? "Preseason" : "Regular Season", home_team_id: home, away_team_id: away, home_score: null, away_score: null, period: null, clock: null, neutral_site: false };
      const p = Math.min(0.9, Math.max(0.1, 0.5 + 0.035 + (strength[home] - strength[away]) * 0.45 + (R() - 0.5) * 0.1));
      g._p = pre ? 0.5 + (p - 0.5) * 0.4 : p;
      if (d < today) {
        const homeWon = R() < p;
        const w = 104 + Math.floor(R() * 22), l = w - 1 - Math.floor(R() * 18);
        Object.assign(g, { status: "final", home_score: homeWon ? w : l, away_score: homeWon ? l : w, period: R() < 0.06 ? 5 : 4, clock: "0:00" });
      }
      games.push(g);
    }
  }
  const T = Object.fromEntries(teams.map((t) => [t.id, t]));
  const tonight = games.find((g) => g.game_date >= today)?.game_date ?? null;
  const pageDates = [...new Set(games.filter((g) => g.game_date <= (tonight ?? today)).map((g) => g.game_date))].sort();
  const pageGames = games.filter((g) => pageDates.includes(g.game_date));
  const nextGames = []; const seenTeam = new Set();
  for (const g of games.filter((x) => x.game_date >= today)) for (const t of [g.home_team_id, g.away_team_id]) if (!seenTeam.has(t)) { seenTeam.add(t); nextGames.push(g); }
  const predicted = new Set([...pageGames, ...nextGames].filter((g) => g.game_date <= shift(today, 1)).map((g) => g.id));

  const reasons = [["rest", "Rest: one side on the second night of a back-to-back"], ["elo", "Elo ratings"], ["injuries", "Who's out tonight"], ["home", "Home court"], ["form", "Form over the last ten games"]];
  const preds = {};
  for (const g of games.filter((x) => predicted.has(x.id))) {
    const h = T[g.home_team_id], a = T[g.away_team_id];
    const hp = Math.round(g._p * 1000) / 1000;
    preds[g.id] = {
      game_id: g.id, home_win_prob: hp, generated_at: `${g.game_date}T14:05:00+00:00`, model_version: "clutch-2.1.0",
      key_factors: reasons.slice(0, 4).map(([factor, label], i) => ({ factor, label: factor === "elo" ? `Elo ratings: ${h.abbreviation} ${1500 + Math.round(strength[h.id] * 400)}, ${a.abbreviation} ${1500 + Math.round(strength[a.id] * 400)}` : label, impact: (0.06 - i * 0.012) * (i % 2 ? -1 : 1), direction: (hp >= 0.5) === (i % 2 === 0) ? "home" : "away" })),
    };
  }

  // The seals: one file per night, committed the morning of the slate.
  const receiptsByDate = {}, receipts = [], receiptGames = [];
  let prev = sha("genesis");
  let rid = 900;
  for (const d of pageDates) {
    const night = games.filter((g) => g.game_date === d);
    const committed = `${d}T14:12:00+00:00`;
    const hash = sha(`seal ${d}`), commitSha = sha(`commit ${d}`).slice(0, 40), path = `seals/${d}.json`;
    const r = { id: ++rid, kind: "seal", slate_date: d, sha256: hash, prev_sha256: prev, committed_at: committed, n_games: night.length, commit_url: `https://github.com/uguraltunbas/clutch-receipts/commit/${commitSha}`, path };
    receipts.push(r);
    prev = hash;
    receiptsByDate[d] = { games: night.map((g) => {
      receiptGames.push({ receipt_id: rid, game_id: g.id, home_win_prob: preds[g.id]?.home_win_prob ?? g._p });
      return { game_id: g.id, status: g.status, tip_utc: g.game_time_utc, sealed: true, seal: { home_win_prob: preds[g.id]?.home_win_prob ?? g._p, sha256: hash, committed_at: committed, commit_url: r.commit_url, commit_sha: commitSha, path }, graded: g.status === "final" ? { home_win_prob: preds[g.id]?.home_win_prob ?? g._p } : null };
    }) };
  }
  receipts.reverse();

  // The Ledger: every regular-season final graded the night after (a game played today waits).
  const graded = games.filter((g) => g.status === "final" && g.season_type !== "Preseason" && g.game_date < today);
  const calls = graded.map((g) => {
    const h = T[g.home_team_id], a = T[g.away_team_id];
    const hp = preds[g.id]?.home_win_prob ?? g._p;
    const homePick = hp >= 0.5;
    const homeWon = g.home_score > g.away_score;
    return { game_id: g.id, game_date: g.game_date, tip_utc: g.game_time_utc, matchup: `${a.abbreviation} @ ${h.abbreviation}`, pick: homePick ? h.abbreviation : a.abbreviation, claimed_pct: Math.round((homePick ? hp : 1 - hp) * 1000) / 10, correct: homePick === homeWon, market_pct: null, final: `${g.away_score}-${g.home_score}`, season_type: g.season_type, model_version: "clutch-2.1.0" };
  });
  const right = calls.filter((c) => c.correct).length;
  const homeWins = graded.filter((g) => g.home_score > g.away_score).length;
  const ledger = calls.length ? {
    available: true, season, total_calls: calls.length, correct: right, hit_rate: Math.round((right / calls.length) * 1000) / 10,
    baselines: { always_home: { hit_rate: Math.round((homeWins / calls.length) * 1000) / 10 } }, model_versions: ["clutch-2.1.0"], date_range: [regStart, shift(today, -1)], seasons: [],
  } : { available: false };
  const ledgerAt = `${today}T08:40:00+00:00`;

  for (const g of games) delete g._p;
  const snaps = {
    ledger: { body: ledger, computedAt: ledgerAt },
    "ledger/calls": { body: { calls }, computedAt: ledgerAt },
  };
  const lines = teams.map((t) => ({ team_id: t.id, line: WIN_TOTAL[t.abbreviation], source: "consensus", as_of: "2026-09-30", season: "2026-27" }));
  const upcoming = games.filter((g) => g.game_date >= today);
  const recent = games.filter((g) => g.status === "final").reverse();
  return { today, days: pageDates.length, teams, games, tonight, pageDates, preds, lines, snaps, receiptsByDate, receipts, receiptGames, players: [], recent, upcoming, lastSeason: [], prevSeason: `${+season.slice(0, 4) - 1}-${season.slice(2, 4)}`, season, builtAt: `${today}T16:00:00.000Z` };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  const date = arg("--date", "2026-10-26");
  const out = arg("--out", "fixture.json");
  writeFileSync(out, JSON.stringify(fixture(date)));
  console.log(`fixture ${date} → ${out}`);
}
