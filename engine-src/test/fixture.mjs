// A small public slate for the engine's tests: two nights, their seals, the
// Ledger's calls and the free snapshots, shaped like the anon rows facts.mjs
// reads. Made up (no real game's numbers), and nothing a free reader can't see.

export const TODAY = "2026-10-30"; // a Friday
export const LAST_NIGHT = "2026-10-29";
export const NOW = Date.parse("2026-10-30T20:00:00Z"); // the pre-tip batch

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const G = { cleAtl: id(1), memPor: id(2), nykPhi: id(3), chaWas: id(4), atlCle: id(5), porMem: id(6) };

const hex = (c) => c.repeat(64);

export const rows = () => ({
  teams: [
    ["ATL", "Hawks", "Atlanta"], ["CLE", "Cavaliers", "Cleveland"], ["MEM", "Grizzlies", "Memphis"], ["POR", "Trail Blazers", "Portland"],
    ["NYK", "Knicks", "New York"], ["PHI", "76ers", "Philadelphia"], ["CHA", "Hornets", "Charlotte"], ["WAS", "Wizards", "Washington"],
    ["BOS", "Celtics", "Boston"], ["MIA", "Heat", "Miami"], ["LAL", "Lakers", "Los Angeles"], ["GSW", "Warriors", "San Francisco"],
    ["DEN", "Nuggets", "Denver"], ["UTA", "Jazz", "Salt Lake City"], ["MIL", "Bucks", "Milwaukee"], ["CHI", "Bulls", "Chicago"],
  ].map(([abbreviation, nickname, city]) => ({ id: `t-${abbreviation}`, abbreviation, nickname, city })),
  games: [
    { id: G.cleAtl, game_date: LAST_NIGHT, game_time_utc: "2026-10-29T23:00:00+00:00", status: "final", season_type: "Regular Season", home_team_id: "t-ATL", away_team_id: "t-CLE" },
    { id: G.memPor, game_date: LAST_NIGHT, game_time_utc: "2026-10-30T02:00:00+00:00", status: "final", season_type: "Regular Season", home_team_id: "t-POR", away_team_id: "t-MEM" },
    { id: G.nykPhi, game_date: TODAY, game_time_utc: "2026-10-30T23:00:00+00:00", status: "scheduled", season_type: "Regular Season", home_team_id: "t-PHI", away_team_id: "t-NYK" },
    { id: G.chaWas, game_date: TODAY, game_time_utc: "2026-10-30T23:30:00+00:00", status: "scheduled", season_type: "Regular Season", home_team_id: "t-WAS", away_team_id: "t-CHA" },
    { id: G.atlCle, game_date: TODAY, game_time_utc: "2026-10-31T00:00:00+00:00", status: "scheduled", season_type: "Regular Season", home_team_id: "t-CLE", away_team_id: "t-ATL" },
    { id: G.porMem, game_date: TODAY, game_time_utc: "2026-10-31T01:00:00+00:00", status: "postponed", season_type: "Regular Season", home_team_id: "t-MEM", away_team_id: "t-POR" },
  ],
  receipts: [
    { id: 10, kind: "seal", slate_date: LAST_NIGHT, sha256: hex("1"), prev_sha256: hex("0"), committed_at: "2026-10-29T22:30:00+00:00", n_games: 2, commit_url: null },
    { id: 11, kind: "seal", slate_date: LAST_NIGHT, sha256: hex("2"), prev_sha256: hex("1"), committed_at: "2026-10-30T01:21:00+00:00", n_games: 1, commit_url: null },
    { id: 12, kind: "reveal", slate_date: LAST_NIGHT, sha256: hex("9"), prev_sha256: hex("2"), committed_at: "2026-10-30T07:00:00+00:00", n_games: 2, commit_url: null },
    { id: 20, kind: "seal", slate_date: TODAY, sha256: hex("3"), prev_sha256: hex("2"), committed_at: "2026-10-30T14:02:00+00:00", n_games: 3, commit_url: null },
    { id: 21, kind: "seal", slate_date: TODAY, sha256: hex("4"), prev_sha256: hex("3"), committed_at: "2026-10-30T19:02:00+00:00", n_games: 3, commit_url: null },
  ],
  receipt_games: [
    { receipt_id: 10, game_id: G.cleAtl, home_win_prob: 0.51 },
    { receipt_id: 10, game_id: G.memPor, home_win_prob: 0.7 },
    { receipt_id: 11, game_id: G.memPor, home_win_prob: 0.716 },
    { receipt_id: 20, game_id: G.nykPhi, home_win_prob: 0.45 },
    { receipt_id: 20, game_id: G.chaWas, home_win_prob: 0.49 },
    { receipt_id: 20, game_id: G.atlCle, home_win_prob: 0.62 },
    { receipt_id: 21, game_id: G.nykPhi, home_win_prob: 0.4456 },
    { receipt_id: 21, game_id: G.chaWas, home_win_prob: 0.4892 },
    { receipt_id: 21, game_id: G.atlCle, home_win_prob: 0.6586 },
  ],
  snapshots: {
    [`predictions/today/${TODAY}`]: { at: "2026-10-30T19:02:21Z", body: { date: TODAY, clutch_pick_of_day: { pick: "NYK", game_id: G.nykPhi, matchup: "NYK @ PHI" } } },
    "ledger/calls": { at: "2026-10-30T07:30:00Z", body: { calls: ledgerCalls(), total: ledgerCalls().length, limit: 500, offset: 0 } },
    [`whatif/${G.nykPhi}`]: { at: "2026-10-30T19:03:27Z", body: {} },
  },
});

