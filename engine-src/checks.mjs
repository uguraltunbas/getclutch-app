// The three checks every post carries to the radar (t70), each a mark on
// Uğur's Telegram preview: ✓ words · ✓ fresh · ✓ sealed. A failed check holds
// the post back (it can only be skipped), and the radar adds its own look at
// the caption's words.
//
// Two kinds of "not now" never reach him as a preview: `wait` (the facts
// aren't in yet, e.g. the Ledger hasn't graded the whole night: the radar
// starts the batch again in 45 minutes) and `late` (too close to tip to be
// worth a tap: the post is left out).

const MIN = 60e3, HOUR = 60 * MIN;
const HEX64 = /^[0-9a-f]{64}$/;

export const RULES = {
  tipMargin: 20 * MIN, // a post needs this long before its tip (render, tap, post)
  sealAge: 20 * HOUR, // tonight's newest seal is from today
  simAge: 30 * HOUR, // the game of the night's runs are from this slate
  whatifAge: 18 * HOUR, // the What-If the radar read is from today
  graded: 4 * HOUR, // the Ledger has seen a game once it was computed this long after its tip (the site's own rule)
  runs: 2000,
};

const t = (iso) => Date.parse(iso ?? "");
/** `iso` is no older than `limit` (an unreadable time never is). */
const within = (iso, limit, now) => now - t(iso) <= limit;
const hours = (iso, now) => Math.round((now - t(iso)) / HOUR);

const pass = (name) => ({ name, ok: true, note: "" });
const fail = (name, note, more = {}) => ({ name, ok: false, note, ...more });

/** words: no sportsbook word drawn on any frame (still and video) or written in the caption. */
export function words(lints) {
  const drawn = [...new Set(lints.flatMap((l) => l.drawn ?? []))];
  const caption = [...new Set(lints.flatMap((l) => l.caption ?? []))];
  if (!lints.length || lints.some((l) => !(l.words ?? []).length)) return fail("words", "no drawn words were seen, so they couldn't be read");
  if (drawn.length || caption.length) {
    return fail("words", [drawn.length ? `drawn: ${drawn.map((w) => `"${w}"`).join(", ")}` : "", caption.length ? `caption: ${caption.map((w) => `"${w}"`).join(", ")}` : ""].filter(Boolean).join("; "));
  }
  return pass("words");
}

/** A seal row the chain can prove: its own hash and the one before it. */
function sealNote(s) {
  if (!s) return "no seal holds this number";
  if (!HEX64.test(s.sha256 ?? "")) return "the seal's hash isn't a sha256";
  if (!HEX64.test(s.prev_sha256 ?? "")) return "the seal doesn't name the one before it";
  return null;
}

/** sealed: the number drawn is the one the Ledger will grade, from a seal on the public chain. */
export function sealed(plan) {
  const p = plan.proof;
  const bad = sealNote(p.seal ?? null);
  switch (plan.series) {
    case "week": {
      const missing = p.dates.filter((d) => !p.sealDates.includes(d));
      if (missing.length) return fail("sealed", `no seal for ${missing.join(", ")}`);
      const broken = p.seals.map(sealNote).find(Boolean);
      return broken ? fail("sealed", broken) : pass("sealed");
    }
    case "moved":
      if (bad) return fail("sealed", bad);
      if (!(Math.abs(p.publicHome - p.radarHome) < 0.005)) return fail("sealed", "the radar's sealed number isn't the newest seal's");
      return pass("sealed");
    default:
      return bad ? fail("sealed", bad) : pass("sealed");
  }
}

/** fresh: today's facts, before tip (the pre-tip posts) or after every final (the recap). */
export function fresh(plan, now = Date.now()) {
  const p = plan.proof;
  const ahead = (iso) => t(iso) - now >= RULES.tipMargin;
  switch (plan.series) {
    case "tonight":
      if (!ahead(p.firstTip)) return fail("fresh", "the first tip is under 20 minutes away", { late: true });
      if (!within(p.seal?.committed_at, RULES.sealAge, now)) return fail("fresh", `the newest seal is ${hours(p.seal?.committed_at, now)} hours old`);
      return pass("fresh");
    case "gotn":
      if (p.game.status !== "scheduled" || !ahead(p.game.tipUtc)) return fail("fresh", "the game tips in under 20 minutes", { late: true });
      if (p.runs.game_id !== p.gotnId) return fail("fresh", "the runs are for another game");
      if (p.runs.runs !== RULES.runs) return fail("fresh", `${p.runs.runs} runs, not ${RULES.runs}`);
      if (!within(p.runs.computed_at, RULES.simAge, now)) return fail("fresh", `the simulation's inputs are ${hours(p.runs.computed_at, now)} hours old`);
      return pass("fresh");
    case "receipts": {
      const open = p.games.filter((g) => g.status !== "final");
      if (open.length) return fail("fresh", `${open.length} of the night's games aren't final`, { wait: true });
      const lastTip = p.games.map((g) => g.tipUtc).filter(Boolean).sort().pop();
      if (!(t(p.ledgerAt) >= t(lastTip) + RULES.graded)) return fail("fresh", "the Ledger hasn't graded the whole night yet", { wait: true });
      return pass("fresh");
    }
    case "week":
      if (!p.complete) return fail("fresh", "the Ledger's list doesn't reach back to Monday");
      if (!(t(p.ledgerAt) >= t(p.lastTip) + RULES.graded)) return fail("fresh", "the Ledger hasn't graded Sunday yet", { wait: true });
      return pass("fresh");
    case "moved":
      if (p.game.status !== "scheduled" || !ahead(p.game.tipUtc)) return fail("fresh", "the game tips in under 20 minutes", { late: true });
      if (!within(p.whatifAt, RULES.whatifAge, now)) return fail("fresh", p.whatifAt ? `the What-If is ${hours(p.whatifAt, now)} hours old` : "the game has no What-If");
      return pass("fresh");
    default:
      return fail("fresh", `no rule for ${plan.series}`);
  }
}
