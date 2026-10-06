// The legal pages and Support — the app's own copy (mobile repo app/terms.tsx,
// app/privacy-policy.tsx, lib/wintotals/rules.ts, October 1, 2026), the same
// words as the root terms.html / privacy.html App Store Connect links to,
// plus what only the web needs: who operates Clutch, Paddle as the web's
// merchant of record, this website itself, and (Privacy) your rights and how
// long things are kept. Approved by the owner in chat 9 (2026-10-01): the
// operator line, the 14-day refund, replies within 48 hours. Nothing here may
// carry a draft or todo marker: the build fails on one.
//
// Terms differ from the app on purpose since October 6, 2026 (Paddle's domain
// review): "the market's number" for comparison (the app never shows a line),
// and contests are named iPhone-only — the web app hides Win Totals
// (mobile lib/wintotals/offered.ts). The app's Terms catch up in 1.0.8.
//
// A body is plain text: "\n" separates paragraphs, a line starting "• " is
// a list item. The support e-mail and https links become links when rendered.

import { WIN_TOTALS_RULES_URL } from "../lib/html.mjs";

export const SUPPORT_EMAIL = "uguraltunbasai@gmail.com";
export const OPERATOR = "Uğur Altunbaş";
export const LEGAL_UPDATED = "October 2, 2026";
export const PADDLE_BUYER_TERMS = "https://www.paddle.com/legal/checkout-buyer-terms";

export const TERMS = {
  title: "Terms",
  updated: "October 6, 2026",
  intro: "By using Clutch you agree to these terms. They are short on purpose.",
  sections: [
    { title: "What Clutch is", body: "An NBA analytics app: a model's win probabilities, the reasoning behind them, and a public record of every call it has made. Predictions are estimates, not guarantees, and the record shows how often they have been wrong." },
    { title: "Who runs Clutch", body: `Clutch — the iPhone app, the web app at app.clutchledger.com and this website — is made and operated by ${OPERATOR}, a sole proprietor. "We" and "Clutch" in these terms mean him. Contact: ${SUPPORT_EMAIL}.` },
    { title: "Analytics, not a wagering service", body: "Clutch does not take bets, process wagers or pay out money, and nothing in it is advice to gamble. Where Clutch shows the market's number, it is there for comparison. You are responsible for following the law where you live." },
    { title: "Points", body: "Points are earned only by playing — your calls, the daily games, the Time Capsule and Win Totals — and when your favourite team wins a regular-season or playoff game. They only go up: they are never spent, cannot be bought, sold, transferred or exchanged for money, and have no cash value. Every level you reach earns a Free Pro day (24 hours of Pro at no charge), used when you choose, at most one a week. We may change how points are earned, and points earned by abusing the app may be removed. Your favourite team can be changed once per NBA season, and a call counts only for games that start at least 12 hours after it." },
    { title: "Accounts", body: "You must be 13 or older. Keep your sign-in to yourself; you are responsible for what happens on your account." },
    {
      title: "Names, leagues and conduct",
      body:
        "Some of what you choose is seen by other people: your display name and username, as your leagues show them, and the names of leagues you start. Keep them clean.\n" +
        "• We have zero tolerance for objectionable content — slurs, hateful, sexual or violent names, harassment — and for abusive users.\n" +
        "• We filter names automatically, review every report within 24 hours, and remove offending names and leagues and the accounts behind them.\n" +
        "• To report a name, open the league: Members › Report, or Report the league's name. You can leave any league at any time; a league's owner can remove a member, who then can't rejoin it.\n" +
        `• Questions, or a name we missed: write to ${SUPPORT_EMAIL} (Contact, below).`,
    },
    {
      title: "Contests",
      body: "Clutch runs free contests inside the iPhone app only — they are not offered on the web: Win Totals, part two of the Time Capsule. They are free to enter, need no purchase, and nothing bought improves anyone's chances. Their prizes are Pro time inside Clutch: no cash value, not transferable, and not exchangeable for money. Apple is not a sponsor of any Clutch contest and is not involved in them. Each contest has official rules, which apply alongside these terms. Points themselves are not prizes: they are never paid out.",
      link: { href: WIN_TOTALS_RULES_URL, label: "Win Totals official rules →" },
    },
    {
      title: "Subscriptions and passes",
      body:
        "In the iPhone app:\n" +
        "• Clutch Pro is an auto-renewable subscription sold through Apple, monthly or yearly. Elite, an earlier plan no longer sold, keeps renewing for anyone who holds it and includes everything in Pro.\n" +
        "• Pro for 24 hours is a single purchase: everything in Pro for 24 hours from when it opens. It does not renew. If Apple refunds it, it ends.\n" +
        "• A Free Pro day (see Points) is 24 hours of Pro at no charge; it does not renew.\n" +
        "• Pro won in a contest (see Contests) runs for the time won and does not renew; a refund of anything else never takes it back.\n" +
        "• You can buy or restore without an account; sign in with Apple to keep your plan on every device.\n" +
        "• Payment is charged to your Apple ID at confirmation.\n" +
        "• A subscription renews automatically unless it is cancelled at least 24 hours before the end of the period; manage or cancel it in Settings › Apple ID › Subscriptions.\n" +
        "• Refunds are handled by Apple under Apple's policies.",
    },
    {
      title: "Buying on the web",
      body:
        "• On the web (app.clutchledger.com), Clutch Pro is sold monthly ($9.99) or yearly ($59.99, with 7 days free the first time) by Paddle.com, our reseller and merchant of record. Paddle takes the payment, handles sales tax and VAT and sends the receipt, and Paddle's buyer terms apply to the purchase alongside these terms.\n" +
        "• A web subscription renews automatically at the end of each period until you cancel it. You can cancel any time; Pro runs to the end of the period you paid for. A trial cancelled before it ends is never charged.\n" +
        "• Refunds for web purchases: see the Refund Policy. Pro for 24 hours is sold only in the iPhone app.\n" +
        "• One account everywhere: Pro bought on the web opens in the iPhone app when you sign in with the same account, and the other way round.",
      link: { href: "/refunds/", label: "Refund Policy →" },
    },
    { title: "Fair use", body: "Don't use the app unlawfully, scrape or reverse-engineer its data or models, automate it, or try to get around its limits." },
    { title: "Ownership", body: "The app, its predictions and analysis belong to Clutch. NBA team names and marks belong to their owners; Clutch is not affiliated with or endorsed by the NBA." },
    { title: "No warranty", body: "The app is provided as is. We don't promise it is accurate, uninterrupted or error-free, and we are not liable for losses from decisions you make using it." },
    { title: "Changes and ending", body: "We may update these terms (the date above changes) or suspend accounts that break them. You can stop using Clutch and delete your account at any time." },
    { title: "Contact", body: `${SUPPORT_EMAIL} · Clutch is operated by ${OPERATOR}.` },
  ],
};

