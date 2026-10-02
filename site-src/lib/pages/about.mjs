// How it works (the app's Methodology, app/methodology.tsx, with the numbers
// from the free model/accuracy snapshot), Pricing (FEATURES, word for word),
// the legal pages and Support. (Win Totals' official rules live on the
// GitHub Pages site the App Store links to, not on this domain.)

import { page, esc, prose, APP_STORE, ORIGIN, PLAY, PLAY_PRO, WEB_APP_LIVE } from "../html.mjs";
import { FEATURES, PLAN } from "../../content/features.mjs";
import { TERMS, PRIVACY, REFUNDS, SUPPORT, SUPPORT_EMAIL, OPERATOR, PADDLE_BUYER_TERMS } from "../../content/legal.mjs";
import { mediumDate } from "../time.mjs";

const b3 = (x) => (x == null ? "—" : x.toFixed(3));
/** "2012-13..2025-26" → "2012–13 to 2025–26". */
const seasonSpan = (s) => String(s ?? "").replace(/(\d{4})-(\d{2})/g, "$1–$2").replace("..", " to ");
const signed4 = (x) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(4)}`;

function benchmark(season, b) {
  const rows = [["Clutch's call", "clutch", true], ["Model only", "model", false], ["The market · final price", "market", false], ["ESPN BPI", "espn_bpi", false], ["Always the home team", "always_home", false]];
  const vsE = b.diffs_brier?.clutch_vs_espn, vsC = b.diffs_brier?.clutch_vs_market;
  return `<div class="panel"><div class="cmp-h"><span class="t">${esc(season)}</span><span class="mono">${b.n.toLocaleString("en-US")} GAMES</span></div>
