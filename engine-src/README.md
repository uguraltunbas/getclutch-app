# Clutch daily posts

The renderer behind Clutch's daily social posts. `.github/workflows/content.yml`
runs it when Clutch's radar says a batch is due; each post goes to the owner on
Telegram with [Publish] and [Skip] before anything is posted.

| Series | When | Drawn from |
|---|---|---|
| Tonight | before the first tip | the slate and each game's newest seal |
| Game of the night | before the first tip | the day's pick, played 2,000 times (winners only) |
| Receipts | the morning after | last night's graded calls, misses first, and the night's last seal |
| The number moved | when a player is ruled out | the What-If without him beside the sealed number |
| The week | Mondays | last week's graded calls |

Each post is a 4:5 still (JPEG) and a 9:16 video (H.264, no sound), with
three checks: no sportsbook word drawn or written, the facts are from today,
the number shown is a seal's on the public chain.

- `facts.mjs` reads what any visitor of clutchledger.com can read, with the
  public anon key, through `site-src/lib/data.mjs`'s reader.
- `page.html` / `page.js` draw one post with `vendor/studio.js`, the app's
  share studio, built from the app's source and checked by `vendor-check.mjs`
  (its hash is the manifest's). The drawing runs in headless Chrome through
  `desk-src/render.mjs`.
- `checks.mjs` holds the three checks; `make.mjs` runs a batch and hands each
  post to the radar (`ingest.mjs`).

Run locally, sending nothing: `SUPABASE_ANON_KEY=… node engine-src/make.mjs --series receipts --date 2026-10-29 --out /tmp/posts --dry`

Tests: `node --test engine-src/test/*.test.mjs` (the drawing tests need Chrome).

Fonts: `desk-src/fonts` — SIL Open Font License.
