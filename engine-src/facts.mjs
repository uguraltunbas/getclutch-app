// The facts a daily post is drawn from (t70): the rows any visitor of
// clutchledger.com reads with the anon key, read the way site-src/lib/data.mjs
// reads them — the games, the seals (receipts + receipt_games, 049), the
// Ledger's calls and the free slate — plus, for the game of the night, who
// won each of its 2,000 runs: the content-gotn Edge Function answers the
// winners only, so the simulation's inputs and its scores stay on the server.
//
// The two good-news series read the same public rows: the card hit from the
// free cards/<date> snapshot (clutch_cards itself is the server's: migration
// 065), the hot run from the Ledger's calls.
//
// Each series gives a plan: the post's key and link, when it stops being worth
// posting, the facts page.js draws, and the proof checks.mjs reads to say the
// post is fresh and sealed. A plan with `empty` says why there is nothing to
// post (no games, nothing graded yet, no game of the night, no card hit, no
// new mark). A plan without facts waits: the night isn't graded yet.

import { supabase } from "../site-src/lib/data.mjs";
import { normalizeStatus } from "../site-src/lib/copy.mjs";
import { seasonOf, shift } from "../site-src/lib/time.mjs";
import { RULES } from "./checks.mjs";

export const SUPABASE_URL = "https://rgksgqnajvcsoftqncqe.supabase.co";
export const SERIES = ["tonight", "gotn", "receipts", "moved", "week", "cardhit", "hotrun"];

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

/**
 * A team as a card prints it (the app's lib/api/cards teamName): its city
 * from the app's own list (lib/theme/colors), the two LA teams by name. The
 * teams table holds the real cities, so these differ from it.
 */
const CARD_NAME = { LAL: "LA Lakers", LAC: "LA Clippers", GSW: "Golden State", IND: "Indiana", MIN: "Minnesota", UTA: "Utah" };

const at = (date, h) => new Date(`${date}T${String(h).padStart(2, "0")}:00:00Z`).toISOString();
const chunks = (xs, n) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

// ── the cards (migration 065, rule v1; apps/ml-engine jobs/cards.py) ──

export const TIERS = ["solid", "balanced", "bold"];
const LEGS = { solid: 3, balanced: 5, bold: 3 };
const MIN_GAMES = { solid: 3, balanced: 5, bold: 6 };

/**
 * The night's cards by the fixed rule, from one seal's numbers: Solid the 3
 * surest favourites, Balanced the 5 surest, Bold the 3 likeliest underdogs
 * among the games not in Solid; ties to the earlier tip, then the game id.
 * `games`: [{ id, tipUtc, homeAbbr, awayAbbr, home }] (home = the seal's home
 * win probability). → { tier: [team, …] }
 */
export function rebuildCards(games) {
  const fav = (g) => Math.max(g.home, 1 - g.home);
  const side = (g, favourite) => ((g.home >= 0.5) === favourite ? g.homeAbbr : g.awayAbbr);
  const order = (a, b) => a.tipUtc.localeCompare(b.tipUtc) || a.id.localeCompare(b.id);
  const surest = [...games].sort((a, b) => fav(b) - fav(a) || order(a, b));
  const out = {};
  if (games.length >= MIN_GAMES.solid) out.solid = surest.slice(0, LEGS.solid).map((g) => side(g, true));
  if (games.length >= MIN_GAMES.balanced) out.balanced = surest.slice(0, LEGS.balanced).map((g) => side(g, true));
  if (games.length >= MIN_GAMES.bold) {
    const solid = new Set(surest.slice(0, LEGS.solid).map((g) => g.id));
    out.bold = games.filter((g) => !solid.has(g.id)).sort((a, b) => fav(a) - fav(b) || order(a, b)).slice(0, LEGS.bold).map((g) => side(g, false));
  }
  return out;
}

/**
 * Every card hitting, by Clutch's own numbers: the product of the distinct
 * legs (Solid's three are Balanced's first three; Bold shares no game with
 * Balanced), so on a three-card night it is Balanced × Bold. 0 when one game
 * carries both sides.
 */
