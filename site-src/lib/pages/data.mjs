// /data/ — Clutch's own numbers as files anyone can read: every game of the
// season that has a number (JSON and CSV), tonight's slate (JSON), and the same
// games in the column layout of FiveThirtyEight's retired nba_elo_latest.csv,
// whose address has redirected to ABC News since May 2026 (code that read it
// works again with one URL and one rename). Plus the page that explains them.
//
// Only Clutch's numbers go in (CC BY 4.0, as on Kaggle and Hugging Face): never
// the market's price or ESPN BPI (they belong to their sources), never a Pro
// number, never the preseason (the Ledger leaves it out too). The number is the
// one the Ledger grades: the graded seal's when the game is graded, else the
// published one. Rebuilt with the pages; build.mjs checks the files agree.

import { page, esc, ORIGIN } from "../html.mjs";
import { rec, pickSide, sealFileUrl, RECEIPTS_REPO, DATA_LICENSE_URL, DATA_LICENSE_LINE } from "../copy.mjs";
import { mediumDate } from "../time.mjs";

export const DATA = "/data/";
export const FILES = {
  games: "/data/games.json",
  gamesCsv: "/data/games.csv",
  tonight: "/data/tonight.json",
  fte: "/data/nba-538-format.csv",
};
export const KAGGLE_DATASET = "https://www.kaggle.com/datasets/xmlzed/nba-win-probabilities-sealed-before-tip";
export const HF_DATASET = "https://huggingface.co/datasets/clutchledger/nba-win-probabilities-sealed-before-tip";
const CREDIT = `Data: <a href="${ORIGIN}/">Clutch</a> (CC BY 4.0)`;

// FiveThirtyEight's team codes (Basketball-Reference's) where Clutch's differ.
const FTE_CODE = { BKN: "BRK", CHA: "CHO", PHX: "PHO" };
// The header of nba_elo_latest.csv up to the scores, with Clutch's number where Elo's stood.
export const FTE_COLUMNS = ["date", "season", "neutral", "playoff", "team1", "team2", "clutch_prob1", "clutch_prob2", "score1", "score2"];
const ROUND = { 1: "q", 2: "s", 3: "c", 4: "f" };

/**
 * 538's playoff column: blank in the regular season, "p" for the play-in, then q/s/c/f by round.
 * The round is read off the NBA game id (004YY00R…; the play-in is 005…); a postseason game
 * whose id isn't on record yet gets "x".
 */
function fteStage(g) {
  const id = String(g.nbaId ?? "");
  if (id.startsWith("005")) return "p";
  if (id.startsWith("004")) return ROUND[id[7]] ?? "x";
  return g.seasonType === "Playoffs" ? "x" : "";
}

const r4 = (x) => Math.round(x * 1e4) / 1e4;
const playing = (g) => g.status !== "postponed" && g.status !== "cancelled";

/** One row per game: the shape of games.json, games.csv and tonight.json. */
function row(g, m) {
  const prob = g.receipt?.gradedHomeProb ?? (g.hasCall ? g.homeProb : null);
  const side = prob == null ? null : pickSide(prob, g.home, g.away);
  const final = g.status === "final";
  const seal = g.receipt?.seal ?? null;
  return {
    game_id: g.id,
    date: g.date,
    tip_utc: g.tipUtc,
    season: m.current,
    season_type: g.seasonType,
    home: g.home.abbreviation,
    home_name: g.home.name,
    away: g.away.abbreviation,
    away_name: g.away.name,
    neutral: g.neutral,
    clutch_home_win_prob: prob == null ? null : r4(prob),
    clutch_away_win_prob: prob == null ? null : r4(1 - prob),
    called: g.call?.pick ?? side?.team.abbreviation ?? null,
    status: g.status,
    home_score: final ? g.homeScore : null,
    away_score: final ? g.awayScore : null,
    graded: !!g.call,
    called_right: g.call ? g.call.correct === true : null,
    sealed_at: seal?.committedAt ?? null,
    seal_file: seal ? sealFileUrl(seal) : null,
    game_url: ORIGIN + g.path,
  };
}

/** Every game of the season through tonight that has Clutch's number, oldest first. */
export function dataRows(m) {
  const last = m.tonight ?? m.today;
  return m.games
    .filter((g) => !g.preseason && playing(g) && g.date <= last && (g.receipt?.gradedHomeProb != null || g.hasCall))
    .sort((a, b) => (a.date + (a.tipUtc ?? "")).localeCompare(b.date + (b.tipUtc ?? "")) || a.home.abbreviation.localeCompare(b.home.abbreviation))
    .map((g) => row(g, m));
}

