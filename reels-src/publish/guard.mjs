// The check every title and caption goes through before a publisher may send
// it: the app's own list (words.vendor.mjs, copied from clutch-mobile), the
// site's extra market words (site-src/lib/betting.mjs), and the claims a sports
// page that sells nothing must never make in public — a sure thing, a
// guarantee, "beats the market", money to be made, odds talk. A hit holds the
// post back on that platform; nothing is "fixed" silently.
import { SITE_WORDS, bettingWordsIn as siteWordsIn } from "../../site-src/lib/betting.mjs";
import { APP_BETTING_WORDS } from "./words.vendor.mjs";

/** Claims, not words: what reads as a promise of winning or of money. */
export const CLAIMS = [
  { id: "100%", re: /\b100\s?%/ },
  { id: "guarantee", re: /\bguarantee(s|d)?\b|\bcan'?t lose\b|\bno[- ]brainer\b|\brisk[- ]free\b/i },
  { id: "beats_the_market", re: /\b(beats?|beating|outperform\w*|crush\w*) the (market|books?|vegas|line)\b/i },
  { id: "money", re: /\b(make|win|earn)s? (real |easy |free )?money\b|\bfree money\b|\bprofit(s|able)?\b|\bcash(es|ed)? in\b|\bpayday\b/i },
  { id: "odds", re: /\bodds\b|\bvegas\b|\bunderdog\b|\bfavou?rites?\b|\bthe dog\b/i },
  { id: "lock", re: /\block(s|ed)? (it )?in\b|\block of\b|\bsure (thing|win|bet)\b|\bslam dunk pick\b/i },
];

/** Every banned id `text` uses (empty = clean). */
export function bannedIn(text) {
  const s = String(text ?? "");
  const hits = new Set(APP_BETTING_WORDS.filter((b) => b.re.test(s)).map((b) => b.id));
  for (const id of siteWordsIn(s)) if (SITE_WORDS.some((w) => w.id === id)) hits.add(id);
  for (const c of CLAIMS) if (c.re.test(s)) hits.add(c.id);
  return [...hits];
}

/** All the words of one post (title, caption, tags …) checked as one. → { ok, hits } */
export function checkPost(fields) {
  const hits = [];
  for (const [k, v] of Object.entries(fields)) {
    const text = Array.isArray(v) ? v.join(" ") : v;
    for (const id of bannedIn(text)) hits.push(`${k}: ${id}`);
  }
  return { ok: hits.length === 0, hits };
}
