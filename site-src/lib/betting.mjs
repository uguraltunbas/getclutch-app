// No betting words on the site — the app's own list (mobile
// lib/constants/bettingWords.ts, Faz 5 closing · Apple review), held to every
// generated page: the visible text, the title, meta descriptions, alt and
// aria-label text and the JSON-LD strings. A hit fails the build.
//
// The allow-list is explicit and small, each entry with its reason (as in
// the app's lib/__tests__/noBettingWords.test.ts), and an entry that matches
// nothing in a build fails too, so it cannot rot.

export const BETTING_WORDS = [
  { id: "cover", re: /\bcover(s|ed|ing)?\b/i },
  { id: "ats", re: /\bats\b|against the spread/i },
  { id: "spread", re: /\bspreads?\b/i },
  { id: "over_under", re: /\bover[\s/-]?under\b|\bo\/u\b|\bthe (over|under)\b/i },
  { id: "bet", re: /\bbet(s|ting|tor|tors)?\b/i },
  { id: "wager", re: /\bwager(s|ed|ing)?\b/i },
  { id: "parlay", re: /\bparlays?\b/i },
  { id: "units", re: /\bunits?\b/i },
  { id: "sharp", re: /\bsharps?\b|\bsharp (money|action|side)\b/i },
  { id: "juice_vig", re: /\bjuice\b|\bvig\b|\bvigorish\b/i },
  { id: "lock_sure_pick", re: /\b(a|mortal|stone|total) lock\b(?! screen)|\blocks? of the (day|night|week)\b|\block it in\b|\bbest bet\b|\bsure thing\b/i },
  { id: "pick_of_the_day", re: /\bpicks? of the (day|night)\b/i },
  { id: "odds_boost", re: /\bodds boosts?\b/i },
  { id: "take_the_points", re: /\btake the points\b/i },
  { id: "moneyline", re: /\bmoney ?lines?\b/i },
  { id: "stake", re: /\bstak(e|es|ed|ing)\b/i },
  { id: "sportsbook_gamble", re: /\bsportsbooks?\b|\bgambl(e|es|ed|ing|er|ers)\b|\bhandicapp(er|ers|ing)\b|\btouts?\b/i },
  { id: "ml", re: /\bML\b/ },
  { id: "over_under_pick", re: /^(OVER|UNDER)$|\b(OVER|UNDER) \d{3}\.\d\b/ },
];

export const bettingWordsIn = (text) => BETTING_WORDS.filter((b) => b.re.test(text)).map((b) => b.id);

/** Deliberate uses: `page` is a path prefix ("" = every page), `phrase` a substring of the text segment. */
export const ALLOW = [
  { page: "", phrase: "No betting, no wagering, no cash prizes.", reason: "The footer's legal line on every page: what Clutch is not has to be named (Paddle's review and the app's Terms say the same)." },
  { page: "/", phrase: "NO BETTING", reason: "The front page's promise under the buttons (the approved mockup): a statement of what Clutch is not." },
  { page: "/terms/", phrase: "Analytics, not a wagering service", reason: "Terms of Use: the legal statement of what the app is not has to name it (app/terms.tsx)." },
  { page: "/terms/", phrase: "Clutch does not take bets, process wagers or pay out money", reason: "Terms of Use: the same legal statement (app/terms.tsx, allow-listed in the app too)." },
  { page: "/win-totals/", phrase: "Clutch takes no bets and nothing in it is advice to gamble", reason: "Win Totals official rules (lib/wintotals/rules.ts): a free contest's statement of what it is not." },
];

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", mdash: "—", ndash: "–", hellip: "…", middot: "·", rarr: "→", copy: "©" };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => (e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e.toLowerCase()] ?? m));

/** The text a reader (or a search engine) gets from a page, one segment per text node or attribute. */
export function textSegments(html) {
  const segs = [];
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  for (const j of ld) {
    try { JSON.stringify(JSON.parse(j), (k, v) => { if (typeof v === "string") segs.push(v); return v; }); } catch { segs.push(j); }
  }
  const body = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<!--[\s\S]*?-->/g, " ");
  for (const m of body.matchAll(/\s(?:content|alt|aria-label|title)="([^"]*)"/g)) segs.push(decode(m[1]));
  for (const t of body.split(/<[^>]+>/)) {
    const s = decode(t).replace(/\s+/g, " ").trim();
    if (s) segs.push(s);
  }
  return segs;
}

/**
 * Every page's segments against the list. Returns { hits, stale }: hits are
 * "path [ids] text" lines not covered by the allow-list; stale are allow-list
 * entries nothing matched.
 */
export function scanPages(pages) {
  const used = new Set();
  const hits = [];
  for (const p of pages) {
    if (!p.path.endsWith("/") && !p.path.endsWith(".html")) continue;
    for (const seg of textSegments(p.html)) {
      const ids = bettingWordsIn(seg);
      if (!ids.length) continue;
      const ok = ALLOW.find((a) => (a.page === "" || p.path === a.page || (a.page !== "/" && p.path.startsWith(a.page))) && seg.includes(a.phrase));
      if (ok) { used.add(ok); continue; }
      hits.push(`${p.path} [${ids.join(", ")}] ${seg.slice(0, 160)}`);
    }
  }
  return { hits, stale: ALLOW.filter((a) => !used.has(a)).map((a) => `${a.page || "*"} "${a.phrase}"`) };
}

/** The list's own self-test (the app's): banned forms caught, a time lock and look-alikes left alone. */
export function selfTest() {
  const bad = ["BOS COVERS", "home spread", "O/U 224.5", "Take the over", "Lock of the Night", "a lock tonight", "our best bet", "2 units", "sharp money", "Parlay it", "no stakes", "LAL ML", "UNDER", "OVER 224.5", "no vig"];
  const good = ["Calls lock at tip-off.", "LOCKED AT TIP", "On your lock screen", "the book's line", "Over 1,200 graded calls", "Discover", "Recovered", "unitless", "OVERTIME NOT INCLUDED", "UNDER 100 CALLS", "html", "Over or under?", "between", "better", "anyone under 13"];
  const missed = bad.filter((t) => !bettingWordsIn(t).length);
  const wrong = good.filter((t) => bettingWordsIn(t).length);
  return { missed, wrong };
}