/** Last night's two calls (one right, one missed) and a week of them, Oct 19–25. */
function ledgerCalls() {
  const call = (game_id, game_date, matchup, pick, claimed_pct, correct, final, tip_utc) => ({
    game_id, game_date, matchup, pick, claimed_pct, correct, final, tip_utc,
    season: "2026-27", season_type: "Regular Season", home_pct: claimed_pct, model_pct: claimed_pct - 1, market_pct: claimed_pct + 1, predicted_at: tip_utc, model_version: "test",
  });
  const out = [
    call(G.cleAtl, LAST_NIGHT, "CLE @ ATL", "ATL", 51, true, "111-114", "2026-10-29T23:00:00+00:00"),
    call(G.memPor, LAST_NIGHT, "MEM @ POR", "POR", 71.6, false, "124-103", "2026-10-30T02:00:00+00:00"),
  ];
  const week = ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-24", "2026-10-25"];
  week.forEach((d, i) => {
    out.push(call(id(100 + i * 2), d, "NYK @ PHI", "PHI", 60 + i, i % 2 === 0, "101-110", `${d}T23:00:00+00:00`));
    out.push(call(id(101 + i * 2), d, "CHA @ WAS", "CHA", 55 + i, i % 3 !== 0, "108-104", `${d}T23:30:00+00:00`));
  });
  return out;
}

/**
 * A night of eight games whose three cards all won (the free cards/<date>
 * snapshot, legs open), the morning seal they were built from (id 40) and a
 * later one that moved a number (41). By the rule: Solid PHI ATL MEM,
 * Balanced + BOS WAS, Bold the three closest games' underdogs LAL UTA CHI.
 * `edit(cards)` changes the snapshot's cards before they are stored.
 */
export const CARD_NIGHT = "2026-10-27";
export function cardNight(r, edit = (cards) => cards) {
  const night = [
    // id, away, home, tip (UTC), the seal's home win probability, final away–home
    [7, "CLE", "ATL", "2026-10-27T23:00:00+00:00", 0.8, [99, 112]],
    [8, "MEM", "POR", "2026-10-27T23:00:00+00:00", 0.3, [118, 104]],
    [9, "NYK", "PHI", "2026-10-27T23:30:00+00:00", 0.85, [97, 120]],
    [10, "CHA", "WAS", "2026-10-28T00:00:00+00:00", 0.64, [101, 109]],
    [11, "BOS", "MIA", "2026-10-28T00:00:00+00:00", 0.33, [113, 105]],
    [12, "LAL", "GSW", "2026-10-28T02:00:00+00:00", 0.55, [112, 108]],
    [13, "DEN", "UTA", "2026-10-28T01:00:00+00:00", 0.42, [110, 115]],
    [14, "MIL", "CHI", "2026-10-28T00:30:00+00:00", 0.4, [104, 111]],
  ];
  for (const [n, away, home, tip, , [as, hs]] of night) {
    r.games.push({ id: id(n), game_date: CARD_NIGHT, game_time_utc: tip, status: "final", season_type: "Regular Season", home_team_id: `t-${home}`, away_team_id: `t-${away}`, home_score: hs, away_score: as });
  }
  r.receipts.push(
    { id: 40, kind: "seal", slate_date: CARD_NIGHT, sha256: hex("a"), prev_sha256: hex("4"), committed_at: "2026-10-27T14:01:00+00:00", n_games: 8, commit_url: "https://github.com/uguraltunbas/clutch-receipts/commit/aaaa", path: "seals/2026/10/27/seal-140100Z.json" },
    { id: 41, kind: "seal", slate_date: CARD_NIGHT, sha256: hex("b"), prev_sha256: hex("a"), committed_at: "2026-10-27T19:01:00+00:00", n_games: 8, commit_url: "https://github.com/uguraltunbas/clutch-receipts/commit/bbbb", path: "seals/2026/10/27/seal-190100Z.json" },
  );
  for (const [n, , , , p] of night) {
    r.receipt_games.push({ receipt_id: 40, game_id: id(n), home_win_prob: p });
    r.receipt_games.push({ receipt_id: 41, game_id: id(n), home_win_prob: n === 9 ? 0.87 : p }); // PHI moved after the cards were built
  }
  const byTeam = {};
  for (const [n, away, home, tip, p] of night) {
    byTeam[home] = { game_id: id(n), team: home, team_id: `t-${home}`, opponent: away, home: true, chance: p, tip };
    byTeam[away] = { game_id: id(n), team: away, team_id: `t-${away}`, opponent: home, home: false, chance: Math.round((1 - p) * 1e4) / 1e4, tip };
  }
  const card = (tier, teams) => {
    const legs = teams.map((t) => byTeam[t]);
    return { tier, status: "won", locked: false, leg_count: legs.length, chance: legs.reduce((a, l) => a * l.chance, 1), legs };
  };
  const cards = edit([card("solid", ["PHI", "ATL", "MEM"]), card("balanced", ["PHI", "ATL", "MEM", "BOS", "WAS"]), card("bold", ["LAL", "UTA", "CHI"])]);
  r.snapshots[`cards/${CARD_NIGHT}`] = { at: "2026-10-28T07:30:00Z", body: { date: CARD_NIGHT, built_at: "2026-10-27T14:02:00Z", rule: "v1", cards } };
  return r;
}

