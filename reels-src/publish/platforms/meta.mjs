// Instagram Reels and Threads: both take the video from a public URL (the
// state release's copy, store.mjs), make a container, wait until Meta has
// processed it, then publish it. Both use long-lived user tokens that last 60
// days; each run past a week refreshes the token and keeps the new one,
// sealed, in the state release (PUBLISH_STATE_KEY), so nobody has to sign in
// again as long as the reels run.
//
// Secrets: IG_TOKEN (Instagram API with Instagram Login, a professional
// account with a role on the Meta app; Standard Access needs no App Review)
// and THREADS_TOKEN (the Threads use case, its own app id; the account is a
// Threads Tester of the app, which needs no App Review). SETUP-TR.md has the
// one-time steps. Limits: Instagram 50 API posts a rolling day, Threads 250.
import { call, directUrl, until } from "./http.mjs";

export const IG_VERSION = "v27.0";
const IG = (env) => `https://graph.instagram.com/${env.GRAPH_VERSION || IG_VERSION}`;
const TH = "https://graph.threads.com/v1.0";

async function containerReady(fetchImpl, label, url, field, secrets, sleep) {
  return until(`${label} processing`, async () => {
    const s = await call(fetchImpl, `${label} status`, url, { method: "GET", secrets });
    const st = s.data[field];
    if (st === "ERROR" || st === "EXPIRED") throw new Error(`${label} processing: ${st} ${s.data.error_message ?? ""}`.trim());
    return st === "FINISHED" ? st : undefined;
  }, { everyMs: 6000, maxMs: 300000, sleep });
}

export const instagram = {
  name: "instagram",
  label: "Instagram Reels",
  secrets: ["IG_TOKEN"],
  needsUrl: true,
  preview: (w) => ({ caption: w.caption, share_to_feed: true }),

  /** A new 60-day token from one that is at least a day old. */
  async refresh(token, { fetchImpl = fetch } = {}) {
    const r = await call(fetchImpl, "instagram refresh", `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`, { method: "GET", secrets: [token] });
    return { token: r.data.access_token, expiresAt: Date.now() + (r.data.expires_in ?? 0) * 1000 };
  },

  async publish({ url, words }, { env, token, fetchImpl = fetch, sleep }) {
    const secrets = [token];
    const g = IG(env);
    const me = env.IG_USER_ID || (await call(fetchImpl, "instagram account", `${g}/me?fields=user_id,username&access_token=${encodeURIComponent(token)}`, { method: "GET", secrets })).data.user_id;
    const c = await call(fetchImpl, "instagram container", `${g}/${me}/media`, { form: { media_type: "REELS", video_url: await directUrl(fetchImpl, url), caption: words.caption, share_to_feed: "true", access_token: token }, secrets });
    await containerReady(fetchImpl, "instagram", `${g}/${c.data.id}?fields=status_code,status&access_token=${encodeURIComponent(token)}`, "status_code", secrets, sleep);
    const p = await call(fetchImpl, "instagram publish", `${g}/${me}/media_publish`, { form: { creation_id: c.data.id, access_token: token }, secrets });
    const link = await call(fetchImpl, "instagram link", `${g}/${p.data.id}?fields=permalink&access_token=${encodeURIComponent(token)}`, { method: "GET", secrets }).catch(() => null);
    return { id: p.data.id, url: link?.data?.permalink ?? null };
  },
};

export const threads = {
  name: "threads",
  label: "Threads",
  secrets: ["THREADS_TOKEN"],
  needsUrl: true,
  preview: (w) => ({ text: w.text }),

  async refresh(token, { fetchImpl = fetch } = {}) {
    const r = await call(fetchImpl, "threads refresh", `https://graph.threads.com/refresh_access_token?grant_type=th_refresh_token&access_token=${encodeURIComponent(token)}`, { method: "GET", secrets: [token] });
    return { token: r.data.access_token, expiresAt: Date.now() + (r.data.expires_in ?? 0) * 1000 };
  },

  async publish({ url, words }, { token, fetchImpl = fetch, sleep }) {
    const secrets = [token];
    const c = await call(fetchImpl, "threads container", `${TH}/me/threads`, { form: { media_type: "VIDEO", video_url: await directUrl(fetchImpl, url), text: words.text, access_token: token }, secrets });
    await containerReady(fetchImpl, "threads", `${TH}/${c.data.id}?fields=status,error_message&access_token=${encodeURIComponent(token)}`, "status", secrets, sleep);
    const p = await call(fetchImpl, "threads publish", `${TH}/me/threads_publish`, { form: { creation_id: c.data.id, access_token: token }, secrets });
    const link = await call(fetchImpl, "threads link", `${TH}/${p.data.id}?fields=permalink&access_token=${encodeURIComponent(token)}`, { method: "GET", secrets }).catch(() => null);
    return { id: p.data.id, url: link?.data?.permalink ?? null };
  },
};
