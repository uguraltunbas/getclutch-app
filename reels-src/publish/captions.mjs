// The words under each reel, one set per platform, in English for US NBA fans.
// Same facts as the Telegram caption (reels-src/words.mjs), cut to what each
// platform shows: a Shorts title of at most 100 characters with #Shorts, a
// Threads post of at most 500, a Bluesky post of at most 300 graphemes with
// its links and tags as facets. Few hashtags (the league, the two teams).
// Never "guaranteed", never a claim against the market, nothing that reads as
// a wager: every field goes through guard.mjs before it is sent.
//
// The first line is the hook and says the outcome or the number, the same as
// the reel's first frame: "Clutch gave the Warriors 29%. They won 109–101."

export const SITE = "clutchledger.com";

/** The site with where the visitor came from (the site's analytics read utm_*). */
export const siteUrl = (platform, kind, path = "/") => `https://${SITE}${path}?utm_source=${platform}&utm_medium=reel&utm_campaign=${kind}`;

const tag = (nickname) => `#${String(nickname).replace(/[^\p{L}\p{N}]/gu, "")}`;
const sideOf = (p, abbr) => (p.home.abbr === abbr ? p.home : p.away);

/** The reel's facts as short sentences: the hook first. */
export function lines(p) {
  if (p.kind === "tonight") {
    const pick = sideOf(p, p.pick), other = p.pickHome ? p.away : p.home;
    return {
      hook: `Clutch: ${pick.nickname} ${p.pct}% to beat the ${other.nickname} tonight.`,
      short: `${pick.nickname} ${p.pct}% vs the ${other.nickname}`,
      when: `${p.away.abbr} @ ${p.home.abbr} · ${p.day} · ${p.tip}`,
      why: p.reason ? `Why: ${p.reason.line}.` : null,
      proof: p.preseason ? "Preseason: sealed before tip, never graded." : `Sealed at ${p.sealedAt}, graded after the final, misses included.`,
      ask: "Your call?",
      tags: ["#NBA", tag(p.away.nickname), tag(p.home.nickname)],
      teams: [p.away.nickname, p.home.nickname],
    };
  }
  const pick = sideOf(p, p.pick), other = sideOf(p, p.other);
  const ps = p.pickHome ? p.homeScore : p.awayScore, os = p.pickHome ? p.awayScore : p.homeScore;
  const score = `${Math.max(ps, os)}–${Math.min(ps, os)}`;
  return {
    hook: p.correct
      ? `Clutch said ${p.pct}%. The ${pick.nickname} won ${score}.`
      : `Clutch gave the ${other.nickname} ${100 - p.pct}%. They won ${score}.`,
    short: p.correct ? `Clutch said ${p.pct}%. ${pick.nickname} won.` : `Clutch gave the ${other.nickname} ${100 - p.pct}%. They won.`,
    when: `${p.away.abbr} @ ${p.home.abbr} · ${p.day} · final`,
    why: p.correct ? "The call held." : "A miss, and it stays on the record.",
    proof: p.record ? `Every sealed call this season: ${p.record.right}–${p.record.wrong} (${p.record.rate}%).` : "Every call is sealed before tip and graded in public.",
    ask: "Think you can call them better?",
    tags: ["#NBA", tag(p.away.nickname), tag(p.home.nickname)],
    teams: [p.away.nickname, p.home.nickname],
  };
}

const graphemes = (s) => [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(s)].length;
const join = (xs) => xs.filter((x) => x !== null && x !== undefined).join("\n");

/** Bluesky: plain text plus facets (links and tags are only live with byte offsets). */
export function blueskyPost(text, links = {}) {
  const enc = new TextEncoder();
  const facets = [];
  const at = (needle, from = 0) => {
    const i = text.indexOf(needle, from);
    if (i < 0) return null;
    const byteStart = enc.encode(text.slice(0, i)).length;
    return { byteStart, byteEnd: byteStart + enc.encode(needle).length };
  };
  for (const [shown, uri] of Object.entries(links)) {
    const index = at(shown);
    if (index) facets.push({ index, features: [{ $type: "app.bsky.richtext.facet#link", uri }] });
  }
  for (const m of text.matchAll(/(^|\s)#([\p{L}\p{N}]+)/gu)) {
    const start = m.index + m[1].length;
    const byteStart = enc.encode(text.slice(0, start)).length;
    facets.push({ index: { byteStart, byteEnd: byteStart + enc.encode(`#${m[2]}`).length }, features: [{ $type: "app.bsky.richtext.facet#tag", tag: m[2] }] });
  }
  return { text, facets };
}

/** Every platform's words for one reel. `p` is the plan reels-src/facts.mjs made. */
export function captionsFor(p) {
  const L = lines(p);
  const kind = p.kind;
  const ytTitle = (() => {
    const suffix = " #Shorts";
    for (const head of [L.hook, L.short, `Clutch · ${p.away.abbr} @ ${p.home.abbr}`]) if ((head + suffix).length <= 100) return head + suffix;
    return (L.short.slice(0, 100 - suffix.length - 1) + "…" + suffix);
  })();
  const bskyText = (() => {
    const tail = `${SITE}\n${L.tags.join(" ")}`;
    for (const body of [join([L.hook, L.why, L.proof]), join([L.hook, L.proof]), L.hook]) {
      const t = `${body}\n\n${tail}`;
      if (graphemes(t) <= 300) return t;
    }
    return `${L.short}\n\n${tail}`;
  })();
  const threadsText = (() => {
    // Threads takes one topic tag per post; the league is it
    for (const body of [join([L.hook, L.when, L.why, L.proof, `${L.ask} ${SITE}`]), join([L.hook, L.proof, SITE])]) {
      const t = `${body}\n\n#NBA`;
      if (Buffer.byteLength(t, "utf8") <= 500) return t; // Threads counts some characters by their UTF-8 bytes
    }
    return `${L.hook}\n${SITE}`;
  })();
  return {
    youtube: {
      title: ytTitle,
      description: join([L.hook, L.when, L.why, L.proof, "", `${L.ask} ${siteUrl("youtube", kind)}`, "", [...L.tags, "#basketball", "#Shorts"].join(" ")]),
      tags: ["NBA", ...L.teams, "basketball", "NBA predictions", "Clutch"],
    },
    instagram: {
      caption: join([L.hook, L.when, L.why, L.proof, "", `${L.ask} Link in bio · ${SITE}`, "", [...L.tags, "#basketball"].join(" ")]),
    },
    threads: { text: threadsText },
    facebook: {
      description: join([L.hook, L.when, L.why, L.proof, "", `${L.ask} ${siteUrl("facebook", kind)}`, "", [...L.tags, "#basketball"].join(" ")]),
    },
    bluesky: blueskyPost(bskyText, { [SITE]: siteUrl("bluesky", kind) }),
    tiktok: {
      caption: join([L.hook, L.why, L.proof, `${L.ask} ${SITE}`, "", [...L.tags, "#basketball", "#nbabasketball"].join(" ")]),
    },
  };
}

/** The fields of one platform's words that the guard reads. */
export const wordsOf = (c) => Object.fromEntries(Object.entries(c).filter(([k]) => k !== "facets"));
