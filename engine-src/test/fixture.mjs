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
    ["ATL", "Hawks"], ["CLE", "Cavaliers"], ["MEM", "Grizzlies"], ["POR", "Trail Blazers"],
    ["NYK", "Knicks"], ["PHI", "76ers"], ["CHA", "Hornets"], ["WAS", "Wizards"],
  ].map(([abbreviation, nickname]) => ({ id: `t-${abbreviation}`, abbreviation, nickname })),
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
