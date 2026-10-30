// The facts a daily post is drawn from (t70): the rows any visitor of
// clutchledger.com reads with the anon key, read the way site-src/lib/data.mjs
// reads them — the games, the seals (receipts + receipt_games, 049), the
// Ledger's calls and the free slate — plus, for the game of the night, who
// won each of its 2,000 runs: the content-gotn Edge Function answers the
// winners only, so the simulation's inputs and its scores stay on the server.
//
// Each series gives a plan: the post's key and link, when it stops being worth
// posting, the facts page.js draws, and the proof checks.mjs reads to say the
// post is fresh and sealed. A plan with `empty` says why there is nothing to
// post (no games, nothing graded yet, no game of the night).

import { supabase } from "../site-src/lib/data.mjs";
import { normalizeStatus } from "../site-src/lib/copy.mjs";
import { shift } from "../site-src/lib/time.mjs";

export const SUPABASE_URL = "https://rgksgqnajvcsoftqncqe.supabase.co";
export const SERIES = ["tonight", "gotn", "receipts", "moved", "week"];

/** Only what the Ledger's drawing reads: the snapshot's other fields stay out of the page. */
const CALL_FIELDS = ["game_id", "game_date", "matchup", "pick", "claimed_pct", "correct", "final", "tip_utc", "season_type"];
const trimCall = (c) => Object.fromEntries(CALL_FIELDS.map((k) => [k, c[k] ?? null]));

/** The Monday of an ET date's week (Monday to Sunday). */
export function mondayOf(iso) {
  const dow = new Date(iso + "T12:00:00Z").getUTCDay(); // 0 = Sunday
  return shift(iso, dow === 0 ? -6 : 1 - dow);
}

/** "jaylen-brown": a player's name as a key part. */
export const slugOf = (s) => String(s).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

const at = (date, h) => new Date(`${date}T${String(h).padStart(2, "0")}:00:00Z`).toISOString();

/**
 * The radar's "number moved" facts (clock.mjs movedExtra), checked before a
 * word of them is drawn: they come through a workflow input.
 */