<div class="scroll"><table class="tbl"><thead><tr><th scope="col">NUMBER</th><th scope="col" class="num">ACCURACY SCORE</th><th scope="col" class="num">RIGHT</th></tr></thead><tbody>
${rows.map(([l, k, lead]) => `<tr><td${lead ? ' class="amber"' : ""}>${l}</td><td class="num${lead ? " amber" : ""}">${b3(b.tracks?.[k]?.brier)}</td><td class="num">${b.tracks?.[k]?.acc != null ? (b.tracks[k].acc * 100).toFixed(1) + "%" : "—"}</td></tr>`).join("")}
</tbody></table></div>
${vsE ? `<p class="note gap">Clutch vs ESPN ${signed4(vsE[0])} (likely range ${signed4(vsE[1])} to ${signed4(vsE[2])})${vsC ? ` · Clutch vs the market ${signed4(vsC[0])} (${signed4(vsC[1])} to ${signed4(vsC[2])})` : ""}. Lower is better.</p>` : ""}</div>`;
}

export function howPage(m) {
  const a = m.accuracy ?? {};
  const bench = a.benchmark ?? {};
  const seasons = Object.keys(bench).sort().reverse();
  const ti = a.training_info ?? {};
  const pre = a.preseason ?? null;
  const blend = a.blend ?? null;
  const pctW = (w) => (w == null ? "—" : `${Math.round(Math.max(0, w) * 100)}%`);
  const sections = [
    ["1. What it knows, and when", "Every NBA game since 2000 is replayed in date order, and each one is described using only what was known that morning: each team's margin this season (leaning on last season's until about ten games are in), a long-run Elo rating, the last ten games against the season, rest, back-to-backs and three-in-fours, travel, altitude, a neutral floor, and the league's official injury report — each listed player weighted by how likely his status keeps him out and what he has been worth. Nothing from later in a season can reach an earlier game."],
    ["2. The model", `A regularised logistic regression on ${ti.features_count ?? 17} inputs, fit on the last ${ti.seasons?.length || 10} seasons${ti.training_samples ? ` (${ti.training_samples.toLocaleString("en-US")} games)` : ""}. It beat gradient-boosted trees in Clutch's own tests and needs no separate adjustment step. Because it is linear in log-odds, the "Why" behind every number is exact: the reasons add up to the number.`],
    ["3. Clutch's call", `When the market has a number for the game, Clutch's call weighs Model only against the market's price, read as a fair probability (both sides adding up to 100%). The weights were fit on three seasons of market prices: just before tip the market carries nearly everything (Model only ${pctW(blend?.at_close?.w_model)}), because by then it has already priced the same injury news and more; a day out, Model only carries ${pctW(blend?.at_open?.w_model)}. With no market number, Clutch's call is Model only. Both parts are graded separately on the Ledger.`],
    ["4. Score and total", "The projected margin is read off the probability through the market's own relation between a margin and a win chance, so the score can never name a different winner than the number. The total follows the market's when there is one (Clutch's own has not beaten it) and Clutch's scoring model otherwise. Both are in Pro."],
    ["5. Weekly refit, behind a gate", "Every Monday the model is refit with the week's games. The new fit replaces the old only if, on the most recent 250 graded games, a copy trained without them scores no worse — otherwise the old model stays. The call for each game is sealed before tip-off."],
    ["6. Sealed before tip", "Before each game tips, its number goes into a public file on GitHub with a SHA-256 seal; after the final, the Ledger grades the number in that file. Anyone can check a seal with tools that come with their computer."],
  ];
  const limits = [
    ["It is level with the market, not ahead of it", "Matching the market's final price is the ceiling for anyone publishing numbers, and that is where Clutch is. Where Model only disagrees with the market, the Ledger shows who turned out right."],
    ["Margins and totals are projections, not calls", "Clutch's margin comes from its probability and its total follows the market's, so neither is an argument with the market. Clutch makes no calls on margins or totals."],
    ["Preseason is close to a coin flip", pre ? `Across ${pre.n.toLocaleString("en-US")} preseason games (${seasonSpan(pre.seasons)}) the regular-season model scored ${pre.brier_raw_model.toFixed(3)} — worse than a coin flip's 0.250 — because starters rest. Pulled toward 50/50 it scored ${pre.brier_shrunk_loso.toFixed(3)}. So preseason numbers stay near 50/50, carry a label, and are never graded.` : "Starters rest and rotations are experiments, so preseason numbers stay near 50/50, carry a label, and are never graded."],
    ["Early season and playoffs are harder", "In the first two weeks each team's rating still leans on last season, and roster changes it hasn't seen yet cost it — ESPN's preseason projections were better early in 2025-26. The playoffs offer far fewer games to learn from. The game page says so on the games it applies to."],
  ];
  const body = `<div class="wrap r"><div class="rhead"><span class="kick">HOW IT WORKS</span><h1 class="rh1">How Clutch's call is made.</h1><p class="rdeck">In plain English, with the test it had to pass. Live performance is the Ledger's — never this backtest.</p></div>
<div class="body">
<section class="blk" aria-labelledby="test"><h2 id="test">The test it had to pass</h2><p>Two full seasons, replayed month by month: every game predicted by a model fit only on the games before it, then graded on the same games as ESPN's BPI and the market's final price before tip. The accuracy score (the Brier score) grades the probability itself — lower is better, and 0.250 is a coin flip. Each difference comes with its likely range: where it lands 95 times in 100 when the same games are resampled.</p></section>
${seasons.length ? seasons.map((s) => benchmark(s, bench[s])).join("") : '<p class="note">The benchmark loads with the model\'s record.</p>'}
<section class="blk"><p>Read it plainly: Clutch's call has been more accurate than ESPN's and level with the market's final price — as good as the market, not better. Model only is level with ESPN. Nobody publishing an NBA model reliably beats the market, and Clutch doesn't claim to.</p></section>
${sections.map(([h, p]) => `<section class="blk"><h2>${esc(h)}</h2><p>${esc(p)}</p></section>`).join("")}
<section aria-labelledby="limits"><h2 class="sh" id="limits">What this model cannot do</h2>${limits.map(([h, p]) => `<div class="blk gap"><h2>${esc(h)}</h2><p>${esc(p)}</p></div>`).join("")}</section>
<section class="blk"><h2>What's free, what's Pro</h2><p>Free shows Clutch's call, the market's number and the top three reasons for every game, who's out, and the Ledger. Pro shows all of it: every factor and how much of the call it carries, Model only — the number before the market — the projected final, and the simulation. <a href="/pricing/">Pricing →</a></p></section>
<p class="note">Past performance does not guarantee future results. Predictions are analytics for information and entertainment, not advice to spend money on a game. Model performance varies by sample size and league conditions.${ti.trained_at ? ` Model fit ${esc(mediumDate(ti.trained_at.slice(0, 10)))} on games through ${esc(mediumDate(ti.through))}.` : ""}</p>
</div></div>`;
  const desc = "How Clutch's NBA win probability is made: what the model knows, how it blends with the market, the two-season test against ESPN BPI and the market, and what it cannot do.";
  return { path: "/how-it-works/", title: "How it works: the model, the test, the limits · Clutch", html: page({ path: "/how-it-works/", title: "How it works: the model, the test, the limits · Clutch", description: desc, body, current: "how", og: "default" }) };
}

