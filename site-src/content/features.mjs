import { WEB_APP_LIVE, LAUNCH_ON, LAUNCH_WORDS, passLink, webAppLink, playWords } from "../lib/html.mjs";

// What Free and Pro contain — the app's ONE list, copied word for word from
// the mobile repo's lib/constants/plans.ts (FEATURES, 1.0.6 · Faz 6 · Dalga A).
// The pricing page renders these rows exactly; the front page quotes some of
// them, also exactly. Change the app's list first, then this copy.

export const FEATURES = [
  { label: "Clutch's call on every game, the market beside it, and the top reasons why", free: true, pro: true },
  { label: "Call it: call any game, earn points, levels and titles — plus one Free Pro day a month", free: true, pro: true },
  { label: "The Ledger: every call Clutch makes, graded in public beside the market and ESPN", free: true, pro: true },
  { label: "Sealed before tip ✓: every number in a public record anyone can check", free: true, pro: true },
  { label: "Our worst miss: last night's biggest miss, and what fooled Clutch", free: true, pro: true },
  { label: "Who's out: tonight's injury report, by minutes", free: true, pro: true },
  { label: "What-If: who plays, FLIP IT, and FLIP IT duels with friends", free: true, pro: true },
  { label: "Ask Clutch: questions answered from Clutch's own numbers, no daily limit", free: true, pro: true },
  { label: "Every team's playoff chances, updated nightly", free: true, pro: true },
  { label: "The Time Capsule: seal your season before opening night, scored at the All-Star break against Clutch and the market", free: true, pro: true },
  { label: "Your season: the Scrapbook of nights you beat Clutch, and Your month", free: true, pro: true },
  { label: "Upset call, How sure?, This week, Stat Line and Buzzer beater", free: true, pro: true },
  { label: "Leagues: private leagues with friends", free: true, pro: true },
  { label: "Listen: tonight's games, read aloud", free: true, pro: true },
  { label: "Game video and the Front page: any graded game as a 15-second video or a front page, made on your phone, to share", free: true, pro: true },
  { label: "Close-game alert and the lock screen: your team free, any game on Pro", free: "TEAM", pro: "ALL" },
  { label: "Model only: Clutch's own number before the market, and the games where the two disagree", free: false, pro: true },
  { label: "Projected final, margin and total, beside the market", free: false, pro: true },
  { label: "The full why: every factor weighed, why the number moved, and games like this one", free: false, pro: true },
  { label: "Late-news alerts: a push when a late scratch or the market moves Clutch's call", free: false, pro: true },
  { label: "What happened: every graded game taken apart, and If everyone had played", free: false, pro: true },
  { label: "Your yearbook: your season printed — the season so far any time, the final edition after the Finals", free: false, pro: true },
  { label: "What-If Pro: rest, home court, pace, shooting and turnover nights, minutes limits and playoff intensity, all measured", free: false, pro: true },
  {
    label: "The simulation: tonight's game played 2,000 times on your phone — how often each team wins, the likely final, how the upset happens, every player's range, any What-If played out (ungraded)",
    free: false, pro: true,
  },
  { label: "The season, simulated nightly: seeds, every round and the title, projected wins, the games that swing them", free: false, pro: true },
];

/** The one plan (lib/constants/plans.ts PLAN). Prices are the store's; on the web, Paddle's — the same in US dollars. */
export const PLAN = {
  name: "Clutch Pro",
  line: "For fans who follow every game, not only their team's.",
  monthly: "$9.99",
  annual: "$59.99",
  annualPerMonth: "$5.00",
  trialDays: 7,
};

/** The front page's short lists: rows of FEATURES, quoted exactly. */
export const FRONT_FREE = [0, 1, 2, 5, 6, 8].map((i) => FEATURES[i].label);
export const FRONT_PRO = [16, 17, 18, 19, 23, 24].map((i) => FEATURES[i].label);

/**
 * The questions page (/faq/). The front page used to carry these, the free
 * paper in six cards and the browser-or-iPhone pair; it links here now (owner,
 * 2026-10-27: the phone's first screen, the front page cut to its core).
 */
const IPHONE_EXTRAS = "The iPhone app adds Live Activities on the lock screen, home screen widgets, Siri, iMessage challenges and game videos to share.";
export const FAQ = [
  { q: "What's free?", a: "The whole paper, for good: every game's number with the top reasons behind it, tonight's official injury report by minutes, What-If (change who plays and watch the number move), Ask Clutch, private leagues with friends and every team's playoff chances, updated nightly. Read everything without an account; sign in to keep your calls." },
  { q: "What do points get me?", a: "Levels and titles, from Rookie to Hall of Fame — bragging rights, nothing paid. Points come from your calls and your team's wins; they can't be bought or sold and have no cash value. Separately, everyone signed in gets one Free Pro day a month." },
  { q: "Where does the number come from?", a: "A model trained on past seasons — form, rest, travel and the official injury report — blended with the market's price. How it works shows every piece." },
  { q: "Is Clutch any good?", a: "Look at the Ledger. Every call is there, graded beside the market, ESPN and picking the home team, misses included. Where the sample is too small, it says so." },
  // `link` (optional): a link after the answer (href already escaped for an attribute).
  LAUNCH_ON
    ? { q: "Do I need an iPhone?", a: `No. Everything to follow and call runs in your browser — sign in with Apple or Google and claim your Launch Pass: ${LAUNCH_WORDS}, and the Founding fan stamp for good. ${IPHONE_EXTRAS}`, link: { href: passLink("faq"), label: "Claim your Launch Pass →" } }
    : WEB_APP_LIVE
      ? { q: "Do I need an iPhone?", a: `No. Everything to follow and call runs in your browser. ${IPHONE_EXTRAS}`, link: { href: webAppLink("faq"), label: playWords() } }
      : { q: "Do I need an iPhone?", a: "Today, to make calls, yes: Clutch is an iPhone app. The browser version opens this October, with the same paper and the same calls. Every number is on this site already." },
  ...(WEB_APP_LIVE ? [{ q: "Is it one account on the web and on iPhone?", a: "Yes. One account everywhere: sign in the same way on both, and Pro bought on one carries over to the other." }] : []),
  { q: "What does Pro add?", a: "Model only — Clutch's own number before the market — the projected final, every factor, late-news alerts and the simulation." },
  { q: "Can I cancel?", a: "Any time. Pro runs to the end of the period you paid for, and the 7-day free trial on the yearly plan costs nothing if you cancel before it ends (on iPhone, at least 24 hours before)." },
];
