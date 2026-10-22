// Tell IndexNow (Bing, Yandex, Seznam, Naver) which pages changed in this deploy.
//
//   node site-src/indexnow.mjs --out _site_v2 --before live-sitemap.xml [--dry-run]
//   node site-src/indexnow.mjs --out _site_v2 --all [--dry-run]
//
// --before is the sitemap that was live before the deploy (the workflow saves it
// first): only URLs that are new or whose <lastmod> moved are sent, so the four
// builds a day send the morning's pages once, then just new game pages. With no
// --before (or an unreadable one) nothing is sent; --all sends every URL, for a
// one-off first submission. A failed ping prints a warning and exits 0: search
// engines finding the page later is no reason to fail a deploy.
// Zero dependencies (Node 22+).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ORIGIN, INDEXNOW_KEY } from "./lib/html.mjs";

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const OUT = opt("--out") ?? "_site_v2";
const DRY = args.includes("--dry-run");

const entries = (xml) => new Map([...xml.matchAll(/<loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)].map((m) => [m[1], m[2]]));
const now = entries(readFileSync(join(OUT, "sitemap.xml"), "utf8"));

let urls;
if (args.includes("--all")) {
  urls = [...now.keys()];
} else {
  let before;
  try { before = entries(readFileSync(opt("--before") ?? "", "utf8")); } catch { before = null; }
  if (!before || before.size === 0) {
    console.log("indexnow: no earlier sitemap to compare with; nothing sent (use --all for a first submission)");
    process.exit(0);
  }
  urls = [...now].filter(([loc, mod]) => before.get(loc) !== mod).map(([loc]) => loc);
}

if (urls.length === 0) { console.log("indexnow: no changed URLs"); process.exit(0); }
console.log(`indexnow: ${urls.length} URL${urls.length === 1 ? "" : "s"}${DRY ? " (dry run)" : ""}`);
for (const u of urls.slice(0, 10)) console.log("  " + u);
if (urls.length > 10) console.log(`  … and ${urls.length - 10} more`);
if (DRY) process.exit(0);

const host = new URL(ORIGIN).host;
try {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: `${ORIGIN}/${INDEXNOW_KEY}.txt`, urlList: urls }),
  });
  // 200 = received, 202 = received while the key is still being checked; anything else is worth a look.
  if (res.status === 200 || res.status === 202) console.log(`indexnow: accepted (${res.status})`);
  else console.log(`::warning::indexnow answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
} catch (e) {
  console.log(`::warning::indexnow ping failed: ${e.message}`);
}
