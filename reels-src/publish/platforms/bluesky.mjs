// Bluesky: a post with the reel as its video, signed in with an app password
// (never the account password). The video goes to Bluesky's video service,
// which processes it and hands back the blob the post embeds.
//
// Secrets: BSKY_HANDLE (e.g. getclutchledger.bsky.social) and
// BSKY_APP_PASSWORD (Settings → Privacy and security → App passwords).
import { call, until } from "./http.mjs";

const ENTRY = "https://bsky.social";
const VIDEO = "https://video.bsky.app";

export const bluesky = {
  name: "bluesky",
  label: "Bluesky",
  secrets: ["BSKY_HANDLE", "BSKY_APP_PASSWORD"],
  needsUrl: false,
  preview: (w) => ({ text: w.text, links_and_tags: w.facets.map((f) => f.features[0].uri ?? `#${f.features[0].tag}`) }),

  async publish({ mp4, words, meta }, { env, fetchImpl = fetch, sleep }) {
    const secrets = [env.BSKY_APP_PASSWORD];
    const s = await call(fetchImpl, "bluesky sign-in", `${ENTRY}/xrpc/com.atproto.server.createSession`, { json: { identifier: env.BSKY_HANDLE, password: env.BSKY_APP_PASSWORD }, secrets });
    const { accessJwt, did, handle } = s.data;
    secrets.push(accessJwt);
    const pds = (s.data.didDoc?.service ?? []).find((x) => x.id === "#atproto_pds")?.serviceEndpoint ?? ENTRY;
    const auth = { Authorization: `Bearer ${accessJwt}` };
    // a short-lived token for the video service, scoped to one blob upload on this account's server
    const exp = Math.floor(Date.now() / 1000) + 30 * 60;
    const sa = await call(fetchImpl, "bluesky service auth", `${pds}/xrpc/com.atproto.server.getServiceAuth?aud=${encodeURIComponent(`did:web:${new URL(pds).host}`)}&lxm=com.atproto.repo.uploadBlob&exp=${exp}`, { method: "GET", headers: auth, secrets });
    secrets.push(sa.data.token);
    const up = await call(fetchImpl, "bluesky video upload", `${VIDEO}/xrpc/app.bsky.video.uploadVideo?did=${encodeURIComponent(did)}&name=${encodeURIComponent(`${meta.key.replace(/[^\w-]/g, "_")}.mp4`)}`, {
      body: mp4, secrets, okStatus: [200, 409], headers: { Authorization: `Bearer ${sa.data.token}`, "Content-Type": "video/mp4" },
    });
    // 409: the service has this exact file already; its job id still leads to the blob
    const jobId = up.data.jobId ?? up.data.jobStatus?.jobId;
    let blob = up.data.blob ?? up.data.jobStatus?.blob ?? null;
    if (!blob) {
      if (!jobId) throw new Error(`bluesky video upload: no job (${up.data.error ?? up.status})`);
      blob = await until("bluesky video processing", async () => {
        const j = await call(fetchImpl, "bluesky video status", `${VIDEO}/xrpc/app.bsky.video.getJobStatus?jobId=${encodeURIComponent(jobId)}`, { method: "GET", headers: auth, secrets });
        const st = j.data.jobStatus ?? {};
        if (st.state === "JOB_STATE_FAILED") throw new Error(`bluesky video processing failed: ${st.error ?? st.message ?? "?"}`);
        return st.blob ?? undefined;
      }, { everyMs: 4000, maxMs: 240000, sleep });
    }
    const record = {
      $type: "app.bsky.feed.post", text: words.text, facets: words.facets, langs: ["en"], createdAt: new Date().toISOString(),
      embed: { $type: "app.bsky.embed.video", video: blob, aspectRatio: { width: meta.width, height: meta.height }, alt: meta.alt },
    };
    const r = await call(fetchImpl, "bluesky post", `${pds}/xrpc/com.atproto.repo.createRecord`, { json: { repo: did, collection: "app.bsky.feed.post", record }, headers: auth, secrets });
    const rkey = String(r.data.uri).split("/").pop();
    return { id: r.data.uri, url: `https://bsky.app/profile/${handle ?? did}/post/${rkey}` };
  },
};
