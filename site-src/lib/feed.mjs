// /feed.xml — RSS 2.0 for feed readers and the sites that follow feeds: each
// Learn article, and each finished week of the Ledger. An item is dated the day
// it was published (an article) or the Monday after its week (a week), never
// the build's day, so a rebuild four times a day doesn't make old items look new.

import { esc, ORIGIN } from "./html.mjs";
import { learnFeedItems } from "./pages/learn.mjs";
import { weekFeedItems } from "./pages/weeks.mjs";

export const FEED = "/feed.xml";
const MAX_ITEMS = 30;

// Noon UTC, so the day reads the same in New York and Istanbul.
const rfc822 = (iso) => new Date(`${iso}T12:00:00Z`).toUTCString();

/** The feed's items, newest first. */
export function feedItems(m) {
  return [...learnFeedItems(m), ...weekFeedItems(m)].sort((a, b) => b.date.localeCompare(a.date) || a.path.localeCompare(b.path)).slice(0, MAX_ITEMS);
}

export function feedXml(m) {
  const items = feedItems(m);
  const item = (i) => `<item><title>${esc(i.title)}</title><link>${ORIGIN}${i.path}</link><guid isPermaLink="true">${ORIGIN}${i.path}</guid><pubDate>${rfc822(i.date)}</pubDate><description>${esc(i.description)}</description></item>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Clutch: NBA win probability, graded</title>
<link>${ORIGIN}/</link>
<atom:link href="${ORIGIN}${FEED}" rel="self" type="application/rss+xml"/>
<description>Clutch's articles on reading and grading NBA win probability, and each week of its graded calls: every number sealed before tip, graded after the final.</description>
<language>en</language>
${items.length ? `<lastBuildDate>${rfc822(items[0].date)}</lastBuildDate>\n` : ""}${items.map(item).join("\n")}
</channel>
</rss>
`;
}
