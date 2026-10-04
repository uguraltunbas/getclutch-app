// The app's sentences, built from the numbers — ported from the mobile repo
// so the site says what the free app says:
//   lib/home/copy.ts       headlineFor (the free path: no projected margin)
//   lib/play/points.ts     callPoints (5 ÷ p, 5 to 25)
//   lib/api/corrections.ts plainDriverLabel
//   lib/ledger/view.ts     the Ledger's stages, bar and verdict
//   lib/api/receipts.ts    a game's seal state and its line
//   lib/play/slateWeek.ts  liveLabel
// Every sentence is made from a field that exists; nothing is implied.

import { timeET, shortDate } from "./time.mjs";

export const PRESEASON_START = "2026-10-03";
export const REGULAR_SEASON_START = "2026-10-20";
export const RATE_FLOOR = 20;
export const CALL_PAY = { numerator: 5, min: 5, max: 25, coinFlip: 10 };
export const PRESEASON_DECK = "Starters rest and rotations are experiments. Your call still counts for points.";

export const pct = (p) => Math.round(p * 100);

/** The side Clutch's call favours (a 50/50 goes to the home team, as in the app). */
export function pickSide(homeProb, home, away) {
  const isHome = homeProb >= 0.5;
  return { isHome, team: isHome ? home : away, other: isHome ? away : home, prob: isHome ? homeProb : 1 - homeProb };
}

/** "Lakers, by a possession." — lib/home/copy.ts headlineFor, free path. */
export function headlineFor(homeProb, home, away, preseason) {
  const s = pickSide(homeProb, home, away);
  if (preseason) return `${s.team.nickname}, by a coin's width — it's preseason.`;
  if (s.prob < 0.55) return `${s.team.nickname}, narrowly.`;
  if (s.prob < 0.62) return `${s.team.nickname}, by a possession.`;
  if (s.prob < 0.72) return `${s.team.nickname}, clearly.`;
  return `${s.team.nickname}, comfortably.`;
}

/** Points a right call scores (lib/play/points callPoints). */
export function callPoints(p) {
  if (typeof p !== "number" || !Number.isFinite(p) || p < 0 || p > 1) return null;
  const bp = Math.round(p * 10000);
  if (bp <= 0) return CALL_PAY.max;
  const n = CALL_PAY.numerator * 10000;
  const raw = Math.floor((2 * n + bp) / (2 * bp));
  return Math.min(CALL_PAY.max, Math.max(CALL_PAY.min, raw));
}

export const CALL_RULE = `Right calls score more the less likely they were: ${CALL_PAY.coinFlip} for a coin flip, up to ${CALL_PAY.max} for an upset.`;

/** A reason's label in plain words (Elo ratings read as "rated above"); the retired model's "(favors home)" tail dropped. */
export function plainDriverLabel(key, label) {
  const clean = String(label || "").replace(/\s*\((favors|favours) (home|away)\)\s*$/i, "").replace(/[.\s]+$/, "");
  if (key !== "elo" && !/\(elo\)/i.test(clean)) return clean;
  const pair = /([A-Z]{2,4})\s+(\d{3,4})\s*,\s*([A-Z]{2,4})\s+(\d{3,4})/.exec(clean);
  if (!pair) return "Season-long strength";
  const [, a, ra, b, rb] = pair;
  const gap = Number(ra) - Number(rb);
  if (gap === 0) return `Season-long strength: ${a} and ${b} rated level`;
  const [hi, lo] = gap > 0 ? [a, b] : [b, a];
  return `Season-long strength: ${hi} rated ${Math.abs(gap) >= 100 ? "well " : ""}above ${lo}`;
}

/**
 * The top three reasons, by the size of their pull (|impact|), each with the
 * side it pulls toward and — when the free explain row has it — its share
 * of the call. Free shows three; every factor past the third is Pro.
 */
