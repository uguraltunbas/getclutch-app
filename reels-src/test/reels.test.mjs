// The daily reels: the facts' rules, the captions' words, a run with stand-ins
// (no network, no Chrome). `node --test reels-src/test/*.test.mjs`
import { test } from "node:test";
import assert from "node:assert/strict";
import { reasonFor, seasonRecord, teamOf } from "../facts.mjs";
import { caption, checkWords, badWords } from "../words.mjs";
import { run, telegram, tgCaption, readInputs } from "../make.mjs";

const GSW = teamOf({ abbreviation: "GSW", name: "Golden State Warriors", city: "San Francisco", nickname: "Warriors", primary_color: "#1D428A" });
const SAS = teamOf({ abbreviation: "SAS", name: "San Antonio Spurs", city: "San Antonio", nickname: "Spurs", primary_color: "#C4CED4" });
const BKN = teamOf({ abbreviation: "BKN", name: "Brooklyn Nets", city: "Brooklyn", nickname: "Nets", primary_color: "#000000" });

test("a team: the place from its full name, a colour that shows on the night paper", () => {
  assert.equal(GSW.place, "Golden State");
  assert.notEqual(BKN.color, "#000000"); // black is lifted toward the ink
  assert.equal(SAS.color, "#C4CED4");
});

test("the reason: the first driver toward Clutch's side, in plain words", () => {
  const drivers = [
    { key: "injuries", label: "Injury report: …", share: 0.38, direction: "home", args: { out: [{ abbr: "SAS", names: ["Tobias Harris"], more: 0 }, { abbr: "GSW", names: ["Jimmy Butler", "Stephen Curry", "Brandon Williams"], more: 2 }] } },
    { key: "elo", label: "Long-run strength (Elo): SAS 1729, GSW 1531", share: 0.25, direction: "home", args: { home_elo: 1729, away_elo: 1531 } },
  ];
  assert.deepEqual(reasonFor({ drivers }, "home", SAS, GSW), { title: "The injury report", line: "Golden State without Jimmy Butler, Stephen Curry and 3 more", share: 38, first: true });
  const elo = reasonFor({ drivers: drivers.slice(1) }, "home", SAS, GSW);
  assert.equal(elo.line, "San Antonio rated well above Golden State");
  // nothing pulls toward the away side: no reason rather than a wrong one
  assert.equal(reasonFor({ drivers }, "away", SAS, GSW), null);
  // without the explain row, the prediction's key factors (team codes read as places)
  const kf = reasonFor({ keyFactors: [{ factor: "travel", label: "Travel: GSW 186 mi, SAS 1,050 mi", impact: 0.06, direction: "away" }] }, "away", SAS, GSW);
  assert.equal(kf.line, "Golden State 186 mi, San Antonio 1,050 mi");
});

test("the season's record: this season, graded, no preseason, in tip order", () => {
  const c = (d, tip, ok, extra = {}) => ({ game_id: d + tip, game_date: d, tip_utc: `${d}T${tip}:00Z`, correct: ok, season_type: "Regular Season", ...extra });
  const calls = [c("2026-11-02", "23", true), c("2026-11-01", "23", false), c("2026-10-10", "23", true, { season_type: "Preseason" }), c("2026-05-01", "23", false), c("2026-11-03", "23", true)];
  const r = seasonRecord(calls, "2026-11-02");
  assert.deepEqual([r.right, r.wrong, r.n, r.rate], [1, 1, 2, 50]);
  assert.deepEqual(r.tiles, [0, 1]);
});

const tonight = { kind: "tonight", home: SAS, away: GSW, pick: "SAS", pickHome: true, pct: 84, tip: "9:30 PM ET", day: "Fri, Nov 13", sealedAt: "10:01 AM ET", preseason: false, reason: { title: "The injury report", line: "Golden State without Jimmy Butler, Stephen Curry and 3 more" } };
const graded = { kind: "graded", home: SAS, away: GSW, pick: "SAS", pickHome: true, other: "GSW", pct: 71, homeScore: 101, awayScore: 109, correct: false, day: "Thu, Nov 12", record: { right: 128, wrong: 46, n: 174, rate: 73.6 } };