export function jointChance(cards) {
  const legs = new Map();
  for (const l of cards.flatMap((c) => c.legs)) {
    const had = legs.get(l.game_id);
    if (had && had.team !== l.team) return 0;
    legs.set(l.game_id, l);
  }
  return [...legs.values()].reduce((p, l) => p * l.chance, 1);
}

// ── the hot run ──

/** "Shown at 75%": the Ledger prints Math.round(claimed_pct) (site-src/lib/pages). */
export const HOT = 75;
/**
 * A call drawn on a hot-run post is the seal's: the newest seal of its night
 * holding the game has the number the Ledger graded (to its one decimal:
 * an away side is 100 minus the home number, so 77.85 shows as 77.8) and was
 * committed before the tip.
 */
export const sealedCall = (x) => !!x.seal && Date.parse(x.seal.committed_at) < Date.parse(x.tip) && Math.abs(x.held - x.pct) < 0.06;

/** The run posts each time it passes a multiple of this. */
export const MARK = 10;
/** The most tiles a post carries (the drawing shows the newest that fit). */
export const SHOWN = 96;
const isHot = (c) => Math.round(c.claimed_pct) >= HOT;
const byTip = (a, b) => String(a.tip_utc ?? "").localeCompare(String(b.tip_utc ?? "")) || String(a.game_id).localeCompare(String(b.game_id));

/**
 * The right calls since the last miss, in tip order. A call that tipped with
 * the miss, or before it, isn't counted: the run never claims a game that
 * might have finished before the miss did.
 */
function runOf(calls) {
  const lastMiss = calls.filter((c) => !c.correct).map((c) => c.tip_utc).sort().pop();
  return calls.filter((c) => c.correct && (!lastMiss || c.tip_utc > lastMiss));
}

/**
 * The Ledger's calls shown at 75% or more, the season of `date` through
 * `date`, read from the ledger/calls snapshot (the newest calls, up to its
 * limit). When the list doesn't reach back to the season's first night
 * (`since`), every number is from its first whole night on and says so.
 *
 *   trigger  { kind: "mark", mark }   last night took the run past a multiple of MARK
 *            { kind: "break", ended } last night a 75% call missed (always a post)
 *            null                     nothing new: no post
 */
