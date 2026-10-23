// The two-season walk-forward test's calibration bands (each game predicted by a
// model fit only on earlier games), counted like the live Ledger's: the side the
// model favoured, four bands. Generated from the replay's per-game rows in the
// training repo (bands.py); /accuracy/ shows it only while
// model/accuracy's current_version is `version`.
export const BACKTEST_CALIBRATION = {
 "version": "clutch-20260929",
 "seasons": {
  "2024-25": [
   {
    "lo": 0.5,
    "hi": 0.6,
    "n": 321,
    "hits": 194,
    "claimed": 0.5521
   },
   {
    "lo": 0.6,
    "hi": 0.7,
    "n": 361,
    "hits": 229,
    "claimed": 0.6516
   },
   {
    "lo": 0.7,
    "hi": 0.8,
    "n": 321,
    "hits": 225,
    "claimed": 0.7441
   },
   {
    "lo": 0.8,
    "hi": 1.0,
    "n": 312,
    "hits": 272,
    "claimed": 0.8588
   }
  ],
  "2025-26": [
   {
    "lo": 0.5,
    "hi": 0.6,
    "n": 356,
    "hits": 182,
    "claimed": 0.5529
   },
   {
    "lo": 0.6,
    "hi": 0.7,
    "n": 357,
    "hits": 236,
    "claimed": 0.6503
   },
   {
    "lo": 0.7,
    "hi": 0.8,
    "n": 294,
    "hits": 219,
    "claimed": 0.7485
   },
   {
    "lo": 0.8,
    "hi": 1.0,
    "n": 309,
    "hits": 264,
    "claimed": 0.8615
   }
  ]
 }
};