export const PRIVACY = {
  title: "Privacy",
  updated: LEGAL_UPDATED,
  intro: "Clutch is an NBA analytics app. You can read every page without an account. This policy says what we collect when you do sign in or use a feature that needs one, why, and who else touches it.",
  sections: [
    {
      title: "What we collect",
      body:
        "• Account: the identifier and e-mail address from Sign in with Apple or Google (Apple lets you hide your address), and a display name. If you buy or restore a plan without signing in, we create an anonymous guest account on this phone so the plan can be delivered; it holds no name or e-mail.\n" +
        "• Your choices: a favourite team, notification settings, Appearance (Dark/Light), the calls you make on the Play tab with how they were graded and how sure you said you were, your Stat Line results, your upset calls, your Time Capsule calls, your Win Totals sheet (see Win Totals, below), the leagues you create or join, your points and Buzzer beater shots.\n" +
        "• Reports: if you report a league name or a member's name, we keep the report (who reported, the name reported, the reason) for 180 days to review it; a reported member's name is removed from it if they delete their account.\n" +
        "• Device: a push token when you switch alerts on, device model and OS version.\n" +
        "• Usage: which screens you open and which features you tap, without the content of what you read.\n" +
        "• Purchases: your subscription status, from Apple via RevenueCat. We never see card details.",
    },
    {
      title: "Buying on the web",
      body: "Purchases on the web are processed by Paddle.com, our merchant of record. Paddle collects what it needs to take the payment and handle tax — your payment details, e-mail and billing country — under its own privacy notice. We receive the subscription's status and the e-mail on the order, through RevenueCat; we never see card details.",
    },
    { title: "Why", body: "To run the features you use — keep your team, send the alerts you asked for, grade your calls, open what your plan or a Free Pro day includes. To find out which parts of the app work and which don't. To fix crashes." },
    {
      title: "Who else handles it",
      body:
        "• Supabase — accounts and database (stored with encryption at rest and in transit; row-level security keeps your rows yours).\n" +
        "• RevenueCat — subscription status.\n" +
        "• Apple and Google — sign-in; Apple — payments in the iPhone app.\n" +
        "• Paddle — payments on the web (merchant of record).\n" +
        "• Expo — delivers push notifications.\n" +
        "• PostHog — product analytics.\n" +
        "• Sentry — crash reports.\n" +
        "• Cloudflare — serves this website.\n" +
        "We don't sell personal information. The only readers who see anything of yours are the members of a league you join: your display name, your standing and your calls in that league. Nothing else you do in the app is shown to other readers, except the Win Totals crowd split — a daily count of everyone's picks, never whose (see Win Totals).",
    },
    {
      title: "Win Totals",
      body:
        "• What we keep: your sheet — your Over or Under on each team, your three stars and your tie-break — when you saved it, and after the season your score, your place and any prize.\n" +
        "• What for: only to run the contest — ranking the sheets, granting the prizes and your leagues' tables.\n" +
        "• Who sees it: before opening tip, other readers see only how the crowd split on each team — a daily count across all readers, once 20 have picked the team, never whose picks — and, in your leagues, whether you have sealed. From opening tip, your leagues see your score. Your picks themselves are never shown to anyone else.\n" +
        "• As a guest: a sheet you make without an account stays on this phone until it is on an account; nothing of it reaches us before then.\n" +
        "• Deleting your account deletes your sheet, your result and any prize with it.",
    },
    { title: "Made on your phone", body: "Game video, your yearbook (PDF) and the Front page (a share image) are made on your iPhone; nothing is sent to us to make them. A video or a yearbook leaves your phone only if you share or save it. Saving a video asks for permission to add to your Photos, and nothing is read from them." },
    { title: "This website", body: "clutchledger.com sets no cookies and runs no analytics or advertising. To show tonight's live scores your browser asks our database (Supabase) for them directly; Cloudflare, which serves the pages, keeps standard request logs." },
    { title: "Your choices", body: "Alerts can be switched off in the app or in iOS Settings. You can delete your account from the You tab; that removes your profile, team, alert settings, calls, capsule, Win Totals sheet and points, and — if you signed in with Apple — revokes Clutch's access to your Apple ID. Subscriptions are not cancelled by deleting the account: one bought in the iPhone app is managed by Apple; one bought on the web is cancelled in the web app under You › Subscription, or from the link in Paddle's receipt e-mail (or write to us and we cancel it for you)." },
    {
      title: "Your rights",
      body: `You can see, correct or delete what Clutch holds about you. Most of it is on the You tab, and deleting your account there removes it. To ask for a copy of your data, a correction, or anything the app can't do for you, write to ${SUPPORT_EMAIL}; we answer within 48 hours. Depending on where you live (for example the EU, the UK or California) these are your rights by law, and you can also complain to your data protection authority.`,
    },
    {
      title: "How long we keep it",
      body: "Your account and everything on it are kept while you have an account, and deleted when you delete it. Reports are kept for 180 days (see What we collect). Crash reports and usage events are kept by Sentry and PostHog under their own retention limits. Records of purchases are kept by Apple, Paddle and RevenueCat as the law requires them to.",
    },
    { title: "Children", body: "Clutch is not directed to anyone under 13, and we don't knowingly collect their information." },
    { title: "Changes", body: "If this policy changes, the new version is posted here with a new date." },
    { title: "Contact", body: `${SUPPORT_EMAIL} · Clutch is operated by ${OPERATOR}.` },
  ],
};

