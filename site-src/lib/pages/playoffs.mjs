// /playoff-chances/ — every team's chance to make the playoffs, from the
// season board's free row (season/<season>: record and playoff_pct only; the
// projected wins, seeds and rounds are Pro and never read). Rebuilt with every
// build, so it moves nightly with the simulation. The test the board passed
// is said from its numbers; the board's own note is not reprinted (its words
// are the app's, not the site's, and the site keeps its own vocabulary).

import { page, esc, ORIGIN, bar, teamSlug } from "../html.mjs";
import { mediumDate } from "../time.mjs";
import { DATA_LICENSE_URL, DATA_LICENSE_LINE } from "../copy.mjs";

export const PLAYOFFS_PATH = "/playoff-chances/";

/** "95%", "<1%", ">99%" — a simulation never quite says never or always. */
export function chanceText(p) {
  if (p == null || !Number.isFinite(p)) return "—";
  if (p < 0.005) return "<1%";
  if (p > 0.995) return ">99%";
  return `${Math.round(p * 100)}%`;
}

export function playoffsPage(m) {
  const board = m.seasonBoard;
  const rows = (board?.teams ?? []).map((r) => ({ ...r, team: m.T[r.team_id] })).filter((r) => r.team && r.playoff_pct != null);
  if (!rows.length) return null;
  const played = Math.max(...rows.map((r) => (r.wins ?? 0) + (r.losses ?? 0)));
  const early = board.phase === "preseason" || played < 10;
  const conf = (c) => rows.filter((r) => r.conference === c).sort((x, y) => y.playoff_pct - x.playoff_pct || x.team.name.localeCompare(y.team.name));
  const table = (c, id) => `<section aria-labelledby="${id}"><h2 class="sh" id="${id}">${c}</h2><div class="scroll"><table class="tbl"><caption class="vh">Playoff chances, ${c}ern Conference</caption><thead><tr><th scope="col">Team</th><th scope="col" class="num">W–L</th><th scope="col" class="num">Playoff chance</th></tr></thead><tbody>${conf(c).map((r) => `<tr><td><a href="${m.teamPath(r.team)}">${esc(r.team.name)}</a></td><td class="num">${r.wins ?? 0}–${r.losses ?? 0}</td><td class="num amber">${chanceText(r.playoff_pct)}</td></tr>`).join("")}</tbody></table></div></section>`;
  // The board's own test, from its numbers: its accuracy score, and last season's record's when the note gives it.
  const bt = board.backtest ?? {};
  const recordBrier = String(bt.note ?? "").match(/against ([0-9.]+) for last season's record/)?.[1];
  const test = bt.playoff_brier != null
    ? `<p>Tested on the ${esc(String(bt.seasons ?? "").replace("–", " to "))} seasons, the chances it gave before opening night scored ${bt.playoff_brier.toFixed(3)} on the accuracy score (the Brier score: lower is better, a coin flip is 0.250)${recordBrier ? `, against ${Number(recordBrier).toFixed(3)} for going by last season's record alone` : ""}.</p>`
    : "";
  const top = rows.slice().sort((x, y) => y.playoff_pct - x.playoff_pct)[0];
  const deck = `Every NBA team's chance to make the playoffs, from ${(board.runs ?? 10000).toLocaleString("en-US")} simulated seasons, rebuilt every night with the latest results.${early ? " With only a few games played, these still lean on each team's rating coming into the season." : ""}`;
  const body = `<div class="wrap r"><div class="rhead"><span class="kick">Playoff chances · ${esc(board.season ?? m.current)}${board.as_of ? ` · Ratings as of ${esc(mediumDate(board.as_of))}` : ""}</span><h1 class="rh1">NBA playoff chances</h1><p class="rdeck">${esc(deck)}</p></div>
<div class="body">
${table("East", "east")}
${table("West", "west")}
<section class="blk" aria-labelledby="how"><h2 id="how">How these are made</h2>
<p>Each night Clutch plays out the rest of the regular season ${(board.runs ?? 10000).toLocaleString("en-US")} times. Every remaining game gets Clutch's win probability for it, each team's strength is allowed to drift as much as it has in past seasons, and ties are broken by head-to-head and then at random. A team's playoff chance is how often it finished in a top-six spot or won its way through the play-in.</p>
${test}
<p>The full simulation — seeds, every round, the title and projected wins — is in Clutch Pro. Each team's page has its next games with Clutch's call. <a href="/teams/">All 30 teams →</a></p>
<p>${DATA_LICENSE_LINE}</p></section>
</div></div>`;
  const title = `NBA playoff chances ${board.season ?? m.current}: all 30 teams, updated nightly · Clutch`;
  const description = `Every NBA team's playoff chance for ${board.season ?? m.current}, from ${(board.runs ?? 10000).toLocaleString("en-US")} simulated seasons, updated nightly. ${top.team.name}: ${chanceText(top.playoff_pct)}.`;
  const ld = {
    "@context": "https://schema.org", "@type": "Dataset",
    name: `NBA playoff chances, ${board.season ?? m.current}`,
    description: `Each NBA team's chance to make the ${board.season ?? m.current} playoffs, from ${(board.runs ?? 10000).toLocaleString("en-US")} simulated seasons of the remaining schedule using Clutch's win probabilities, updated nightly.`,
    url: ORIGIN + PLAYOFFS_PATH,
    creator: { "@type": "Organization", name: "Clutch", url: ORIGIN + "/" },
    isAccessibleForFree: true,
    license: DATA_LICENSE_URL,
    keywords: ["NBA", "playoff chances", "playoff probability", "season simulation", board.season ?? m.current],
    variableMeasured: ["playoff chance", "wins", "losses"],
    ...(board.as_of ? { dateModified: board.as_of } : {}),
  };
  return { path: PLAYOFFS_PATH, title, html: page({ path: PLAYOFFS_PATH, title, description, body, current: "teams", og: "default", jsonld: ld }) };
}
