// One-time YouTube sign-in for the publisher, run once on the Mac by the
// channel's owner. It reads the OAuth client file Google Cloud downloaded
// (the newest ~/Downloads/client_secret_*.json, a "Desktop app" client),
// opens the Google sign-in in the browser, catches the answer on this Mac
// (127.0.0.1), and stores the three secrets in the site repository with gh —
// nothing is printed and nothing is written to disk.
//
//   node reels-src/publish/auth/youtube.mjs
//
// Needs gh signed in as the repository's owner (GH_TOKEN). Scope: youtube.upload only.
import { execFileSync, spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomBytes, createHash } from "node:crypto";

const REPO = process.env.REELS_REPO || "uguraltunbas/getclutch-app";
const SCOPE = "https://www.googleapis.com/auth/youtube.upload";

const dl = join(homedir(), "Downloads");
const files = readdirSync(dl).filter((f) => /^client_secret_.*\.json$/.test(f)).map((f) => join(dl, f)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
if (!files.length) { console.error("No client_secret_*.json in Downloads: download the OAuth client (Desktop app) from Google Cloud first."); process.exit(1); }
const c = JSON.parse(readFileSync(files[0], "utf8")).installed;
if (!c?.client_id) { console.error(`${files[0]} is not a Desktop app client.`); process.exit(1); }

const verifier = randomBytes(32).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");
const state = randomBytes(12).toString("hex");

const server = createServer();
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const redirect = `http://127.0.0.1:${server.address().port}`;
const url = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
  client_id: c.client_id, redirect_uri: redirect, response_type: "code", scope: SCOPE,
  access_type: "offline", prompt: "consent", state, code_challenge: challenge, code_challenge_method: "S256",
})}`;
console.log("A browser window opens: sign in with the Google account that owns the Clutch YouTube channel, pick the channel, allow uploads.");
spawnSync("open", [url]);

const code = await new Promise((resolve, reject) => {
  server.on("request", (req, res) => {
    const q = new URL(req.url, redirect).searchParams;
    if (q.get("state") !== state) { res.end("Wrong state."); return; }
    res.end(q.get("code") ? "Done. You can close this tab and go back to the terminal." : `Not allowed: ${q.get("error")}`);
    server.close();
    q.get("code") ? resolve(q.get("code")) : reject(new Error(q.get("error") ?? "no code"));
  });
});

const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({
  code, client_id: c.client_id, client_secret: c.client_secret, redirect_uri: redirect, grant_type: "authorization_code", code_verifier: verifier,
}) });
const t = await r.json();
if (!t.refresh_token) { console.error(`Google gave no refresh token (${t.error ?? r.status}). Remove the app at myaccount.google.com/permissions and run this again.`); process.exit(1); }

const set = (name, value) => execFileSync("gh", ["secret", "set", name, "-R", REPO], { input: value, stdio: ["pipe", "inherit", "inherit"] });
set("YT_CLIENT_ID", c.client_id);
set("YT_CLIENT_SECRET", c.client_secret);
set("YT_REFRESH_TOKEN", t.refresh_token);
console.log(`YouTube is connected: YT_CLIENT_ID, YT_CLIENT_SECRET and YT_REFRESH_TOKEN are set on ${REPO}.`);