/** Approved by the owner (chat 9): a full refund within 14 days of a web purchase or renewal; replies within 48 hours. */
export const REFUNDS = {
  title: "Refund Policy",
  updated: LEGAL_UPDATED,
  intro: "How refunds work for Clutch Pro, wherever you bought it. Short, like the rest.",
  sections: [
    {
      title: "Bought on the web",
      body:
        "Clutch Pro bought at app.clutchledger.com is sold by Paddle.com, our reseller and merchant of record, and refunds follow Paddle's buyer terms.\n" +
        `On top of them: if you ask within 14 days of a purchase or of a renewal, you get a full refund of that payment. Write to ${SUPPORT_EMAIL} from the e-mail address on the order, or include the order number from Paddle's receipt, and we ask Paddle to refund it. The money goes back to the card or account you paid with; how long it takes to show depends on your bank.\n` +
        "A refunded payment ends the Pro it paid for.",
      link: { href: PADDLE_BUYER_TERMS, label: "Paddle's buyer terms →" },
    },
    { title: "The free trial", body: "The yearly plan starts with 7 days free the first time. Cancel before the trial ends (on iPhone, at least 24 hours before) and you are not charged." },
    { title: "Cancelling", body: "You can cancel a subscription any time. It stops renewing, and Pro runs to the end of the period you paid for. Cancelling on its own doesn't refund the current period — ask within 14 days (above) if you want that." },
    { title: "Bought in the iPhone app", body: "Purchases made in the iPhone app are sold and refunded by Apple, under Apple's policies — we can't refund them ourselves. Ask Apple at reportaproblem.apple.com, or in Settings › your name › Media & Purchases.", link: { href: "https://reportaproblem.apple.com", label: "reportaproblem.apple.com →" } },
    { title: "Free Pro time", body: "Free Pro days earned with points and Pro won in a contest cost nothing and have no cash value, so there is nothing to refund; a refund of a purchase never takes them back." },
    { title: "Contact", body: `${SUPPORT_EMAIL} — we answer within 48 hours. Clutch is operated by ${OPERATOR}.` },
  ],
};

