// Raw rows → what the pages print. One view of each game, built once, so the
// front page, the game page, "also tonight" and the team pages never disagree.

import { normalizeStatus, pickSide, topReasons, mapReceipt, isRetiredModel, headlineRecord, lastSeasonOf, ledgerStage, sealedGames, PRESEASON_START } from "./copy.mjs";
import { teamSlug } from "./html.mjs";

export function buildModel(raw) {
  const T = Object.fromEntries(raw.teams.map((t) => [t.id, t]));
  const byAbbr = Object.fromEntries(raw.teams.map((t) => [t.abbreviation, t]));
  const snap = (k) => raw.snaps[k] ?? null;
  const ledger = snap("ledger")?.body ?? null;
  const ledgerAt = snap("ledger")?.computedAt ?? null;
  const calls = snap("ledger/calls")?.body?.calls ?? [];
  const callBy = Object.fromEntries(calls.map((c) => [c.game_id, c]));
  const lines = Object.fromEntries((raw.lines ?? []).map((l) => [l.team_id, l]));
  const now = Date.parse(raw.builtAt);

  // The slate rows (free) by game id, for the market's number and has_prediction.
  const slateRow = {};
  for (const d of raw.pageDates) for (const g of snap(`predictions/today/${d}`)?.body?.games ?? []) slateRow[g.game_id] = g;
  const receiptRow = {};
  for (const d of raw.pageDates) for (const g of raw.receiptsByDate[d]?.games ?? []) receiptRow[g.game_id] = g;

  const slugs = new Set();
  function view(g) {
    const home = T[g.home_team_id], away = T[g.away_team_id];
    if (!home || !away) return null;
    const status = normalizeStatus(g.status);
    const preseason = g.season_type === "Preseason";
    const pred = raw.preds[g.id] ?? null;
    const row = slateRow[g.id] ?? null;
    const call = callBy[g.id] ?? null;
    const rr = receiptRow[g.id] ?? null;
    const explain = snap(`explain/${g.id}`)?.body ?? null;

    // Clutch's published number, home side: the graded one when the Ledger has it.
    let homeProb = null;
    if (call) homeProb = call.pick === home.abbreviation ? call.claimed_pct / 100 : 1 - call.claimed_pct / 100;
    else if (rr?.graded?.home_win_prob != null) homeProb = +rr.graded.home_win_prob;
    else if (pred) homeProb = +pred.home_win_prob;
    else if (row && row.has_prediction !== false && row.winner) homeProb = row.winner.pick === home.abbreviation ? row.winner.prob : 1 - row.winner.prob;
    const hasCall = homeProb != null && Number.isFinite(homeProb);

    // The market's number, home side, cut taken out — the free slate row, else the line the graded call saw.
    let market = null, marketState = "unknown";
    if (row?.market && typeof row.market.home_prob === "number") { market = row.market.home_prob; marketState = "line"; }
    else if (call && typeof call.market_pct === "number") { market = call.market_pct / 100; marketState = "line"; }
    else if (row?.market?.available === false) marketState = "none";

    const side = hasCall ? pickSide(homeProb, home, away) : null;
    const marketSide = market == null || !side ? null : side.isHome ? market : 1 - market;
    const differs = market != null && side ? (market >= 0.5) !== side.isHome : false;

    const hs = g.home_score, as = g.away_score;
    const scored = (status === "final" || status === "live" || status === "halftime") && hs != null && as != null;
    let grade = "upcoming";
    if (status === "postponed") grade = "postponed";
    else if (status === "live" || status === "halftime") grade = "live";
    else if (status === "final") {
      if (preseason) grade = "preseason";
      else if (call) grade = call.correct ? "right" : "missed";
      else if (!hasCall) grade = "nocall";
      else if (ledgerAt && g.game_time_utc && Date.parse(ledgerAt) < Date.parse(g.game_time_utc) + 4 * 3600e3) grade = "pending";
      else grade = "ungraded";
    }

    let absences = [];
    if (explain?.absences) {
      absences = [
        ...(explain.absences.away ?? []).map((a) => ({ team: away.abbreviation, name: a.name, status: a.status, note: Number.isFinite(+a.mpg) ? `${Math.round(a.mpg)} MPG` : "", weight: (a.p_out ?? 1) * (a.value ?? 0) })),
        ...(explain.absences.home ?? []).map((a) => ({ team: home.abbreviation, name: a.name, status: a.status, note: Number.isFinite(+a.mpg) ? `${Math.round(a.mpg)} MPG` : "", weight: (a.p_out ?? 1) * (a.value ?? 0) })),
      ].sort((x, y) => y.weight - x.weight);
    } else if (status === "scheduled") {
      absences = (raw.players ?? []).filter((p) => p.rostered !== false && (p.team_id === home.id || p.team_id === away.id))
        .map((p) => ({ team: p.team_id === home.id ? home.abbreviation : away.abbreviation, name: p.full_name, status: p.status, note: p.injury_description || "", weight: 0 }));
    }

    let slug = `${away.abbreviation.toLowerCase()}-at-${home.abbreviation.toLowerCase()}`;
    if (slugs.has(`${g.game_date}/${slug}`)) slug += "-2";
    slugs.add(`${g.game_date}/${slug}`);

    return {
      id: g.id, date: g.game_date, path: `/games/${g.game_date}/${slug}/`, home, away, tipUtc: g.game_time_utc, status, period: g.period, clock: g.clock,
      homeScore: scored ? hs : null, awayScore: scored ? as : null, preseason, seasonType: g.season_type,
      hasCall, homeProb, side, market, marketSide, marketState, differs,
      reasons: hasCall ? topReasons(pred?.key_factors, explain) : [],
      explain, absences, receipt: mapReceipt(rr, now), call, grade,
      modelVersion: pred?.model_version ?? call?.model_version ?? explain?.model_version ?? null,
      generatedAt: pred?.generated_at ?? null,
      interest: (+(lines[home.id]?.line ?? 40)) + (+(lines[away.id]?.line ?? 40)),
    };
  }

  const games = raw.games.map(view).filter(Boolean);
  const pageGames = games.filter((g) => raw.pageDates.includes(g.date));
  const nights = {};
  for (const g of pageGames) (nights[g.date] ??= []).push(g);

  const current = raw.season;
  const record = ledger && ledgerStage(ledger, current) === "season" ? headlineRecord(ledger) : null;
  const last = lastSeasonOf(ledger, current);
  const sealed = sealedGames(raw.receipts, PRESEASON_START);

  return {
    raw, T, byAbbr, today: raw.today, tonight: raw.tonight, nights, games, pageGames,
    ledger, ledgerAt, calls, callBy, record, last, sealed, lines,
    corrections: snap("corrections/latest")?.body ?? null,
    seasonBoard: snap(`season/${current}`)?.body ?? null,
    accuracy: snap("model/accuracy")?.body ?? null,
    receipts: raw.receipts ?? [], current, now,
    teamPath: (t) => `/teams/${teamSlug(t)}/`,
    retired: (g) => isRetiredModel(g.modelVersion),
  };
}

/** A night's worst miss from the graded calls: the highest number that lost. */
export function worstMiss(m, date) {
  const misses = m.calls.filter((c) => c.game_date === date && c.correct === false && c.season_type !== "Preseason").sort((a, b) => b.claimed_pct - a.claimed_pct);
  if (!misses.length) return null;
  const night = m.calls.filter((c) => c.game_date === date);
  return { call: misses[0], held: night.filter((c) => c.correct).length, of: night.length };
}

/** The last graded night on or before `date` (ET), from the calls. */
export function lastGradedNight(m, before) {
  const dates = [...new Set(m.calls.map((c) => c.game_date))].filter((d) => d < before).sort();
  return dates.length ? dates[dates.length - 1] : null;
}