/**
 * A run of right calls at 75% or more on three nights before last night
 * (`right` of them, 76–85%, each with its seal before tip), then last night:
 * Cleveland at Atlanta shown at 80% (right), and with `miss` Portland at 76%
 * (it lost 103–124 to Memphis). Changes rows() in place.
 */
export function hotNights(r, { right = 9, miss = false } = {}) {
  const calls = r.snapshots["ledger/calls"].body.calls;
  const nights = ["2026-10-26", "2026-10-27", "2026-10-28"];
  for (let k = 0; k < right; k++) {
    const d = nights[k % 3], pct = 76 + (k % 10);
    const game_id = id(300 + k), tip_utc = `${d}T23:${String(k).padStart(2, "0")}:00+00:00`;
    calls.push({ game_id, game_date: d, matchup: "NYK @ PHI", pick: "PHI", claimed_pct: pct, correct: true, final: "99-110", tip_utc, season: "2026-27", season_type: "Regular Season" });
    r.receipt_games.push({ receipt_id: 300 + nights.indexOf(d), game_id, home_win_prob: pct / 100 });
  }
  nights.forEach((d, i) => r.receipts.push({ id: 300 + i, kind: "seal", slate_date: d, sha256: hex("7"), prev_sha256: hex("6"), committed_at: `${d}T14:00:00+00:00`, n_games: 3, commit_url: "https://github.com/uguraltunbas/clutch-receipts/commit/cccc" }));
  const hot = (gid, pct, home) => {
    calls.find((c) => c.game_id === gid).claimed_pct = pct;
    for (const g of r.receipt_games.filter((x) => x.game_id === gid)) g.home_win_prob = home;
  };
  hot(G.cleAtl, 80, 0.8);
  if (miss) hot(G.memPor, 76, 0.76);
  r.snapshots["ledger/calls"].body.total = calls.length;
  return r;
}

/** The week's seals (one a night with calls), added to rows() where a test needs them. */
export const weekSeals = (dates = ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-24", "2026-10-25"]) =>
  dates.map((d, i) => ({ id: 30 + i, kind: "seal", slate_date: d, sha256: hex("5"), prev_sha256: hex("6"), committed_at: `${d}T19:00:00+00:00`, n_games: 2, commit_url: null }));

/** site-src's supabase().get over the rows above: the few filters facts.mjs uses. */
export function fakeDb(r = rows()) {
  const asked = [];
  return {
    asked,
    async get(path) {
      asked.push(path);
      const [table, qs = ""] = path.split("?");
      const q = new URLSearchParams(qs);
      const eq = (k) => q.get(k)?.replace(/^eq\./, "");
      switch (table) {
        case "teams":
          return r.teams;
        case "games":
          return r.games.filter((g) => g.game_date === eq("game_date")).sort((a, b) => a.game_time_utc.localeCompare(b.game_time_utc));
        case "receipts": {
          const range = q.getAll("slate_date");
          const lo = range.find((x) => x.startsWith("gte."))?.slice(4), hi = range.find((x) => x.startsWith("lte."))?.slice(4);
          return r.receipts
            .filter((x) => x.kind === eq("kind") && x.slate_date >= lo && x.slate_date <= hi)
            .sort((a, b) => b.committed_at.localeCompare(a.committed_at) || b.id - a.id);
        }
        case "receipt_games": {
          const ids = q.get("receipt_id").match(/\((.*)\)/)[1].split(",").map(Number);
          return r.receipt_games.filter((x) => ids.includes(x.receipt_id));
        }
        case "api_snapshots": {
          const k = eq("key");
          return r.snapshots[k] ? [{ key: k, computed_at: r.snapshots[k].at, body: r.snapshots[k].body }] : [];
        }
        default:
          throw new Error(`no table ${table}`);
      }
    },
  };
}

/** 2,000 made-up winners for the game of the night (H = the home side), 41 of them in overtime. */
export const fakeRuns = (game_id = G.nykPhi, computed_at = "2026-10-30T19:02:30Z") => {
  let winners = "";
  for (let i = 0; i < 2000; i++) winners += (i * 37) % 100 < 44 ? "H" : "A";
  return { game_id, runs: 2000, winners, ot_runs: 41, computed_at };
};