export const SUPPORT = {
  title: "Support",
  updated: LEGAL_UPDATED,
  intro: "Answers to the questions people actually ask. Anything else: write to us.",
  sections: [
    { title: "Cancel a subscription", body: "Bought in the iPhone app: Settings › your name › Subscriptions › Clutch › Cancel. Those subscriptions are managed by Apple, not inside the app.\nBought on the web: in the web app under You › Subscription, or from the link in Paddle's receipt e-mail — or write to us and we cancel it for you. Either way, Pro runs to the end of the period you paid for." },
    { title: "Get a refund", body: "Web purchases: a full refund within 14 days of a purchase or renewal — see the Refund Policy. iPhone purchases: Apple handles refunds at reportaproblem.apple.com.", link: { href: "/refunds/", label: "Refund Policy →" } },
    { title: "Restore a purchase", body: "In the iPhone app: You › Restore purchases, signed in with the same account you bought with. On the web: sign in with the same account; Pro follows the account." },
    { title: "Delete your account", body: "Open the app › You › Delete account. It removes your profile, team, alert settings, calls, capsule, Win Totals sheet and points. You can also e-mail us to ask." },
    { title: "Alerts don't arrive", body: "Check iPhone Settings › Notifications › Clutch, then the app's You › Notifications. The app shows a notice when iOS has them switched off. Alerts arrive in the iPhone app, not in the browser." },
    { title: "Why is the record not better than picking the home team?", body: "When it isn't, the Ledger says so: it prints what is true. Every call is timestamped and sealed before tip-off and graded after the final, wins and misses alike, beside the market, ESPN and picking the home team." },
    { title: "Points and Free Pro days", body: "Points are earned by playing — calls, Stat Line, the Time Capsule, Win Totals — and when your favourite team wins. They are never bought and never paid out. Every level earns a Free Pro day: 24 hours of Pro at no charge, used when you choose, at most one a week." },
    { title: "Report a bug", body: "E-mail us with what happened, your device and browser or iOS version. A screenshot helps." },
    { title: "Contact", body: `${SUPPORT_EMAIL} — we answer within 48 hours. Clutch is operated by ${OPERATOR}.` },
  ],
};

