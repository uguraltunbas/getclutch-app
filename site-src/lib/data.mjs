// Every read the site makes, with the public anon key — the same rows the
// free app reads, and nothing else:
//
//   teams, games, win_total_lines (line, source, as_of — never the prices),
//   players (who is listed on the injury report), receipts
//   game_predictions        only the columns migration 031 grants to anon:
//                           home_win_prob, key_factors, generated_at,
//                           model_version, is_latest — never the projection
//   receipts_for_date(date) the seals (RPC, 049; anon by design)
//   api_snapshots           tier = free ONLY, always asked for by name:
//                           predictions/today/<date> (Clutch's call and the
//                           market's number, cut taken out), explain/<game>
//                           (top three reasons, who's out, blind spots),
//                           ledger, ledger/calls, corrections/latest,
//                           season/<season> (playoff chances), model/accuracy
//
// Never a Pro column, never a pro/elite snapshot row (even where RLS would
// let one through, as the season board's free window does until the lock),
// never the market's spread or total, never Model only.

import { shift, seasonOf } from "./time.mjs";

export function supabase(url, key) {
  const base = url.replace(/\/$/, "") + "/rest/v1";
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  async function get(path) {
    const r = await fetch(`${base}/${path}`, { headers });
    if (!r.ok) throw new Error(`${path.split("?")[0]}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
    return r.json();
  }
  async function rpc(name, body) {
    const r = await fetch(`${base}/rpc/${name}`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`rpc ${name}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
    return r.json();
  }
  return { get, rpc };
}

const inList = (xs) => `in.(${xs.map((x) => `"${x}"`).join(",")})`;
const chunks = (xs, n) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/** A free snapshot body by key, or null (no row). Batched. */
async function snapshots(db, keys) {
  const out = {};
  for (const part of chunks(keys, 40)) {
    const rows = await db.get(`api_snapshots?select=key,body,computed_at&tier=eq.free&key=${encodeURIComponent(inList(part))}`);
    for (const r of rows) out[r.key] = { body: r.body, computedAt: r.computed_at };
  }
  return out;
}

const GAME_COLS = "id,game_date,game_time_utc,status,season_type,home_team_id,away_team_id,home_score,away_score,period,clock,neutral_site";

/**
 * Everything one build needs. `today` is the ET date the build is for;
 * `days` how many nights back get game pages.
 */
export async function loadAll(db, { today, days = 7, warn = console.warn }) {
  const soft = async (what, f, fallback = null) => {
    try { return await f(); } catch (e) { warn(`${what}: ${e.message}`); return fallback; }
  };

  // The essentials: a build without them fails, and the last deploy stays up.
  const teams = await db.get("teams?select=id,abbreviation,name,nickname,city,conference,division,primary_color,secondary_color,arena,arena_city,arena_state&order=name");
  if (teams.length < 30) throw new Error(`teams: ${teams.length} rows`);
  const from = shift(today, -days), to = shift(today, 14);
  let games = await db.get(`games?select=${GAME_COLS}&game_date=gte.${from}&game_date=lte.${to}&order=game_date,game_time_utc`);

  // The next night with games, when the fortnight ahead has none.
  const playing = (g) => g.status !== "postponed" && g.status !== "cancelled";
  let ahead = games.filter((g) => g.game_date >= today && playing(g));
  if (!ahead.length) {
    const next = await db.get(`games?select=game_date&game_date=gt.${to}&status=neq.postponed&order=game_date&limit=1`);
    if (next.length) {
      games = games.concat(await db.get(`games?select=${GAME_COLS}&game_date=eq.${next[0].game_date}&order=game_time_utc`));
      ahead = games.filter((g) => g.game_date >= today && playing(g));
    }
  }
  const tonight = ahead.length ? ahead[0].game_date : null;
  const pastDates = [...new Set(games.filter((g) => g.game_date < today && g.game_date >= from).map((g) => g.game_date))];
  const pageDates = [...new Set([...pastDates, ...(games.some((g) => g.game_date === today) ? [today] : []), ...(tonight ? [tonight] : [])])].sort();
  const pageGames = games.filter((g) => pageDates.includes(g.game_date));

  // The published number: game_predictions' public columns, latest row only.
  const preds = {};
  for (const part of chunks(pageGames.map((g) => g.id), 60)) {
    const rows = await db.get(`game_predictions?select=game_id,home_win_prob,key_factors,generated_at,model_version&is_latest=eq.true&game_id=${inList(part)}`);
    for (const p of rows) preds[p.game_id] = p;
  }

  const lines = await soft("win_total_lines", () => db.get("win_total_lines?select=team_id,line,source,as_of,season&season=eq.2026-27"), []);
  const season = seasonOf(today);
  const snapKeys = [
    ...pageDates.map((d) => `predictions/today/${d}`),
    ...pageGames.filter((g) => g.game_date >= today).map((g) => `explain/${g.id}`),
    "ledger", "ledger/calls", "corrections/latest", "model/accuracy", `season/${season}`, "slate/index",
  ];
  const snaps = await soft("api_snapshots", () => snapshots(db, snapKeys), {});

  // One RPC per night, eight at a time (a whole season is ~200 nights).
  const receiptsByDate = {};
  for (const part of chunks(pageDates, 8)) {
    const got = await Promise.all(part.map((d) => soft(`receipts_for_date ${d}`, () => db.rpc("receipts_for_date", { p_date: d }))));
    part.forEach((d, i) => { receiptsByDate[d] = got[i]; });
  }
  const receipts = await soft("receipts", () => db.get("receipts?select=kind,slate_date,sha256,prev_sha256,committed_at,n_games,commit_url,path&order=committed_at.desc&limit=2000"), []);

  // Who is on the injury report, for tonight's teams (the free strip's source when no explain row lists them).
  const tonightTeams = [...new Set(pageGames.filter((g) => g.game_date >= today).flatMap((g) => [g.home_team_id, g.away_team_id]))];
  const players = tonightTeams.length
    ? await soft("players", () => db.get(`players?select=full_name,position,status,injury_description,team_id,rostered&status=neq.active&team_id=${inList(tonightTeams)}`), [])
    : [];

  // For the team pages: each team's latest finals and next games.
  const recent = await soft("recent finals", () => db.get(`games?select=${GAME_COLS}&status=eq.final&game_date=lt.${today}&order=game_date.desc&limit=700`), []);
  const upcoming = await soft("upcoming games", () => db.get(`games?select=${GAME_COLS}&game_date=gte.${today}&status=neq.postponed&order=game_date,game_time_utc&limit=400`), []);
  // Predictions for each team's next game (the team pages say Clutch's call when it exists).
  const nextIds = [];
  const seen = new Set();
  for (const g of upcoming) for (const t of [g.home_team_id, g.away_team_id]) if (!seen.has(t)) { seen.add(t); nextIds.push(g.id); }
  const missing = [...new Set(nextIds)].filter((id) => !preds[id]);
  for (const part of chunks(missing, 60)) {
    const rows = await soft("next-game predictions", () => db.get(`game_predictions?select=game_id,home_win_prob,key_factors,generated_at,model_version&is_latest=eq.true&game_id=${inList(part)}`), []);
    for (const p of rows) preds[p.game_id] = p;
  }

  return { today, days, teams, games, tonight, pageDates, preds, lines, snaps, receiptsByDate, receipts, players, recent, upcoming, season, builtAt: new Date().toISOString() };
}
