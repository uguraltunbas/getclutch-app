// Per-game share cards (X and Open Graph, 1200×630 JPEG) for the game pages:
// the two teams, the tip in ET, Clutch's sealed number on the LED glass and
// "Sealed before tip"; after the final, the score and the Ledger's grade
// (held / missed) as a stamp. Drawn by the desk's renderer (desk-src/render.mjs,
// template "og" in desk-src/cards.html) — every word on a card is written here,
// so the build holds it to the betting-word list like the pages.
//
// A card is served at /og/g/<date>-<away>-at-<home>-<hash>.jpg. The hash
// covers everything drawn — the number and the graded state among it — so a
// new number or a grade gives a new address and X's card cache fetches it
// again. Only games from the last OG_DAYS days (and tonight's) get one; older
// pages keep the generic /og/game.jpg, so the site carries ~15 days of cards.
//
// Rendering is the slow part, so the JPEGs live in a cache folder that
// outlasts the build (site.yml restores it with actions/cache): a build copies
// what is cached, renders at most `budget` missing cards (tonight's first,
// then the newest finals), and deletes every cached card it no longer uses —
// superseded hashes and anything older than OG_DAYS. A game whose card is
// neither cached nor rendered this time (budget spent, no Chrome) falls back
// to /og/game.jpg until a later build draws it.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pct, finalLabel } from "./copy.mjs";
import { shift, dayLabel, timeET } from "./time.mjs";
import { swatchOn } from "./swatch.mjs";

export const OG_DAYS = 14;
export const OG_BUDGET = 15;
/** Bump when the template's look changes: every card gets a new address. */
const DESIGN = 1;
// The desk's Night Edition paper and ink (desk-src/brand.css): team colours lifted to 3:1 on it.
const PAPER = ["#15130F", "#101114"], INK = "#F1E9D8";

/** The card's words and numbers for one game, or null (no number, postponed). */
export function cardFor(g) {
  if (!g.hasCall || g.status === "postponed") return null;
  const final = g.status === "final" && g.homeScore != null;
  if (g.status === "final" && !final) return null;
  const s = g.side, p = pct(s.prob);
  const sealed = g.receipt?.state === "sealed";
  const team = (t, score) => ({ abbr: t.abbreviation, city: t.city, name: t.nickname, c: swatchOn(t.primary_color || "#555555", PAPER, INK), s: final ? String(score) : "" });
  const st = !final ? "pre" : g.grade === "right" ? "held" : g.grade === "missed" ? "missed" : "open";
  const lede = !final
    ? (sealed ? "Sealed before tip." : "To be sealed before tip.")
    : g.grade === "ungraded" ? "Not graded." : "Sealed before tip.";
  const at = sealed ? `At ${timeET(g.receipt.seal.committedAt)}.` : "";
  // A graded card says the grade with its stamp, so its line stays short (the stamp sits beside it).
  const sub = [at, {
    pre: g.preseason ? "Preseason: never graded." : "Graded after the final.",
    held: "", missed: "",
    open: g.grade === "preseason" ? "Preseason: never graded." : g.grade === "pending" ? "Graded overnight." : g.grade === "ungraded" ? "No proof it came before tip." : "",
  }[st]].filter(Boolean).join(" ");
  const card = {
    a: team(g.away, g.awayScore), h: team(g.home, g.homeScore), p: String(p), st,
    top: final ? `${finalLabel(g.period)} · ${dayLabel(g.date)}` : `${g.preseason ? "Preseason" : "Clutch's call"} · ${dayLabel(g.date)}`,
    tip: g.tipUtc ? `Tip ${timeET(g.tipUtc)}` : "",
    cap: final ? `Clutch's call: ${s.team.nickname}` : `${s.team.nickname} to win`,
    lede, sub,
    stamp: st === "held" ? "Held" : st === "missed" ? "Missed" : "",
  };
  const score = final ? `, final ${g.away.nickname} ${g.awayScore}, ${g.home.nickname} ${g.homeScore}` : "";
  const grade = st === "held" ? " The call held." : st === "missed" ? " Clutch missed; it stays on the record." : "";
  card.alt = `${g.away.name} at ${g.home.name}${score}. Clutch's call before tip: ${s.team.nickname} ${p}% to win. ${lede}${sub ? ` ${sub}` : ""}${grade}`;
  return card;
}

