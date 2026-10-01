// What Free and Pro contain — the app's ONE list, copied word for word from
// the mobile repo's lib/constants/plans.ts (FEATURES, 1.0.6 · Faz 6 · Dalga A).
// The pricing page renders these rows exactly; the front page quotes some of
// them, also exactly. Change the app's list first, then this copy.

export const FEATURES = [
  { label: "Clutch's call on every game, the market beside it, and the top reasons why", free: true, pro: true },
  { label: "Call it: call any game, earn points and levels — every level is a Free Pro day", free: true, pro: true },
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

/** The free paper, in six (front page). Each line names something the free app does today. */
export const FREE_CARDS = [
  { mark: "?", title: "The why", body: "The top reasons behind every number, in plain words — never just a percentage." },
  { mark: "!", title: "Who's out", body: "Tonight's official injury report, by minutes." },
  { mark: "~", title: "What-If", body: "Change who plays and watch the number move. FLIP IT, and FLIP IT duels with friends." },
  { mark: "/", title: "Ask Clutch", body: "Ask anything about tonight. Answers come from Clutch's own numbers, no daily limit." },
  { mark: "#", title: "Leagues", body: "Private leagues with friends. Who beat Clutch most this week?" },
  { mark: "%", title: "Playoff chances", body: "Every team's chances, updated every night of the season." },
];

export const FAQ = [
  { q: "Can I win money?", a: "No. Clutch is analytics for fans: no deposit, no cash prize, nothing to pay out. Points and levels earn Free Pro days, and the free contests award Pro time, never money." },
  { q: "Where does the number come from?", a: "A model trained on past seasons — form, rest, travel and the official injury report — blended with the market's price, the bookmaker's cut taken out. How it works shows every piece." },
  { q: "Is Clutch any good?", a: "Look at the Ledger. Every call is there, graded beside the market, ESPN and picking the home team, misses included. Where the sample is too small, it says so." },
  { q: "Do I need an iPhone?", a: "No. Everything to follow and call runs in your browser. The iPhone app adds the lock screen, widgets and Siri." },
  { q: "What does Pro add?", a: "Model only — Clutch's own number before the market — the projected final, every factor, late-news alerts and the simulation." },
  { q: "Can I cancel?", a: "Any time. Pro runs to the end of the period you paid for, and the 7-day free trial on the yearly plan costs nothing if you cancel before it ends." },
];
