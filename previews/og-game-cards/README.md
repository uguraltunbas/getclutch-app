# Game-page share cards — preview

Three cards as `site-src/build.mjs` draws them for `/og/g/<date>-<away>-at-<home>-<hash>.jpg`
(1200×630 JPEG, the desk's LED look, template `og` in `desk-src/cards.html`):

- `pre-tip.jpg` — before tip: the teams, the tip in ET, Clutch's sealed number
- `held.jpg` — after the final, the call held
- `missed.jpg` — after the final, the call missed

They were rendered from the made-up fixture (`site-src/test/fixture.mjs`), not from real
games: the teams are real, the numbers, scores and seal times are not. Delete this folder
before merging if it should not ship (desk.yml copies the repository root to GitHub Pages).