/** lib/wintotals/rules.ts, word for word (RULES_UPDATED October 1, 2026). */
export const WIN_TOTALS_RULES = {
  title: "Win Totals official rules",
  updated: "October 1, 2026",
  intro: "The official rules of Win Totals 2026-27, part two of the Time Capsule in the Clutch app. Win Totals is run by the makers of Clutch. Entering means you accept these rules and Clutch's Terms.",
  sections: [
    { title: "Free to enter", body: "Win Totals is free. No purchase or payment of any kind is needed to enter or to win, and buying anything in Clutch does not improve your chances: nothing bought changes a pick, a line or a score. Clutch's season projections are free for everyone until opening tip (the lock); the Machine's picks open at the lock, for everyone. After opening tip, Pro also shows the season simulation's chance on each line — by then no pick can change." },
    { title: "Apple is not involved", body: "Apple is not a sponsor of Win Totals and is not involved in it in any way. Questions about the contest go to Clutch (Contact, below), not to Apple." },
    { title: "Who can enter", body: "Anyone with a Clutch account signed in with Apple, created before opening tip. You can make picks as a guest, but a guest sheet can't enter or win until it is on an account. One entry per person and per account: entries from several accounts belonging to one person are all void. You must be 13 or older to use Clutch (Terms). Where the law doesn't allow a free contest like this one, entries from there are void." },
    { title: "Your entry", body: "Pick Over or Under for all 30 teams' regular-season win totals, star three of your picks (a right star counts double), and answer the tie-break: the most wins by any team this regular season (0 to 82). Your sheet is saved as you go, and you can change anything until opening tip; what is saved at opening tip is your entry. Only a complete sheet (30 picks, 3 stars and the tie-break) is ranked. Your first complete sheet earns 20 points." },
    { title: "How the lines are set", body: "Each team's line is the market consensus season win total — labelled \"Market consensus\" with its date under the board — set before the contest and frozen at opening tip. Every line ends in .5, so over a full 82-game season no team can finish exactly on its line. Everyone plays the same thirty lines. The lines are for comparison only: Clutch takes no bets and nothing in it is advice to gamble." },
    { title: "Opening tip (the lock)", body: "Win Totals lock at the first tip of the 2026-27 regular season (scheduled for October 20, 2026; if the league moves it earlier, the lock moves with it). After opening tip no pick, star or tie-break can change. The Machine — Clutch's season simulation, sealed at opening tip — then shows its side of every line, and every team's pace is tracked through the season." },
    { title: "Scoring", body: "After the regular season, each pick is right when the team's final wins land on its side of the line. A right pick scores 1 point, and a right star counts double (2 points), so the most anyone can score is 33. A team that plays fewer than 82 games (a game postponed and never made up) is graded on its winning percentage times 82; if that lands exactly on its line, every pick on that team counts as right (a starred one double). Standings shown during the season are provisional: they count a pick as right while its team is on pace." },
    { title: "Ranking and ties", body: "Complete sheets are ranked by score. A tie on score goes to the tie-break answer closest to the most wins by any team; if that ties too, to whoever made their last change earliest." },
    { title: "Prizes", body: "• 1st place: 12 months of Pro.\n• 2nd and 3rd place: 6 months of Pro.\n• 30 of 30 right: Pro for life (for as long as Clutch offers Pro).\n• 22 or more right: 250 points (one level, which is a Free Pro day).\nA winner receives the best Pro prize they qualify for, and every prize winner also gets the 250 points. Months of Pro run from the day they are granted; if you already hold Pro time won in Clutch, your Pro runs to whichever end date is later — the two are not added together. Prizes are Pro time inside the Clutch app only: they have no cash value and cannot be transferred, sold, or exchanged for money or anything else. A prize doesn't change a subscription: if you subscribe, Apple keeps billing it as before until you cancel it in Settings." },
    { title: "Entries that can't win", body: "A sheet that wasn't complete at opening tip, or that was voided (see Void entries), isn't ranked and can't win. A complete sheet that isn't eligible for a prize (for example, from an account created after opening tip, or one not signed in with Apple) is still scored and ranked on the board, marked as not eligible; a prize it would have won goes to the next eligible entry." },
    { title: "Grading and winners", body: "Entries are graded once every team has finished its regular season. Prizes are applied to the winning accounts automatically; winners are told in the app, and by a notification if they have them on. Your result and your prize show on the Win Totals page." },
    { title: "Void entries and changes", body: "We may void entries made with several accounts, by automation, by exploiting a fault in the app, or in breach of the Terms; a void entry isn't ranked and wins nothing. If something outside our control makes the contest unfair (for example, the regular season is cut short), we may grade on winning percentage times 82, or end the contest and say so in the app." },
    { title: "Your information", body: "Your picks are private until opening tip; before it, the board shows only how the crowd split on each team — a count across all readers, refreshed once a day, once 20 have picked the team, never whose picks — and, in your leagues, whether you have sealed. From opening tip, your leagues see your score. We use your entry only to run the contest (Privacy policy)." },
    { title: "Contact", body: SUPPORT_EMAIL },
  ],
};