const csvCell = (v) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const csv = (cols, rows) => [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n") + "\n";

/** The 538-layout row: team1 is the home side, scores only once final, season the year it ends. */
export function fteRow(r, g) {
  const final = r.home_score != null && r.away_score != null;
  return {
    date: r.date,
    season: +r.season.slice(0, 4) + 1,
    neutral: r.neutral ? 1 : 0,
    playoff: fteStage(g),
    team1: FTE_CODE[r.home] ?? r.home,
    team2: FTE_CODE[r.away] ?? r.away,
    clutch_prob1: r.clutch_home_win_prob,
    clutch_prob2: r.clutch_away_win_prob,
    score1: final ? r.home_score : null,
    score2: final ? r.away_score : null,
  };
}

/** The four files, as { path, body }. */
export function dataFiles(m) {
  const rows = dataRows(m);
  const at = m.raw.builtAt;
  const about = {
    name: "Clutch NBA win probabilities",
    description: "Clutch's pregame win probability for every NBA game of the season, sealed in a public GitHub repository before tip and graded after the final.",
    season: m.current,
    generated_at: at,
    docs: ORIGIN + DATA,
    license: "CC BY 4.0",
    license_url: DATA_LICENSE_URL,
    attribution: "Data: Clutch (https://clutchledger.com), CC BY 4.0. Please link to clutchledger.com.",
    seals: RECEIPTS_REPO,
  };
  const tonight = m.tonight ? m.games.filter((g) => g.date === m.tonight && !g.preseason && playing(g)).map((g) => row(g, m)) : [];
  const cols = Object.keys(rows[0] ?? row(m.games[0], m));
  return [
    { path: FILES.games, body: JSON.stringify({ ...about, games: rows }) + "\n" },
    { path: FILES.gamesCsv, body: csv(cols, rows) },
    { path: FILES.tonight, body: JSON.stringify({ ...about, date: m.tonight, games: tonight }) + "\n" },
    { path: FILES.fte, body: csv(FTE_COLUMNS, rows.map((r) => fteRow(r, m.gameById[r.game_id]))) },
  ];
}

const FIELDS = [
  ["game_id", "Clutch's id for the game (the same in the seal files)."],
  ["date", "The game's date in New York (US Eastern), YYYY-MM-DD."],
  ["tip_utc", "Scheduled tip-off, UTC."],
  ["season, season_type", "\"2026-27\"; \"Regular Season\" or \"Playoffs\"."],
  ["home, away", "Team codes (BKN, CHA, PHX…); home_name and away_name spell them out."],
  ["neutral", "true when neither side is at home."],
  ["clutch_home_win_prob", "Clutch's chance the home team wins, 0 to 1. clutch_away_win_prob is 1 minus it."],
  ["called", "The side Clutch's number favours."],
  ["status", "scheduled, live, halftime or final."],
  ["home_score, away_score", "Filled once the game is final."],
  ["graded, called_right", "Whether the Ledger has graded the call, and whether the called side won."],
  ["sealed_at, seal_file", "When the number was sealed and the file on GitHub that holds it."],
  ["game_url", "The game's page on clutchledger.com."],
];

/** /data/ — what the files are, their fields, how to read them and how to credit them. */
export function dataPage(m) {
  const rows = dataRows(m);
  const graded = rows.filter((r) => r.graded);
  const right = graded.filter((r) => r.called_right).length;
  const first = rows[0]?.date;
  const n = rows.length.toLocaleString("en-US");
  const tonight = rows.filter((r) => r.date === m.tonight).length;
  const files = [
    [FILES.games, "Every game of the season that has Clutch's number: the number, the result, whether the call held, and its seal.", n],
    [FILES.gamesCsv, "The same rows as a spreadsheet.", n],
    [FILES.tonight, "Tonight's games only, with each number as it stands.", String(tonight)],
    [FILES.fte, "The same games in the column layout of FiveThirtyEight's retired <code>nba_elo_latest.csv</code>.", n],
  ];
  const py = `import pandas as pd\n\ngames = pd.read_csv("${ORIGIN}${FILES.gamesCsv}")\ngraded = games[games.graded]\nprint(graded.called_right.mean())`;
  const r = `games <- read.csv("${ORIGIN}${FILES.gamesCsv}")\ntable(games$called_right)`;
  const js = `const res = await fetch("${ORIGIN}${FILES.tonight}");\nconst { games } = await res.json();`;
  const body = `<div class="wrap r"><div class="rhead"><span class="kick">OPEN DATA</span><h1 class="rh1">Clutch's NBA win probabilities, free to download.</h1><p class="rdeck">Every number Clutch has put on an NBA game this season, as JSON and CSV. No key, no sign-up: rebuilt with the site four times a day, free to reuse with credit. The files are served over HTTPS with CORS open to every site, so a web page can read them straight from the browser.</p></div>
<div class="body">
<section aria-labelledby="files"><h2 class="sh" id="files">The files</h2>
<div class="scroll"><table class="tbl"><caption class="vh">The data files and what each holds</caption><thead><tr><th scope="col">FILE</th><th scope="col">WHAT IT HOLDS</th><th scope="col" class="num">GAMES</th></tr></thead><tbody>${files.map(([p, what, n]) => `<tr><td><a href="${p}">${esc(p.replace(DATA, ""))}</a></td><td>${what}</td><td class="num">${esc(n)}</td></tr>`).join("")}</tbody></table></div>
<p class="note">${first ? `From ${esc(mediumDate(first))} to tonight. ` : ""}${graded.length ? `${graded.length.toLocaleString("en-US")} of those games are graded so far: ${rec(right, graded.length)}. ` : ""}A game's row appears once Clutch has a number for it, usually the morning of the game.</p></section>

<section class="blk" aria-labelledby="fields"><h2 id="fields">The fields</h2><dl>${FIELDS.map(([k, d]) => `<dt><code>${esc(k)}</code></dt><dd>${esc(d)}</dd>`).join("")}</dl></section>

<section class="blk" aria-labelledby="use"><h2 id="use">Read it in a line</h2>
<p>Python, with pandas:</p><pre class="scroll"><code>${esc(py)}</code></pre>
<p class="gap">R:</p><pre class="scroll"><code>${esc(r)}</code></pre>
<p class="gap">In a browser or a bot (the files allow any origin):</p><pre class="scroll"><code>${esc(js)}</code></pre></section>

<section class="blk" aria-labelledby="fte"><h2 id="fte">Coming from FiveThirtyEight?</h2>
<p>FiveThirtyEight's NBA forecast stopped after the 2022-23 season, the site closed in 2025, and its <code>nba_elo.csv</code> and <code>nba_elo_latest.csv</code> addresses now send you to ABC News. <a href="${FILES.fte}">nba-538-format.csv</a> has the same columns up to the scores (team1 at home, the same team codes, the season as the year it ends), with Clutch's number in <code>clutch_prob1</code> and <code>clutch_prob2</code>. <a href="/learn/fivethirtyeight-nba-predictions/">What changed and how to switch →</a></p></section>

<section class="blk" aria-labelledby="credit"><h2 id="credit">Credit</h2>
<p>${DATA_LICENSE_LINE} A line like this under your chart or post is enough:</p><pre class="scroll"><code>${esc(CREDIT)}</code></pre></section>

<section class="blk" aria-labelledby="scope"><h2 id="scope">What's in, what isn't</h2>
<p>Only Clutch's own numbers. The site shows ESPN BPI and the market's number beside Clutch's on every game; those belong to their sources and are not in the files. Pro numbers and the preseason are left out. Before tip a game's number can still move as news comes in; the one graded is the last sealed before tip, and a graded row never changes.</p>
<p>Every number is sealed with a SHA-256 fingerprint in <a href="${RECEIPTS_REPO}">a public repository</a> before tip, so a row can be checked against its seal file. <a href="/receipts/">How to check one →</a></p></section>

<section class="blk" aria-labelledby="more"><h2 id="more">More</h2>
<p>The same numbers with every seal and reveal file, plus the two-season test's calibration bands, are on <a href="${KAGGLE_DATASET}">Kaggle</a> and <a href="${HF_DATASET}">Hugging Face</a>, updated every Monday. How the numbers hold up: <a href="/accuracy/">Accuracy</a>.</p></section>
</div></div>`;
  const title = "Free NBA win probability data, JSON and CSV · Clutch";
  const description = "Clutch's pregame win probability for every NBA game this season as free JSON and CSV, sealed before tip, graded after, with a FiveThirtyEight-style CSV.";
  const ld = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `Clutch NBA win probabilities, ${m.current}`,
    description: "Clutch's pregame win probability for every NBA game of the season, each sealed in a public GitHub repository before tip-off and graded after the final, with the score and whether the called side won. Also in the column layout of FiveThirtyEight's retired nba_elo_latest.csv.",
    url: ORIGIN + DATA,
    creator: { "@type": "Organization", name: "Clutch", url: ORIGIN + "/" },
    isAccessibleForFree: true,
    license: DATA_LICENSE_URL,
    isBasedOn: RECEIPTS_REPO,
    keywords: ["NBA", "basketball", "win probability", "predictions", "open data", "FiveThirtyEight", "nba_elo_latest.csv"],
    variableMeasured: ["home win probability", "away win probability", "final score", "called side right"],
    distribution: [
      { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: ORIGIN + FILES.games },
      { "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: ORIGIN + FILES.gamesCsv },
      { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: ORIGIN + FILES.tonight },
      { "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: ORIGIN + FILES.fte },
    ],
    dateModified: m.raw.builtAt.slice(0, 10),
    ...(first ? { temporalCoverage: `${first}/${rows[rows.length - 1].date}` } : {}),
  };
  return { path: DATA, title, html: page({ path: DATA, title, description, body, current: "ledger", og: "ledger", jsonld: ld }) };
}
