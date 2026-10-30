// vendor/studio.js is the file apps/radar/content/vendor.mjs built: its hash
// is the one in studio.manifest.json, so a hand edit here never draws a post.
// (Whether it is the newest build is checked on the private side, by
// `vendor.mjs --check` in clutch-verify.)
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const dir = new URL("./vendor/", import.meta.url);
const js = readFileSync(new URL("studio.js", dir));
const manifest = JSON.parse(readFileSync(new URL("studio.manifest.json", dir), "utf8"));
const sha = createHash("sha256").update(js).digest("hex");
if (sha !== manifest.bundle_sha256) {
  console.error(`engine-src/vendor/studio.js was changed by hand (sha256 ${sha.slice(0, 12)}…, the manifest says ${String(manifest.bundle_sha256).slice(0, 12)}…): rebuild it with apps/radar/content/vendor.mjs`);
  process.exit(1);
}
console.log(`vendor/studio.js matches its manifest (clutch-mobile ${String(manifest.built_from?.commit).slice(0, 12)}, ${manifest.inputs?.length ?? 0} files)`);