export function hotRun(body, date) {
  const all = Array.isArray(body?.calls) ? body.calls : [];
  const season = seasonOf(date);
  const seasonOfCall = (c) => c.season ?? seasonOf(c.game_date);
  const total = body?.total;
  const whole = !(typeof total === "number" && all.length < total) || all.some((c) => seasonOfCall(c) < season);
  const oldest = all.map((c) => c.game_date).filter(Boolean).sort()[0] ?? date;
  const since = whole ? null : shift(oldest, 1);
  const calls = all
    .filter((c) => seasonOfCall(c) === season && c.season_type !== "Preseason" && c.game_date <= date && (!since || c.game_date >= since))
    .filter((c) => typeof c.correct === "boolean" && typeof c.claimed_pct === "number" && isHot(c))
    .sort(byTip);
  const night = calls.filter((c) => c.game_date === date);
  const run = runOf(calls);
  const misses = night.filter((c) => !c.correct);
  let trigger = null;
  if (misses.length) {
    // the run that ended: the right calls before the night's first miss
    const firstMiss = misses[0].tip_utc;
    trigger = { kind: "break", ended: runOf(calls.filter((c) => c.game_date < date || c.tip_utc < firstMiss)).length };
  } else {
    const prior = runOf(calls.filter((c) => c.game_date < date)).length;
    if (run.length >= MARK && Math.floor(run.length / MARK) > Math.floor(prior / MARK)) trigger = { kind: "mark", mark: Math.floor(run.length / MARK) * MARK };
  }
  // what the tiles stand for: the run on a mark, every call of the record on a break (the newest SHOWN of them)
  const tiles = trigger?.kind === "break" ? calls : run;
  const lastMiss = calls.filter((c) => !c.correct).pop() ?? null;
  return {
    season, since, trigger,
    record: { right: calls.filter((c) => c.correct).length, wrong: calls.filter((c) => !c.correct).length, expected: calls.reduce((a, c) => a + c.claimed_pct / 100, 0) },
    run: run.length,
    runExpected: run.reduce((a, c) => a + c.claimed_pct / 100, 0),
    // the date of the miss the run counts from (null: no miss, the run is the whole record)
    runFrom: lastMiss ? lastMiss.game_date : null,
    night: night.length,
    misses,
    tiles: tiles.slice(-SHOWN),
    tilesFor: tiles.length,
  };
}

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
  const teams = () => (teamsP ??= db.get("teams?select=id,abbreviation,nickname,city").then((rows) => Object.fromEntries(rows.map((t) => [t.id, t]))));

  /** A date's games as the site names them: the page path is the site's own (site-src/lib/model.mjs). */
  async function games(date) {
    const [T, rows] = await Promise.all([teams(), db.get(`games?select=id,game_date,game_time_utc,status,season_type,home_team_id,away_team_id,home_score,away_score&game_date=eq.${date}&order=game_date,game_time_utc`)]);
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
        homeCity: home.city ?? home.nickname,
        awayCity: away.city ?? away.nickname,
        homeScore: g.home_score ?? null,
        awayScore: g.away_score ?? null,
        tipUtc: g.game_time_utc,
        status: normalizeStatus(g.status),
        preseason: g.season_type === "Preseason",
      });
    }
    return out;
  }

  /**
   * The seals of a span of dates, newest first; what each one holds (`held`:
   * receipt id → game id → home win probability); and for each game the
   * newest seal holding it: the number the Ledger grades. The files' rows are
   * read 40 seals at a time (the server answers at most 1,000 rows a read).
   */
  async function seals(from, to = from) {
    const list = await db.get(`receipts?select=id,kind,slate_date,sha256,prev_sha256,committed_at,n_games,commit_url,path&kind=eq.seal&slate_date=gte.${from}&slate_date=lte.${to}&order=committed_at.desc,id.desc`);
    const byGame = new Map();
    const held = new Map(list.map((r) => [r.id, new Map()]));
    if (list.length) {
      const rowsOf = await Promise.all(chunks(list.map((r) => r.id), 40).map((ids) => db.get(`receipt_games?select=receipt_id,game_id,home_win_prob&receipt_id=${encodeURIComponent(`in.(${ids.join(",")})`)}&limit=1000`)));
      const rank = new Map(list.map((r, i) => [r.id, i]));
      for (const h of rowsOf.flat().sort((a, b) => rank.get(a.receipt_id) - rank.get(b.receipt_id))) {
        if (h.home_win_prob == null) continue;
        held.get(h.receipt_id)?.set(h.game_id, +h.home_win_prob);
        if (!byGame.has(h.game_id)) byGame.set(h.game_id, { seal: list[rank.get(h.receipt_id)], home: +h.home_win_prob });
      }
    }
    return { list, byGame, held };
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
  /** "GITHUB.COM/UGURALTUNBAS/CLUTCH-RECEIPTS" from a commit link: where the files are. */
  const repoOf = (url) => {
    const m = /^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\//.exec(url ?? "");
    return m ? `github.com/${m[1]}` : null;
  };
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

    /**
     * The morning after a card hit: the won card(s), each leg with its final,
     * the chance Clutch gave it, and the seal the cards were built from.
     * Cards still being graded wait; a night with no card won has no post
     * (the receipts already show the misses).
     */
    async cardhit(date) {
      const snap = await snapshot(`cards/${date}`);
      const cards = (snap?.body?.cards ?? []).filter((c) => TIERS.includes(c.tier)).sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier));
      if (!cards.length) return { empty: `no cards on ${date}` };
      const [gs, S, T] = await Promise.all([games(date), seals(date), teams()]);
      const byId = new Map(gs.map((g) => [g.id, g]));
      const base = { key: `cardhit:${date}`, path: "/", expires: at(shift(date, 1), 20) };
      const legGames = [...new Set(cards.flatMap((c) => (c.legs ?? []).map((l) => l.game_id)))].map((id) => byId.get(id)).filter(Boolean);
      const gameProof = legGames.map((g) => ({ id: g.id, status: g.status, tipUtc: g.tipUtc }));
      const pending = cards.filter((c) => c.status === "pending").map((c) => c.tier);
      if (pending.length) return { ...base, facts: null, proof: { pending, games: gameProof, cardsAt: snap.at } };
      const won = cards.filter((c) => c.status === "won");
      if (!won.length) return { empty: `no card hit on ${date}` };
      const shut = won.filter((c) => c.locked || !Array.isArray(c.legs) || !c.legs.length || c.legs.length !== c.leg_count).map((c) => c.tier);
      if (shut.length) return { ...base, facts: null, proof: { pending: [], shut, games: gameProof, cardsAt: snap.at } };

      const legs = won.flatMap((c) => c.legs);
      const firstTip = legs.map((l) => l.tip).filter(Boolean).sort()[0] ?? null;
      // the seal the cards were built from: the newest one by the build that holds every leg at its number, else the first that does
      const holdsLegs = (s) => legs.every((l) => {
        const h = S.held.get(s.id)?.get(l.game_id);
        return typeof h === "number" && Math.abs((l.home ? h : 1 - h) - l.chance) < 5e-5;
      });
      const before = S.list.filter((s) => holdsLegs(s) && (!firstTip || Date.parse(s.committed_at) < Date.parse(firstTip)));
      const built = Date.parse(snap.body.built_at ?? "");
      const seal = before.find((s) => Date.parse(s.committed_at) <= built + 120e3) ?? before.at(-1) ?? null;
      // and the rule, run again on that seal's numbers: every card of the night comes out the same
      const sealGames = seal ? [...S.held.get(seal.id)].map(([id, home]) => ({ g: byId.get(id), home })).filter((x) => x.g && !x.g.preseason)
        .map(({ g, home }) => ({ id: g.id, tipUtc: g.tipUtc, homeAbbr: g.homeAbbr, awayAbbr: g.awayAbbr, home })) : [];
      const again = rebuildCards(sealGames);
      const differs = cards.filter((c) => c.legs?.length).filter((c) => (again[c.tier] ?? []).join() !== c.legs.map((l) => l.team).join()).map((c) => c.tier);

      const nameOf = (l) => CARD_NAME[l.team] ?? T[l.team_id]?.city ?? l.team;
      const lost = [];
      const leg = (l) => {
        const g = byId.get(l.game_id);
        const mine = l.home ? g?.homeScore : g?.awayScore, theirs = l.home ? g?.awayScore : g?.homeScore;
        if (!(g?.status === "final" && mine > theirs)) lost.push(l.team);
        return { team: l.team, name: nameOf(l), chance: l.chance, final: g && mine != null && theirs != null ? `${mine}–${theirs} ${l.opponent}` : null };
      };
      const drawn = won.map((c) => ({ tier: c.tier, chance: c.chance, legs: c.legs.map(leg) }));
      const all = won.length === cards.length;
      return {
        ...base,
        facts: {
          cards: drawn,
          night: cards.length,
          all,
          joint: all && cards.length > 1 ? jointChance(won) : null,
          games: new Set(legs.map((l) => l.game_id)).size,
          firstTip,
          seal: seal ? { committed_at: seal.committed_at, sha256: seal.sha256, file: String(seal.path ?? "").split("/").pop() || null, repo: repoOf(seal.commit_url) } : null,
        },
        proof: {
          pending: [], games: gameProof, cardsAt: snap.at, seal, firstTip,
          rule: differs.length ? `${differs.join(", ")} doesn't rebuild from the seal by the rule` : null,
          lost,
        },
      };
    },

    /**
     * The Ledger's record at 75% and up (hotRun): a post when last night took
     * the run past a round mark, and always the morning a 75% call missed.
     * Every call on the tiles is checked against the seal the Ledger graded.
     */
    async hotrun(date) {
      const [gs, ledger, T] = await Promise.all([games(date), snapshot("ledger/calls"), teams()]);
      const played = gs.filter((g) => g.status !== "postponed");
      if (!played.length) return { empty: `no games on ${date}` };
      const cityOf = Object.fromEntries(Object.values(T).map((t) => [t.abbreviation, CARD_NAME[t.abbreviation] ?? t.city ?? t.nickname]));
      const base = { key: `hotrun:${date}`, path: "/ledger/", expires: at(shift(date, 1), 20) };
      const gameProof = played.map((g) => ({ id: g.id, status: g.status, tipUtc: g.tipUtc }));
      const lastTip = played.map((g) => g.tipUtc).filter(Boolean).sort().pop();
      // nothing is said of a night the Ledger hasn't graded: a night without a mark would look like nothing new
      const graded = played.every((g) => g.status === "final") && Date.parse(ledger?.at ?? "") >= Date.parse(lastTip) + RULES.graded;
      if (!graded) return { ...base, facts: null, proof: { games: gameProof, ledgerAt: ledger?.at ?? null } };
      const h = hotRun(ledger?.body, date);
      if (!h.trigger) return { empty: h.night ? `the run is ${h.run}, past no new mark` : `no call at ${HOT}% or more on ${date}` };
      // each call drawn, against the seals of its night: the newest one holding it is the number graded
      const from = h.tiles.map((c) => c.game_date).sort()[0] ?? date;
      const S = await seals(from, date);
      const homeOf = (c) => String(c.matchup ?? "").split(" @ ")[1] ?? null;
      const check = h.tiles.map((c) => {
        const pickHome = c.pick === homeOf(c);
        const last = S.byGame.get(c.game_id);
        const all = S.list.filter((s) => S.held.get(s.id)?.has(c.game_id)).map((s) => ({ s, p: pickHome ? S.held.get(s.id).get(c.game_id) : 1 - S.held.get(s.id).get(c.game_id) }));
        const first = all.at(-1) ?? null;
        return {
          game_id: c.game_id, pick: c.pick, pct: c.claimed_pct, tip: c.tip_utc,
          seal: last?.seal ?? null,
          // the pick's side of the seal's number, in points (the Ledger prints it to one decimal)
          held: last ? Math.round((pickHome ? last.home : 1 - last.home) * 1e4) / 100 : null,
          firstLeadH: first ? (Date.parse(c.tip_utc) - Date.parse(first.s.committed_at)) / 3600e3 : null,
          sameSide: all.length > 0 && all.every((x) => x.p > 0.5),
        };
      });
      const sealedBefore = check.filter(sealedCall).length;
      const steady = check.every((x) => x.sameSide && x.firstLeadH > 0);
      const leads = check.map((x) => x.firstLeadH).filter((x) => x > 0);
      return {
        ...base,
        facts: {
          kind: h.trigger.kind, ended: h.trigger.ended ?? null, mark: h.trigger.mark ?? null,
          season: h.season, since: h.since, through: date,
          record: { ...h.record, expected: Math.round(h.record.expected * 10) / 10 },
          run: h.run, runExpected: Math.round(h.runExpected * 10) / 10, runFrom: h.runFrom,
          misses: h.misses.map((c) => ({ ...trimCall(c), name: cityOf[c.pick] ?? c.pick })),
          tiles: h.tiles.map((c) => ({ pick: c.pick, pct: Math.round(c.claimed_pct), correct: c.correct, game_date: c.game_date })),
          tilesFor: h.tilesFor,
          sealed: { count: sealedBefore, of: check.length },
          lead: steady && leads.length ? [Math.floor(Math.min(...leads)), Math.floor(Math.max(...leads))] : null,
          repo: repoOf(S.list[0]?.commit_url),
        },
        proof: { games: gameProof, ledgerAt: ledger?.at ?? null, calls: check, trigger: h.trigger },
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