/** Every visible string on a card (and its alt text), for the betting-word check. */
export const cardText = (c) => [c.a.city, c.a.name, c.h.city, c.h.name, `${c.p}%`, c.top, c.tip, c.cap, c.lede, c.sub, c.stamp, c.alt].filter(Boolean);

const q = (o) => Object.entries(o).filter(([k]) => k !== "alt").map(([k, v]) => `${k}=${encodeURIComponent(typeof v === "string" ? v : JSON.stringify(v))}`).join("&");

/**
 * The cards this build wants: [{ g, name ("g/<slug>-<hash>", page()'s og), file, card, query }],
 * tonight's (and anything still to tip) first, then the finals newest first.
 */
export function planCards(m, { days = OG_DAYS } = {}) {
  const from = shift(m.today, -days);
  const out = [];
  for (const g of m.pageGames) {
    if (g.date < from) continue;
    const card = cardFor(g);
    if (!card) continue;
    const query = `t=og&${q(card)}`;
    const hash = createHash("sha256").update(`${DESIGN}|${query}`).digest("hex").slice(0, 10);
    const slug = `${g.date}-${g.path.split("/").filter(Boolean).pop()}`;
    out.push({ g, card, query, name: `g/${slug}-${hash}`, file: `${slug}-${hash}.jpg` });
  }
  const open = (x) => (x.card.st === "pre" ? 0 : 1);
  return out.sort((x, y) => open(x) - open(y) || y.g.date.localeCompare(x.g.date) || (x.g.tipUtc ?? "").localeCompare(y.g.tipUtc ?? ""));
}

/**
 * Brings every planned card into `cache`: renders the missing ones, at most
 * `budget`, with desk-src/render.mjs; deletes every cached card the plan no
 * longer names. Returns { ready: Set of names with a file, rendered, missing, pruned }.
 */
export function prepareCards(plan, { cache, deskDir, budget = OG_BUDGET, warn = console.warn }) {
  mkdirSync(cache, { recursive: true });
  const todo = plan.filter((x) => !existsSync(join(cache, x.file))).slice(0, Math.max(0, budget));
  let rendered = 0;
  if (todo.length) {
    const chrome = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    if (!existsSync(chrome)) warn(`share cards: no Chrome at ${chrome} (set CHROME_PATH): ${todo.length} cards not drawn`);
    else {
      const jobs = join(cache, ".jobs.json");
      writeFileSync(jobs, JSON.stringify(todo.map((x) => ({ page: "cards.html", query: x.query, out: join(cache, x.file), w: 1200, h: 630, quality: 86 }))));
      const r = spawnSync(process.execPath, [join(deskDir, "render.mjs"), "cards", jobs], { cwd: deskDir, encoding: "utf8", timeout: 180e3 });
      rmSync(jobs, { force: true });
      if (r.status !== 0) warn(`share cards: the renderer failed (${(r.stderr || r.error?.message || "").trim().split("\n").pop()}): the cards it did not draw keep /og/game.jpg`);
      rendered = todo.filter((x) => existsSync(join(cache, x.file))).length;
    }
  }
  const keep = new Set(plan.map((x) => x.file));
  let pruned = 0;
  for (const f of readdirSync(cache)) if (f.endsWith(".jpg") && !keep.has(f)) { rmSync(join(cache, f), { force: true }); pruned++; }
  const ready = new Set(plan.filter((x) => existsSync(join(cache, x.file))).map((x) => x.name));
  return { ready, rendered, missing: plan.length - ready.size, pruned };
}

/** Copies the ready cards into the site under /og/g/. */
export function publishCards(plan, ready, { cache, out }) {
  mkdirSync(join(out, "og", "g"), { recursive: true });
  for (const x of plan) if (ready.has(x.name)) copyFileSync(join(cache, x.file), join(out, "og", "g", x.file));
}
