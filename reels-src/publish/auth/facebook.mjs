// One-time Facebook Page sign-in for the publisher. Facebook's Graph API
// Explorer gives a user token that lasts an hour; this turns it into the
// Page's own token, which does not expire, and stores FB_PAGE_ID and
// FB_PAGE_TOKEN in the site repository with gh. It asks for the three values
// (pasted, never shown) and prints nothing secret.
//
//   node reels-src/publish/auth/facebook.mjs
//
// The Explorer token must carry pages_show_list, pages_read_engagement and
// pages_manage_posts (SETUP-TR.md). Needs gh signed in as the repository's owner (GH_TOKEN).
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline";

const REPO = process.env.REELS_REPO || "uguraltunbas/getclutch-app";
const V = process.env.GRAPH_VERSION || "v27.0";
const PAGE_NAME = process.env.FB_PAGE_NAME || "Clutch";

function ask(q, hidden = true) {
  return new Promise((res) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (s) => { if (s.startsWith(q)) rl.output.write(q); };
    rl.question(q, (a) => { rl.close(); if (hidden) process.stdout.write("\n"); res(a.trim()); });
  });
}
const get = async (url) => { const r = await fetch(url); const j = await r.json(); if (j.error) throw new Error(j.error.message); return j; };

const appId = await ask("Meta App ID (shown at the top of the app dashboard): ", false);
const appSecret = await ask("App secret (App settings → Basic → Show), pasted: ");
const short = await ask("User token from Graph API Explorer, pasted: ");

const long = await get(`https://graph.facebook.com/${V}/oauth/access_token?${new URLSearchParams({ grant_type: "fb_exchange_token", client_id: appId, client_secret: appSecret, fb_exchange_token: short })}`);
const pages = (await get(`https://graph.facebook.com/${V}/me/accounts?fields=id,name,access_token,tasks&access_token=${encodeURIComponent(long.access_token)}`)).data ?? [];
const page = pages.find((p) => p.name.startsWith(PAGE_NAME)) ?? (pages.length === 1 ? pages[0] : null);
if (!page) { console.error(`No Page found whose name starts with "${PAGE_NAME}" (found: ${pages.map((p) => p.name).join(", ") || "none"}).`); process.exit(1); }
if (!(page.tasks ?? []).includes("CREATE_CONTENT")) console.warn("Warning: this token can't create content on the Page; check the three permissions.");
const dbg = await get(`https://graph.facebook.com/${V}/debug_token?input_token=${encodeURIComponent(page.access_token)}&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`);
const set = (name, value) => execFileSync("gh", ["secret", "set", name, "-R", REPO], { input: value, stdio: ["pipe", "inherit", "inherit"] });
set("FB_PAGE_ID", page.id);
set("FB_PAGE_TOKEN", page.access_token);
const exp = dbg.data?.expires_at;
console.log(`Facebook Page "${page.name}" is connected (token ${exp ? `expires ${new Date(exp * 1000).toISOString().slice(0, 10)}` : "never expires"}).`);