export function topReasons(keyFactors, explain) {
  if (explain?.drivers?.length) {
    return explain.drivers.slice(0, 3).map((d) => ({ label: plainDriverLabel(d.key, d.label), toward: d.direction, share: typeof d.share === "number" ? Math.round(d.share * 100) : null }));
  }
  return (Array.isArray(keyFactors) ? keyFactors : [])
    .filter((f) => f && f.label && Number.isFinite(+f.impact))
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 3)
    .map((f) => ({ label: plainDriverLabel(f.factor === "elo" ? "elo" : f.factor, f.label), toward: f.direction === "away" ? "away" : "home", share: null }));
}

/** A clock that reads zero between periods ("0.0", "0:00"). */
function clockIsZero(c) {
  const s = String(c).trim();
  const secs = s.includes(":") ? s.split(":").reduce((a, x) => a * 60 + Number(x), 0) : Number(s);
  return Number.isFinite(secs) && secs === 0;
}

/** "Q3 4:22", "HALF", "OT 1:10", "2OT" — lib/play/slateWeek liveLabel, without the dot. */
export function liveLabel(status, period, clock) {
  if (status === "halftime") return "HALF";
  if (!period) return "LIVE";
  const p = period <= 4 ? `Q${period}` : period === 5 ? "OT" : `${period - 4}OT`;
  const c = clock && !clockIsZero(clock) ? ` ${String(clock).replace(/^0(?=\d:)/, "")}` : "";
  return `${p}${c}`;
}

export const finalLabel = (period) => (period && period > 4 ? (period === 5 ? "FINAL/OT" : `FINAL/${period - 4}OT`) : "FINAL");

export function normalizeStatus(s) {
  if (s === "in_progress") return "live";
  if (s === "cancelled" || s === "canceled") return "postponed";
  return ["scheduled", "live", "halftime", "final", "postponed"].includes(s) ? s : "scheduled";
}

// ── Receipts (lib/api/receipts.ts) ─────────────────────────────────────

export const RECEIPTS_REPO = "https://github.com/uguraltunbas/clutch-receipts";
export const RECEIPTS_VERIFY_URL = `${RECEIPTS_REPO}/blob/main/VERIFY.md`;
export const RECEIPTS_ACTIVITY_URL = `${RECEIPTS_REPO}/activity`;

const toProb = (v) => { const n = typeof v === "string" ? Number(v) : v; return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1 ? n : null; };

/** One game's receipt state: sealed · late · not_yet · none · postponed (mapReceipt). */
export function mapReceipt(b, now) {
  if (!b || !b.game_id) return null;
  const status = b.status ?? "scheduled";
  const tip = b.tip_utc ? Date.parse(b.tip_utc) : NaN;
  const tipped = ["live", "halftime", "final"].includes(status) || (status !== "postponed" && Number.isFinite(tip) && now >= tip);
  const sp = b.seal ? toProb(b.seal.home_win_prob) : null;
  const seal = b.seal && sp !== null && b.seal.sha256 && b.seal.committed_at
    ? { committedAt: b.seal.committed_at, commitUrl: b.seal.commit_url ?? null, commitSha: b.seal.commit_sha, sha256: b.seal.sha256, path: b.seal.path, homeWinProb: sp }
    : null;
  const gp = b.graded ? toProb(b.graded.home_win_prob) : null;
  const state = status === "postponed" ? "postponed" : b.sealed === true && seal ? "sealed" : seal ? "late" : tipped || !b.tip_utc ? "none" : "not_yet";
  return { gameId: b.game_id, tipUtc: b.tip_utc ?? null, status, state, tipped, seal, gradedHomeProb: gp, reveal: b.reveal && b.reveal.sha256 ? b.reveal : null };
}

export const shortHash = (h) => (h && h.length > 16 ? `${h.slice(0, 8)}…${h.slice(-6)}` : h || "");

