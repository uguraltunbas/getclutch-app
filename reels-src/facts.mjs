// The daily reels' facts: two short vertical videos a day, from the rows any
// visitor of clutchledger.com reads with the public anon key (the same reads
// as engine-src/facts.mjs, through site-src/lib/data.mjs's reader).
//
//   tonight  today's game of the night (the free slate's clutch_pick_of_day,
//            the biggest matchup by the two teams' Win Totals lines), the
//            number in the newest seal that holds it, the tip and the
//            biggest reason behind the call (the free explain row).
//   graded   yesterday's game of the night as the Ledger graded it (the
//            number at tip, the final, right or wrong, misses included) and
//            the season's record of every sealed call.
//
// A plan is { empty: why } (nothing to make today), { wait: why } (the facts
// aren't in yet: the morning seal, the Ledger's grade) or the facts the page
// draws. Preseason games are sealed but never graded, so a preseason game of
// the night has no graded reel.

import { facts as engineFacts } from "../engine-src/facts.mjs";
import { plainDriverLabel, pickSide } from "../site-src/lib/copy.mjs";
import { seasonOf, shift, timeET, dayLabel } from "../site-src/lib/time.mjs";
import { swatchOn } from "../site-src/lib/swatch.mjs";

export const PAPER = "#15130F";
export const INK = "#F1E9D8";

/** A team as the reels draw it: its code, names and a colour that shows on the night paper. */
export function teamOf(t) {
  const name = t.name || `${t.city} ${t.nickname}`;
  const place = name.endsWith(` ${t.nickname}`) ? name.slice(0, -t.nickname.length - 1) : t.city;
  // the primary colour, lifted toward the ink until it clears 3:1 on the paper (site-src/lib/swatch.mjs)
  return { abbr: t.abbreviation, nickname: t.nickname, place, name, color: swatchOn(t.primary_color || "#7A7062", PAPER, INK) };
}

/** "Golden State without Stephen Curry, Jimmy Butler and 3 more". */
function withoutLine(team, names, more) {
  const shown = names.slice(0, 2);
  const rest = names.length - shown.length + (more || 0);
  const list = rest > 0 ? `${shown.join(", ")} and ${rest} more` : shown.length === 2 ? `${shown[0]} and ${shown[1]}` : shown[0];
  return `${team.place} without ${list}`;
}

/**
 * The biggest reason behind the call, in plain words: the first driver
 * (largest pull first) that pulls toward Clutch's side, as a short title and
 * one sentence. `drivers`: the free explain row's (key, label, args, share,
 * direction), or the prediction's key_factors (factor, label, impact,
 * direction) when there is no explain row.
 */
export function reasonFor({ drivers, keyFactors }, side, home, away) {
  const list = drivers?.length
    ? drivers.map((d) => ({ key: d.key, label: d.label, args: d.args ?? null, share: typeof d.share === "number" ? d.share : null, toward: d.direction }))
    : (keyFactors ?? []).filter((f) => f && f.label && Number.isFinite(+f.impact)).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
      .map((f) => ({ key: f.factor, label: f.label, args: null, share: null, toward: f.direction === "away" ? "away" : "home" }));
  const r = list.find((d) => d.toward === side) ?? null;
  if (!r) return null;
  const T = { [home.abbr]: home, [away.abbr]: away };
  const first = list.indexOf(r) === 0;
  const share = r.share !== null && r.share >= 0.05 ? Math.round(r.share * 100) : null;
  const plain = plainDriverLabel(r.key, r.label);
  const [head, ...tail] = plain.split(": ");
  let title = tail.length ? head : "The call";
  let line = tail.length ? tail.join(": ") : plain;
  if (r.key === "injuries" && Array.isArray(r.args?.out)) {
    // the other side's absences pull toward Clutch's side
    const other = side === "home" ? away : home;
    const o = r.args.out.find((x) => x.abbr === other.abbr && x.names?.length);
    if (o) { title = "The injury report"; line = withoutLine(other, o.names, o.more); }
  } else if (r.key === "elo" && r.args?.home_elo && r.args?.away_elo) {
    const [hi, lo] = r.args.home_elo >= r.args.away_elo ? [home, away] : [away, home];
    title = "Season-long strength";
    line = `${hi.place} rated ${Math.abs(r.args.home_elo - r.args.away_elo) >= 100 ? "well " : ""}above ${lo.place}`;
  } else if (r.key === "form" && typeof r.args?.home_pts === "number" && typeof r.args?.away_pts === "number") {
    const sign = (x) => (x > 0 ? `+${x}` : `${x}`);
    title = "Point margin";
    line = `${home.place} ${sign(r.args.home_pts)} a game, ${away.place} ${sign(r.args.away_pts)}`;
  } else if (r.key === "home_court") {
    title = "Home court";
    line = `${home.place} at home`;
  }
  // team codes in the words read as places ("GSW 186 mi" → "Golden State 186 mi")
  line = line.replace(/\b[A-Z]{2,4}\b/g, (m) => T[m]?.place ?? m);
  return { title, line: line.replace(/[.\s]+$/, ""), share, first };
}

/** The season's sealed calls, graded, through `date`: the record and one tile per call in tip order. */
export function seasonRecord(calls, date) {
  const season = seasonOf(date);
  const graded = (calls ?? [])
    .filter((c) => (c.season ?? seasonOf(c.game_date)) === season && c.season_type !== "Preseason" && c.game_date <= date && typeof c.correct === "boolean")
    .sort((a, b) => String(a.tip_utc).localeCompare(String(b.tip_utc)) || String(a.game_id).localeCompare(String(b.game_id)));
  const right = graded.filter((c) => c.correct).length;
  return { season, right, wrong: graded.length - right, n: graded.length, rate: graded.length ? Math.round((right / graded.length) * 1000) / 10 : null, tiles: graded.map((c) => (c.correct ? 1 : 0)), ids: graded.map((c) => c.game_id) };
}

