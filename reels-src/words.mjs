// The reels' words: the caption Uğur pastes under each video (TikTok,
// YouTube Shorts, Instagram Reels, X) and the check every word goes through.
// English only. No sportsbook word (site-src/lib/betting.mjs, the app's list
// plus the site's own), no "100%", no claim against the market.

import { bettingWordsIn } from "../site-src/lib/betting.mjs";

export const SITE = "clutchledger.com";

/** "#Warriors", "#TrailBlazers", "#76ers": a nickname as a hashtag. */
const tag = (nickname) => `#${String(nickname).replace(/[^\p{L}\p{N}]/gu, "")}`;
const hashtags = (p) => ["#NBA", tag(p.away.nickname), tag(p.home.nickname), "#basketball"].join(" ");

const sideOf = (p, abbr) => (p.home.abbr === abbr ? p.home : p.away);

export function caption(p) {
  if (p.kind === "tonight") {
    const pick = sideOf(p, p.pick), other = p.pickHome ? p.away : p.home;
    return [
      `Tonight's number: ${pick.nickname} ${p.pct}% to beat the ${other.nickname}.`,
      `${p.away.abbr} @ ${p.home.abbr} · ${p.day} · ${p.tip}`,
      p.reason ? `Why: ${p.reason.line}.` : null,
      p.preseason
        ? `Preseason: sealed before tip, never graded. Your call? ${SITE}`
        : `Sealed at ${p.sealedAt}, graded after the final, misses included. Your call? ${SITE}`,
      "",
      hashtags(p),
    ].filter((x) => x !== null).join("\n");
  }
  const pick = sideOf(p, p.pick), other = sideOf(p, p.other);
  const ps = p.pickHome ? p.homeScore : p.awayScore, os = p.pickHome ? p.awayScore : p.homeScore;
  const rec = p.record ? `This season: ${p.record.right}–${p.record.wrong} on every sealed call (${p.record.rate}%).` : null;
  return [
    p.correct
      ? `Graded ✓ Clutch had the ${pick.nickname} at ${p.pct}%. Final: ${pick.nickname} ${ps}, ${other.nickname} ${os}.`
      : `Graded ✗ Clutch had the ${pick.nickname} at ${p.pct}%. The ${other.nickname} won ${os}–${ps}. It stays on the record.`,
    rec,
    `Every call is sealed before tip and graded in public: ${SITE}/ledger`,
    "",
    hashtags(p),
  ].filter((x) => x !== null).join("\n");
}

/** The words a reel can't carry: sportsbook words, a 100% claim, a claim against the market. */
export function badWords(text) {
  const out = bettingWordsIn(text);
  if (/\b100\s?%/.test(text)) out.push("100%");
  if (/\b(beats?|beating|outperform\w*) the (market|books?|vegas)\b/i.test(text)) out.push("beats the market");
  return out;
}

/** Every word a reel drew (the page's TEXTS) and its caption, checked. → { ok, hits } */
export function checkWords(drawn, cap) {
  const hits = [...new Set([...badWords(drawn.join("\n")).map((w) => `drawn: ${w}`), ...badWords(cap).map((w) => `caption: ${w}`)])];
  return { ok: drawn.length > 0 && hits.length === 0, hits: drawn.length ? hits : ["no drawn words were read"] };
}