export function pricingPage() {
  const cell = (v) => (v === true ? '<td class="c y">✓</td>' : v === false ? '<td class="c n">—</td>' : `<td class="c">${esc(v)}</td>`);
  const free = FEATURES.filter((f) => f.free !== false);
  const pro = FEATURES.filter((f) => f.free === false);
  const rows = `<tr class="grp"><td colspan="3">Free, and free for good</td></tr>${free.map((f) => `<tr><td>${esc(f.label)}</td>${cell(f.free)}${cell(f.pro)}</tr>`).join("")}<tr class="grp"><td colspan="3">Pro — every game, all the way through</td></tr>${pro.map((f) => `<tr><td>${esc(f.label)}</td>${cell(f.free)}${cell(f.pro)}</tr>`).join("")}`;
  const body = `<div class="wrap"><div class="rhead"><span class="kick">PRICING</span><h1 class="rh1">Free for good. Pro when you want the whole lab.</h1><p class="rdeck">Clutch's call on every game, the market beside it, the top reasons, calls and points, and the public Ledger are free, and stay free. ${esc(PLAN.name)} is one plan: ${esc(PLAN.line.toLowerCase())}</p></div>
<div class="body">
<div class="plans">
<div class="plan"><h2 class="side-h">Free</h2><div class="price"><span class="d">$0</span><span>for good · no card · sign in to keep your calls</span></div><ul><li>Every game's number, the market's beside it, and the top three reasons</li><li>Call any game for points; every level is a Free Pro day</li><li>The Ledger and the receipts, for everyone</li></ul><a class="btn ghost" href="${PLAY}">${WEB_APP_LIVE ? "Play free in your browser" : "Get the free iPhone app"}</a></div>
<div class="plan pro"><span class="tag">${PLAN.trialDays} DAYS FREE ON ANNUAL</span><h2 class="side-h">${esc(PLAN.name)}</h2><div class="price"><span class="d amber">${PLAN.monthly}</span><span>a month</span></div><div class="price"><span class="d amber">${PLAN.annual}</span><span>a year — ${PLAN.annualPerMonth} a month, ${PLAN.trialDays} days free the first time</span></div><ul><li>Model only, the projected final and every factor</li><li>Late-news alerts and every close game</li><li>The simulation, and the season simulated nightly</li></ul><a class="btn" href="${PLAY_PRO}">Try Pro free for ${PLAN.trialDays} days${WEB_APP_LIVE ? "" : " on iPhone"}</a></div>
</div>
<section aria-labelledby="all"><h2 class="sh" id="all">Everything in Free and Pro</h2><div class="scroll"><table class="ftable"><thead><tr><th scope="col">What you get</th><th scope="col" class="c">Free</th><th scope="col" class="c">Pro</th></tr></thead><tbody>${rows}</tbody></table></div></section>
<section class="blk" aria-labelledby="bill"><h2 id="bill">Billing, plainly</h2>
<p>Prices are in US dollars; local tax may be added at checkout. In the iPhone app ${esc(PLAN.name)} is sold by Apple, and the App Store shows its price in your currency. On the web${WEB_APP_LIVE ? "" : " (opening this October)"}, it is sold by Paddle.com, our reseller and merchant of record, which takes the payment, handles tax and sends the receipt.</p>
<p>A subscription renews automatically at the end of each month or year until you cancel. Cancel any time — Pro runs to the end of the period you paid for. The yearly plan's ${PLAN.trialDays}-day trial is free the first time; cancel before the trial ends (on iPhone, at least 24 hours before) and you are not charged.</p>
<p>Refunds: on the web, a full refund within 14 days of a purchase or a renewal, on request — see the <a href="/refunds/">Refund Policy</a>. App Store purchases are refunded by Apple at reportaproblem.apple.com. Pro for 24 hours, a one-off pass, is sold only in the iPhone app.</p>
<p>${WEB_APP_LIVE ? "One account everywhere: Pro bought on the web opens in the iPhone app with the same account, and the other way round." : "When the web version opens, one account works everywhere: Pro bought on the web opens in the iPhone app with the same account, and the other way round."} Clutch is operated by ${esc(OPERATOR)}. Questions: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p></section>
<p class="note">No deposits and no cash prizes: Pro is analytics, and nothing bought changes a call or a point. <a href="/terms/">Terms</a> · <a href="/privacy/">Privacy</a> · <a href="/refunds/">Refunds</a></p>
</div></div>`;
  const desc = `Clutch is free for good: every NBA game's number, the market, the top reasons and the Ledger. Clutch Pro is ${PLAN.monthly} a month or ${PLAN.annual} a year with a ${PLAN.trialDays}-day free trial.`;
  const ld = { "@context": "https://schema.org", "@type": "Product", name: PLAN.name, description: desc, brand: { "@type": "Brand", name: "Clutch" }, url: ORIGIN + "/pricing/", offers: [{ "@type": "Offer", name: "Monthly", price: "9.99", priceCurrency: "USD", url: ORIGIN + "/pricing/" }, { "@type": "Offer", name: "Yearly", price: "59.99", priceCurrency: "USD", url: ORIGIN + "/pricing/" }] };
  return { path: "/pricing/", title: "Pricing: Free for good, Clutch Pro $9.99 a month · Clutch", html: page({ path: "/pricing/", title: "Pricing: Free for good, Clutch Pro $9.99 a month · Clutch", description: desc, body, current: "pricing", og: "pricing", jsonld: ld }) };
}

