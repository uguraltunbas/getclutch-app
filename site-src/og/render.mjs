// Renders the Open Graph images once (1200×630 PNG via desk-src/render.mjs,
// then JPEG with macOS `sips`) into site-src/static/og/, plus the icons from
// desk-src/icon.png. Run on a Mac with Chrome; commit the results.
//   node site-src/og/render.mjs
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "static");
const TMP = join(HERE, ".tmp");
mkdirSync(join(OUT, "og"), { recursive: true });
mkdirSync(TMP, { recursive: true });
const kinds = ["home", "game", "ledger", "pricing", "default"];
const jobs = kinds.map((t) => ({ page: join(HERE, "og.html"), query: `t=${t}`, out: join(TMP, `${t}.png`), w: 1200, h: 630 }));
writeFileSync(join(TMP, "jobs.json"), JSON.stringify(jobs));
const r = spawnSync(process.execPath, [join(HERE, "..", "..", "desk-src", "render.mjs"), "cards", join(TMP, "jobs.json")], { stdio: "inherit" });
if (r.status !== 0) process.exit(1);
const sips = (args) => { const x = spawnSync("sips", args, { stdio: "ignore" }); if (x.status !== 0) throw new Error("sips " + args.join(" ")); };
for (const t of kinds) sips(["-s", "format", "jpeg", "-s", "formatOptions", "82", join(TMP, `${t}.png`), "--out", join(OUT, "og", `${t}.jpg`)]);
const icon = join(HERE, "..", "..", "desk-src", "icon.png");
sips(["-z", "180", "180", icon, "--out", join(OUT, "apple-touch-icon.png")]);
sips(["-z", "512", "512", icon, "--out", join(OUT, "icon-512.png")]);
sips(["-z", "64", "64", icon, "--out", join(OUT, "favicon.png")]);
rmSync(TMP, { recursive: true, force: true });
console.log("og images and icons →", OUT);