export function movedInput(e) {
  if (!e || typeof e !== "object") return { error: "no moved facts" };
  if (typeof e.game !== "string" || !/^[0-9a-f-]{36}$/i.test(e.game)) return { error: "moved: bad game id" };
  if (typeof e.player !== "string" || !/^[\p{L}\p{M}][\p{L}\p{M}'’. -]{1,58}[\p{L}\p{M}.]$/u.test(e.player)) return { error: "moved: bad player name" };
  if (!["out", "doubtful", "questionable"].includes(e.status)) return { error: "moved: bad status" };
  if (typeof e.team !== "string" || !/^[A-Z]{2,4}$/.test(e.team)) return { error: "moved: bad team" };
  for (const k of ["sealedHome", "whatIfHome"]) if (!(typeof e[k] === "number" && e[k] > 0 && e[k] < 1)) return { error: `moved: bad ${k}` };
  return {
    game: e.game,
    player: e.player,
    status: e.status,
    teamAbbr: e.team,
    sealedHome: e.sealedHome,
    whatIfHome: e.whatIfHome,
    newsAt: typeof e.newsAt === "string" && /^\d{1,2}:\d{2} [AP]M ET$/.test(e.newsAt) ? e.newsAt : null,
    source: typeof e.source === "string" ? e.source.replace(/[^\p{L}\p{N} ._@-]/gu, "").slice(0, 40) || null : null,
  };
}

/** The content-gotn function: who won each run of the date's game of the night. */
export async function gotnRuns({ url, anon, key, date, fetchImpl = fetch }) {
  if (!key) throw new Error("CONTENT_GOTN_KEY is not set");
  const r = await fetchImpl(`${url.replace(/\/$/, "")}/functions/v1/content-gotn`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: anon, authorization: `Bearer ${anon}`, "x-content-key": key },
    body: JSON.stringify({ date }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`content-gotn: HTTP ${r.status}${j.error ? ` (${String(j.error).slice(0, 120)})` : ""}`);
  if (typeof j.winners !== "string" || !/^[HA]+$/.test(j.winners) || typeof j.game_id !== "string") throw new Error("content-gotn: an answer without the runs");
  return { game_id: j.game_id, runs: j.winners.length, winners: j.winners, ot_runs: Math.max(0, Math.round(+j.ot_runs || 0)), computed_at: j.computed_at ?? null };
}

/**
 * The reader. `db` is site-src's supabase(url, anon key); `runs(date)` the
 * content-gotn call (a stand-in in the tests).
 */
export function facts(db, { runs } = {}) {
  let teamsP = null;
  const teams = () => (teamsP ??= db.get("teams?select=id,abbreviation,nickname").then((rows) => Object.fromEntries(rows.map((t) => [t.id, t]))));

  /** A date's games as the site names them: the page path is the site's own (site-src/lib/model.mjs). */
  async function games(date) {
    const [T, rows] = await Promise.all([teams(), db.get(`games?select=id,game_date,game_time_utc,status,season_type,home_team_id,away_team_id&game_date=eq.${date}&order=game_date,game_time_utc`)]);
    const slugs = new Set();
    const out = [];
    for (const g of rows) {
      const home = T[g.home_team_id], away = T[g.away_team_id];
      if (!home || !away) continue;
      let slug = `${away.abbreviation.toLowerCase()}-at-${home.abbreviation.toLowerCase()}`;
      if (slugs.has(slug)) slug += "-2";
      slugs.add(slug);
      out.push({
        id: g.id,
        date: g.game_date,
        path: `/games/${g.game_date}/${slug}/`,
        homeAbbr: home.abbreviation,
        awayAbbr: away.abbreviation,
        homeName: home.nickname,
        awayName: away.nickname,
        tipUtc: g.game_time_utc,
        status: normalizeStatus(g.status),
        preseason: g.season_type === "Preseason",
      });
    }
    return out;
  }

  /** The seals of a span of dates, newest first, and for each game the newest seal holding it: the number the Ledger grades. */
  async function seals(from, to = from) {
    const list = await db.get(`receipts?select=id,kind,slate_date,sha256,prev_sha256,committed_at,n_games,commit_url&kind=eq.seal&slate_date=gte.${from}&slate_date=lte.${to}&order=committed_at.desc,id.desc`);
    const byGame = new Map();
    if (list.length) {
      const held = await db.get(`receipt_games?select=receipt_id,game_id,home_win_prob&receipt_id=${encodeURIComponent(`in.(${list.map((r) => r.id).join(",")})`)}&limit=5000`);
      const rank = new Map(list.map((r, i) => [r.id, i]));
      for (const h of held.slice().sort((a, b) => rank.get(a.receipt_id) - rank.get(b.receipt_id))) {
        if (!byGame.has(h.game_id) && h.home_win_prob != null) byGame.set(h.game_id, { seal: list[rank.get(h.receipt_id)], home: +h.home_win_prob });
      }
    }
    return { list, byGame };
  }

  async function snapshot(key) {
    const rows = await db.get(`api_snapshots?select=key,computed_at,body&tier=eq.free&key=eq.${encodeURIComponent(key)}`);
    return rows[0] ? { at: rows[0].computed_at, body: rows[0].body } : null;
  }

  /** What the studio's SlateGame needs; a game without a seal has no number to show. */
  const slateGame = (g, held) => ({
    id: g.id, homeAbbr: g.homeAbbr, awayAbbr: g.awayAbbr, homeName: g.homeName, awayName: g.awayName,
    homeWinProb: held ? held.home : 0.5, ...(held ? {} : { noCall: true }),
    tipUtc: g.tipUtc, status: g.status, preseason: g.preseason,
  });
  const sealRow = (s) => (s ? { sha256: s.sha256, prev_sha256: s.prev_sha256 ?? null, committed_at: s.committed_at, commit_url: s.commit_url ?? null, n_games: s.n_games ?? 0, slate_date: s.slate_date } : null);

  const plans = {
    /** Tonight: every game still ahead with its sealed number. */
    async tonight(date) {
      const [gs, S, today] = await Promise.all([games(date), seals(date), snapshot(`predictions/today/${date}`)]);
      const ahead = gs.filter((g) => g.status === "scheduled");
      const called = ahead.filter((g) => S.byGame.has(g.id));
      if (!gs.length) return { empty: `no games on ${date}` };
      if (!called.length) return { empty: ahead.length ? `no sealed numbers for ${date} yet` : `every game of ${date} has tipped` };
      const firstTip = called.map((g) => g.tipUtc).sort()[0];
      return {
        key: `tonight:${date}`, path: "/tonight/", expires: firstTip,
        facts: { slate: ahead.map((g) => slateGame(g, S.byGame.get(g.id))), gotnId: today?.body?.clutch_pick_of_day?.game_id ?? null, seal: sealRow(S.list[0]) },
        proof: { games: called.map((g) => ({ id: g.id, status: g.status, tipUtc: g.tipUtc })), seal: S.list[0] ?? null, firstTip },
      };
    },

    /** The game of the night, played 2,000 times by the app's simulation. */
    async gotn(date) {
      const today = await snapshot(`predictions/today/${date}`);
      const gotnId = today?.body?.clutch_pick_of_day?.game_id ?? null;
      if (!gotnId) return { empty: `no game of the night for ${date}` };
      const [gs, S] = await Promise.all([games(date), seals(date)]);
      const g = gs.find((x) => x.id === gotnId);
      if (!g) return { empty: `the game of the night isn't on ${date}'s slate` };
      if (g.status !== "scheduled") return { empty: "the game of the night has tipped" };
      const held = S.byGame.get(g.id);
      const r = await runs(date);
      return {
        key: `gotn:${date}`, path: g.path, expires: g.tipUtc,
        facts: { game: slateGame(g, held), runs: { winners: r.winners, ot_runs: r.ot_runs }, seal: sealRow(held?.seal) },
        proof: { game: { id: g.id, status: g.status, tipUtc: g.tipUtc }, gotnId, runs: { game_id: r.game_id, runs: r.runs, computed_at: r.computed_at }, seal: held?.seal ?? null },
      };
    },

    /** Last night's receipts: the record, the misses first, the night's last seal. */
    async receipts(date) {
      const [gs, S, ledger] = await Promise.all([games(date), seals(date), snapshot("ledger/calls")]);
      const calls = (ledger?.body?.calls ?? []).filter((c) => c.game_date === date && c.season_type !== "Preseason").map(trimCall);
      if (!calls.length) return { empty: `nothing graded for ${date}` };
      const played = gs.filter((g) => g.status !== "postponed");
      return {
        key: `receipts:${date}`, path: "/ledger/", expires: at(shift(date, 1), 20),
        facts: { calls, seal: sealRow(S.list[0]) },
        proof: { games: played.map((g) => ({ id: g.id, status: g.status, tipUtc: g.tipUtc })), calls: calls.map((c) => c.game_id), ledgerAt: ledger?.at ?? null, seal: S.list[0] ?? null },
      };
    },

    /** The week, Monday to Sunday (Monday's recap sends Sunday's date). */
    async week(date) {
      const monday = mondayOf(date), sunday = shift(monday, 6);
      if (date < sunday) return { date: monday, empty: `the week of ${monday} isn't over until ${sunday}` };
      const [S, ledger] = await Promise.all([seals(monday, sunday), snapshot("ledger/calls")]);
      const all = ledger?.body?.calls ?? [];
      const calls = all.filter((c) => c.game_date >= monday && c.game_date <= sunday && c.season_type !== "Preseason").map(trimCall);
      if (!calls.length) return { date: monday, empty: `nothing graded the week of ${monday}` };
      const total = ledger?.body?.total;
      // the snapshot holds the newest calls: the week is all there when nothing was cut, or the list reaches past Monday
      const complete = !(typeof total === "number" && all.length < total) || all.some((c) => c.game_date < monday);
      return {
        date: monday,
        key: `week:${monday}`, path: "/ledger/", expires: at(shift(monday, 8), 20),
        facts: { calls },
        proof: {
          monday, sunday, complete, ledgerAt: ledger?.at ?? null,
          lastTip: calls.map((c) => c.tip_utc).filter(Boolean).sort().pop() ?? null,
          dates: [...new Set(calls.map((c) => c.game_date))].sort(),
          sealDates: [...new Set(S.list.map((s) => s.slate_date))].sort(),
          seals: S.list.filter((s, i, xs) => xs.findIndex((y) => y.slate_date === s.slate_date) === i),
        },
      };
    },

    /** A player ruled out before tip: the What-If without him (the radar's numbers) beside the sealed one. */
    async moved(date, extra) {
      const m = movedInput(extra);
      if (m.error) throw new Error(m.error);
      const [gs, S, whatif] = await Promise.all([games(date), seals(date), snapshot(`whatif/${m.game}`)]);
      const g = gs.find((x) => x.id === m.game);
      if (!g) throw new Error(`moved: game ${m.game} isn't on ${date}'s slate`);
      if (m.teamAbbr !== g.homeAbbr && m.teamAbbr !== g.awayAbbr) throw new Error(`moved: ${m.teamAbbr} doesn't play in ${g.awayAbbr} @ ${g.homeAbbr}`);
      const held = S.byGame.get(g.id);
      return {
        key: `moved:${date}:${g.id}:${slugOf(m.player)}`, path: g.path, expires: g.tipUtc,
        facts: {
          game: slateGame(g, held),
          seal: sealRow(held?.seal),
          // the sealed side is the public seal's, never the radar's copy of it
          moved: { player: m.player, teamAbbr: m.teamAbbr, status: m.status, sealedHome: held ? held.home : m.sealedHome, whatIfHome: m.whatIfHome, newsAt: m.newsAt, source: m.source },
        },
        proof: { game: { id: g.id, status: g.status, tipUtc: g.tipUtc }, seal: held?.seal ?? null, publicHome: held ? held.home : null, radarHome: m.sealedHome, whatIfHome: m.whatIfHome, whatifAt: whatif?.at ?? null },
      };
    },
  };

  /** One series' plan for a date; `extra` = the radar's input (moved). */
  async function plan(series, date, extra = {}) {
    if (!plans[series]) throw new Error(`unknown series ${series}`);
    const p = await plans[series](date, extra);
    return { series, date: p.date ?? date, ...p };
  }

  return { plan, games, seals, snapshot };
}

/** The reader on the anon key, the way the site's build reads (no other key leaves the runner). */
export function publicFacts({ url = process.env.SUPABASE_URL || SUPABASE_URL, anon = process.env.SUPABASE_ANON_KEY, gotnKey = process.env.CONTENT_GOTN_KEY } = {}) {
  if (!anon) throw new Error("SUPABASE_ANON_KEY is not set");
  return facts(supabase(url, anon), { runs: (date) => gotnRuns({ url, anon, key: gotnKey, date }) });
}
