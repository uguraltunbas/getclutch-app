# Clutch desk

Today's ready-to-post cards and videos, rebuilt from public data three times a
day by `.github/workflows/desk.yml` and published at `/desk/` (noindex).

- `make.mjs` reads with the public anon key (games, teams, the published win
  probability and its top reason, Win Totals lines, the receipts index), builds
  the day's items and renders them with `render.mjs` (headless Chrome over the
  DevTools protocol, frames piped into ffmpeg).
- `cards.html` / `scenes.html` are the templates (LED scoreboard, the morning
  paper, the receipt, the Win Totals tote board, countdown stories).
- Never reads a Pro column and never shows the Machine's Win Totals picks
  before the lock (2026-10-20 19:00 UTC).

Run locally: `SUPABASE_ANON_KEY=… node desk-src/make.mjs --date 2026-10-22 --out /tmp/desk`

Fonts: Fraunces, IBM Plex Mono, Libre Franklin, Doto — SIL Open Font License (fonts/OFL-*.txt).