test("captions: the number, the tip, the reason, the record, a miss said as a miss, 3–5 hashtags, no betting words", () => {
  const a = caption(tonight), b = caption(graded);
  assert.match(a, /^Tonight's number: Spurs 84% to beat the Warriors\./);
  assert.match(a, /GSW @ SAS · Fri, Nov 13 · 9:30 PM ET/);
  assert.match(a, /clutchledger\.com/);
  assert.match(b, /^Graded ✗ Clutch had the Spurs at 71%\. The Warriors won 109–101\. It stays on the record\./);
  assert.match(b, /128–46/);
  for (const t of [a, b]) {
    const tags = t.match(/#\w+/g);
    assert.ok(tags.length >= 3 && tags.length <= 5);
    assert.deepEqual(badWords(t), []);
  }
  assert.match(caption({ ...tonight, preseason: true }), /never graded/);
});

test("the word check: sportsbook words, 100% and market claims are caught, drawn or written", () => {
  assert.deepEqual(badWords("Our best bet tonight"), ["bet", "lock_sure_pick"]);
  assert.ok(badWords("100% right").includes("100%"));
  assert.ok(badWords("Clutch beats the market").includes("beats the market"));
  assert.equal(checkWords(["Spurs to win."], "fine").ok, true);
  assert.equal(checkWords(["the spread"], "fine").ok, false);
  assert.equal(checkWords([], "fine").ok, false);
});

test("Telegram: no bot without both secrets; the caption is escaped inside a copy block", () => {
  assert.equal(telegram("", ""), null);
  assert.equal(telegram("123456:" + "a".repeat(35), ""), null);
  const html = tgCaption(tonight, "a < b & c");
  assert.match(html, /<pre>a &lt; b &amp; c<\/pre>/);
});

test("inputs: the date, one reel, a dry run", () => {
  const i = readInputs(["--date", "2026-11-13", "--only", "graded", "--dry"], {});
  assert.deepEqual([i.date, i.only, i.dry], ["2026-11-13", "graded", true]);
  assert.throws(() => readInputs(["--date", "13/11"], {}));
  assert.throws(() => readInputs(["--only", "x"], {}));
});

test("a run: graded first, then tonight; a held-back reel is never sent; nothing to make says why", async () => {
  const sent = [], lines = [];
  const T = { video: async (mp4, html) => sent.push(html), line: async (h) => lines.push(h) };
  const F = { graded: async () => ({ empty: "a preseason game is sealed, never graded" }), tonight: async () => tonight };
  const draw = async (_cdp, plan) => ({ mp4: Buffer.from("x"), png: Buffer.from("p"), texts: ["Spurs to win."], dur: 15 });
  const out = (await import("node:os")).tmpdir() + "/reels-test";
  const r = await run({ date: "2026-11-13", out, dry: false }, { F, T, draw, chrome: async () => ({ cdp: null, close() {} }), log: () => {} });
  assert.deepEqual(r.made, [{ kind: "tonight", sent: true }]);
  assert.equal(r.skipped[0].kind, "graded");
  assert.equal(sent.length, 1);
  assert.match(lines[0], /no reel today/);
  const bad = async () => ({ mp4: Buffer.from("x"), png: Buffer.from("p"), texts: ["a mortal lock"], dur: 15 });
  sent.length = 0;
  const r2 = await run({ date: "2026-11-13", out, dry: false, only: "tonight" }, { F, T, draw: bad, chrome: async () => ({ cdp: null, close() {} }), log: () => {} });
  assert.equal(sent.length, 0);
  assert.equal(r2.failed.length, 1);
});