/**
 * The reader: `db` is site-src's supabase(url, anon key). Reuses the content
 * engine's reads of the games, the seals and the free snapshots.
 */
export function reelFacts(db) {
  const F = engineFacts(db);
  let teamsP = null;
  const teams = () => (teamsP ??= db.get("teams?select=id,abbreviation,name,city,nickname,primary_color").then((rows) => Object.fromEntries(rows.map((t) => [t.abbreviation, teamOf(t)]))));

  async function gotnOf(date) {
    const today = await F.snapshot(`predictions/today/${date}`);
    return today?.body?.clutch_pick_of_day?.game_id ?? null;
  }

  return {
    /** Tonight's number: the game of the night with its newest seal. */
    async tonight(date) {
      const gotnId = await gotnOf(date);
      if (!gotnId) return { empty: `no game of the night on ${date}` };
      const [gs, T] = await Promise.all([F.games(date), teams()]);
      const g = gs.find((x) => x.id === gotnId);
      if (!g) return { empty: `the game of the night isn't on ${date}'s slate` };
      if (g.status !== "scheduled") return { empty: "the game of the night has tipped" };
      const S = await F.seals(date);
      const held = S.byGame.get(g.id);
      if (!held) return { wait: `no seal holds ${g.awayAbbr} @ ${g.homeAbbr} yet` };
      const home = T[g.homeAbbr], away = T[g.awayAbbr];
      const s = pickSide(held.home, home, away);
      const [explain, preds] = await Promise.all([
        F.snapshot(`explain/${g.id}`),
        db.get(`game_predictions?select=key_factors&is_latest=eq.true&game_id=eq.${g.id}`).catch(() => []),
      ]);
      const reason = reasonFor({ drivers: explain?.body?.drivers, keyFactors: preds[0]?.key_factors }, s.isHome ? "home" : "away", home, away);
      return {
        kind: "tonight", date, key: `tonight:${date}:${g.id}`, path: g.path,
        home, away, pick: s.team.abbr, pickHome: s.isHome,
        pct: Math.min(99, Math.round(s.prob * 100)), // never "100%"
        tip: timeET(g.tipUtc), tipUtc: g.tipUtc, day: dayLabel(date),
        sealedAt: timeET(held.seal.committed_at), sealSha: held.seal.sha256,
        preseason: g.preseason, reason,
      };
    },

    /** Graded: the date's game of the night as the Ledger graded it, and the season's record. */
    async graded(date) {
      const gotnId = await gotnOf(date);
      if (!gotnId) return { empty: `no game of the night on ${date}` };
      const [gs, T, ledger] = await Promise.all([F.games(date), teams(), F.snapshot("ledger/calls")]);
      const g = gs.find((x) => x.id === gotnId);
      if (!g) return { empty: `the game of the night isn't on ${date}'s slate` };
      if (g.preseason) return { empty: "a preseason game is sealed, never graded" };
      if (g.status === "postponed") return { empty: "the game of the night was postponed" };
      const call = (ledger?.body?.calls ?? []).find((c) => c.game_id === g.id && typeof c.correct === "boolean");
      if (!call) return { wait: g.status === "final" ? "the Ledger hasn't graded it yet" : "the game isn't final" };
      if (g.status !== "final" || g.homeScore == null || g.awayScore == null) return { wait: "the game isn't final" };
      const home = T[g.homeAbbr], away = T[g.awayAbbr];
      // the number at tip is the Ledger's; check it against the newest seal before tip that holds the game
      const S = await F.seals(date);
      const held = S.byGame.get(g.id);
      const pickHome = call.pick === g.homeAbbr;
      const sealPct = held ? (pickHome ? held.home : 1 - held.home) * 100 : null;
      const sealed = !!held && Date.parse(held.seal.committed_at) < Date.parse(g.tipUtc) && Math.abs(sealPct - call.claimed_pct) < 0.06;
      if (!sealed) return { empty: "the Ledger's number isn't the newest seal's before tip, so it isn't drawn" };
      const won = g.homeScore > g.awayScore ? g.homeAbbr : g.awayAbbr;
      const correct = won === call.pick;
      if (correct !== call.correct) return { empty: "the final and the Ledger's grade disagree" };
      const rec = seasonRecord(ledger.body.calls, date);
      // the record is only claimed when it reaches back to the season's first night
      const total = ledger.body.total;
      const whole = !(typeof total === "number" && ledger.body.calls.length < total);
      return {
        kind: "graded", date, key: `graded:${date}:${g.id}`, path: g.path,
        home, away, pick: call.pick, pickHome, other: pickHome ? g.awayAbbr : g.homeAbbr,
        pct: Math.min(99, Math.round(call.claimed_pct)),
        homeScore: g.homeScore, awayScore: g.awayScore,
        correct, day: dayLabel(date), tipUtc: g.tipUtc, sealedAt: timeET(held.seal.committed_at),
        record: whole && rec.n ? { right: rec.right, wrong: rec.wrong, n: rec.n, rate: rec.rate, tiles: rec.tiles, last: rec.ids.lastIndexOf(g.id) } : null,
      };
    },

    yesterday: (date) => shift(date, -1),
  };
}