function repoOf(commitUrl) {
  const m = String(commitUrl ?? "").match(/^(https:\/\/github\.com\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+)\/commit\//);
  return m ? m[1] : RECEIPTS_REPO;
}
/** The seal file at the commit that added it. */
export const sealFileUrl = (s) => (s.commitSha && s.path ? `${repoOf(s.commitUrl)}/blob/${s.commitSha}/${s.path}` : s.commitUrl || RECEIPTS_REPO);

function leadText(fromIso, toIso) {
  if (!toIso) return null;
  const mins = Math.floor((Date.parse(toIso) - Date.parse(fromIso)) / 60000);
  if (!Number.isFinite(mins) || mins < 0) return null;
  if (mins < 60) return `${Math.max(1, mins)} min`;
  if (mins >= 48 * 60) return `${Math.floor(mins / 1440)} days`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** The one line under the headline (receiptLine, on the ET clock). */
export function receiptLine(r, gameDate) {
  if (!r) return gameDate < PRESEASON_START ? "No seal: seals began with the 2026-27 preseason." : "No seal for this game.";
  const at = r.seal ? timeET(r.seal.committedAt) : null;
  switch (r.state) {
    case "sealed": { const lead = leadText(r.seal.committedAt, r.tipUtc); return `Sealed ${at}${lead ? `, ${lead} before tip` : ", before tip"}`; }
    case "late": return r.tipped ? `Sealed ${at}, but Clutch's call changed after that seal` : `Clutch's call moved after the ${at} seal. The next seal carries it.`;
    case "not_yet": return "Not sealed yet. Every number is sealed before tip.";
    case "postponed": return "Postponed. Nothing to seal.";
    default: return gameDate < PRESEASON_START ? "No seal: seals began with the 2026-27 preseason." : "No seal for this game.";
  }
}

// ── The Ledger (lib/ledger/view.ts) ────────────────────────────────────

const isRetired = (v) => (v ?? []).length > 0 && !(v ?? []).some((m) => m.startsWith("clutch-"));
export const isRetiredModel = (version) => !!version && !String(version).startsWith("clutch-");

export function wilson(hits, n, z = 1.96) {
  if (n <= 0) return null;
  const p = hits / n, denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  const r1 = (x) => Math.round(x * 1000) / 10;
  return [r1(Math.max(0, centre - margin)), r1(Math.min(1, centre + margin))];
}

export function headlineRecord(l) {
  if (!l?.available || !l.total_calls) return null;
  const home = l.baselines?.always_home?.hit_rate ?? null;
  return {
    season: l.season ?? "", n: l.total_calls,
    hits: l.correct ?? Math.round(((l.hit_rate ?? 0) * l.total_calls) / 100),
    hitRate: l.hit_rate ?? null, homeRate: home,
    lift: l.lift_over_home ?? (l.hit_rate != null && home != null ? Math.round((l.hit_rate - home) * 10) / 10 : null),
    liftReadable: l.lift_is_readable === true, ci: l.hit_rate_ci ?? null, tracks: l.tracks ?? null,
    retired: isRetired(l.model_versions), excluded: l.excluded_unprovable ?? 0, dateRange: l.date_range ?? null,
    vsMarket: l.vs_market ?? null, playoffs: l.playoffs ?? null,
  };
}

function summaryRecord(s) {
  const ci = wilson(s.correct, s.n);
  return {
    season: s.season, n: s.n, hits: s.correct, hitRate: s.hit_rate, homeRate: s.always_home,
    lift: Math.round((s.hit_rate - s.always_home) * 10) / 10, liftReadable: !!ci && ci[0] > s.always_home, ci,
    tracks: s.tracks ?? null, retired: isRetired(s.model_versions), excluded: null, dateRange: s.date_range ?? null, vsMarket: null, playoffs: null,
  };
}

/** opening = no graded call this season yet; season = the headline is this season. */
export const ledgerStage = (l, current) => (l?.available && l.season === current ? "season" : "opening");

export function lastSeasonOf(l, current) {
  if (!l?.available) return null;
  if (l.season !== current) return headlineRecord(l);
  const prev = (l.seasons ?? []).find((s) => s.season < current && s.n > 0);
  return prev ? summaryRecord(prev) : null;
}

export function verdictOf(r) {
  if (r.n < RATE_FLOOR) return { line: "TOO EARLY TO TELL", tone: "ink" };
  const lift = r.lift ?? 0;
  if (r.liftReadable) return { line: "AHEAD OF ALWAYS-HOME", tone: "win" };
  if (lift > 0) return { line: "AHEAD, NOT YET PROVEN", tone: "amber" };
  if (lift === 0) return { line: "LEVEL WITH ALWAYS-HOME", tone: "ink" };
  return { line: "BEHIND ALWAYS-HOME", tone: "loss" };
}

const hitsOf = (s, n) => (s?.hit_rate != null ? Math.round((s.hit_rate * n) / 100) : 0);
export const rec = (hits, n) => `${hits}–${n - hits}`;

/**
 * The comparisons, each on the games it can be measured on (headlineBar):
 * [{ title, n, us, them, themLabel }] — rates in percent, or null under the
 * floor (then the records print instead).
 */
export function comparisons(r) {
  const out = [];
  const t = r.tracks;
  const row = (title, label, n, theirs, ours) => {
    if (!n || theirs?.hit_rate == null || ours?.hit_rate == null) return;
    const small = n < RATE_FLOOR;
    out.push({ title, themLabel: label, n, small, us: ours.hit_rate, them: theirs.hit_rate, usRec: rec(hitsOf(ours, n), n), themRec: rec(hitsOf(theirs, n), n) });
  };
  if (t) {
    row("Against the market", "The market", t.with_line?.n, t.with_line?.market, t.with_line?.clutch);
    row("Against ESPN BPI", "ESPN BPI", t.vs_espn?.n, t.vs_espn?.espn_bpi, t.vs_espn?.clutch);
  }
  if (r.homeRate != null && r.hitRate != null) {
    out.push({ title: "Against picking the home team", themLabel: "Always home", n: r.n, small: r.n < RATE_FLOOR, us: r.hitRate, them: r.homeRate, usRec: rec(r.hits, r.n), themRec: rec(Math.round((r.homeRate * r.n) / 100), r.n) });
  }
  return out;
}

/** The new season's card before its first graded call (opener). */
export function opener(current, today, sealed, hasLastSeason) {
  const started = today >= REGULAR_SEASON_START;
  return {
    kicker: `${current} · THE NEW SEASON`,
    title: started ? "The first graded calls land after tonight's finals." : `The record starts on ${shortDate(REGULAR_SEASON_START)}.`,
    body: `Every call Clutch makes this season is graded here after the final, beside the market, ESPN and picking the home team every night — misses included.${hasLastSeason ? " Last season's record, made by the model we retired, is kept below exactly as graded." : ""}`,
    sealedLine: sealed > 0 ? `${sealed.toLocaleString("en-US")} ${sealed === 1 ? "GAME" : "GAMES"} SEALED BEFORE TIP SO FAR` : null,
    sealedNote: sealed > 0 ? "Preseason games are sealed too; only the regular season is graded." : today < PRESEASON_START ? `Every number is sealed before tip from ${shortDate(PRESEASON_START)}, the first preseason night.` : null,
  };
}

/** Games sealed before tip since `since` (lib/ledger/seals sealedGames). */
export function sealedGames(rows, since) {
  const byDate = new Map();
  for (const r of rows ?? []) {
    if (r.kind !== "seal") continue;
    const d = String(r.slate_date ?? "").slice(0, 10), n = Number(r.n_games ?? 0);
    if (d < since || !Number.isFinite(n) || n <= 0) continue;
    byDate.set(d, Math.max(byDate.get(d) ?? 0, Math.floor(n)));
  }
  let total = 0;
  for (const n of byDate.values()) total += n;
  return total;
}