/** A legal or help page from its sections. */
function legalPage(doc, { path, title, description, kick }) {
  const secs = doc.sections.map((s, i) => `<h2><span>${String(i + 1).padStart(2, "0")}</span>${esc(s.title)}</h2>
${prose(s.body, { email: SUPPORT_EMAIL })}${s.link ? `<p class="lk"><a href="${s.link.href}">${esc(s.link.label)}</a></p>` : ""}`).join("\n");
  const body = `<div class="wrap r"><div class="rhead"><span class="kick">${esc(kick)} · LAST UPDATED ${esc(doc.updated.toUpperCase())}</span><h1 class="rh1">${esc(doc.title)}</h1><p class="rdeck">${esc(doc.intro)}</p></div>
<div class="body legal"><div>${secs}</div></div></div>`;
  return { path, title, html: page({ path, title, description, body, og: "default" }) };
}

export const termsPage = () => legalPage(TERMS, { path: "/terms/", title: "Terms of Use · Clutch", description: `The terms for using Clutch, the NBA analytics app and website operated by ${OPERATOR}: points, contests, subscriptions in the app and on the web, and fair use.`, kick: "TERMS" });
export const privacyPage = () => legalPage(PRIVACY, { path: "/privacy/", title: "Privacy Policy · Clutch", description: "What Clutch collects when you sign in or use a feature that needs an account, why, and who else handles it — including Paddle for web purchases.", kick: "PRIVACY" });
export const refundsPage = () => legalPage(REFUNDS, { path: "/refunds/", title: "Refund Policy · Clutch", description: "Refunds for Clutch Pro: a full refund within 14 days of a web purchase or renewal, on request; App Store purchases are refunded by Apple.", kick: "REFUNDS" });
export const supportPage = () => legalPage(SUPPORT, { path: "/support/", title: "Support · Clutch", description: "Cancel or restore Clutch Pro, get a refund, delete your account, fix alerts — and how to reach us.", kick: "SUPPORT" });

export { PADDLE_BUYER_TERMS };
