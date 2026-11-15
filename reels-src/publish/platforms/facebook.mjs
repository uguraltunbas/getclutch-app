// Facebook Page Reels (Graph API, video_reels): start an upload, send the
// file's bytes to rupload.facebook.com, finish it as PUBLISHED with the
// description. Pages only (a profile can't post Reels by API).
//
// Secrets: FB_PAGE_ID and FB_PAGE_TOKEN (a Page access token made from a
// long-lived user token: it does not expire; SETUP-TR.md).
import { call, until } from "./http.mjs";

export const GRAPH_VERSION = "v27.0";

export const facebook = {
  name: "facebook",
  label: "Facebook Reels",
  secrets: ["FB_PAGE_ID", "FB_PAGE_TOKEN"],
  needsUrl: false,
  preview: (w) => ({ description: w.description }),

  async publish({ mp4, words }, { env, fetchImpl = fetch, sleep }) {
    const v = env.GRAPH_VERSION || GRAPH_VERSION, page = env.FB_PAGE_ID, token = env.FB_PAGE_TOKEN;
    const secrets = [token];
    const g = `https://graph.facebook.com/${v}`;
    const start = await call(fetchImpl, "facebook start", `${g}/${page}/video_reels`, { form: { upload_phase: "start", access_token: token }, secrets });
    const videoId = start.data.video_id;
    if (!videoId) throw new Error("facebook start: no video id");
    await call(fetchImpl, "facebook upload", start.data.upload_url ?? `https://rupload.facebook.com/video-upload/${v}/${videoId}`, {
      body: mp4, secrets, headers: { Authorization: `OAuth ${token}`, offset: "0", file_size: String(mp4.length), "Content-Type": "application/octet-stream" },
    });
    const fin = await call(fetchImpl, "facebook publish", `${g}/${page}/video_reels`, {
      form: { access_token: token, video_id: videoId, upload_phase: "finish", video_state: "PUBLISHED", description: words.description }, secrets,
    });
    if (fin.data.success === false) throw new Error("facebook publish: refused");
    // "finish" has posted it: from here a problem is a note, never a failure
    // (a failure would be tried again next run and post the reel twice)
    let note = null;
    try {
      await until("facebook processing", async () => {
        const s = await call(fetchImpl, "facebook status", `${g}/${videoId}?fields=status&access_token=${encodeURIComponent(token)}`, { method: "GET", secrets });
        const st = s.data.status ?? {};
        if (st.video_status === "error" || st.processing_phase?.status === "error") throw new Error(`processing error ${JSON.stringify(st.processing_phase?.errors ?? st).slice(0, 160)}`);
        return st.video_status === "ready" || st.publishing_phase?.status === "complete" ? st : undefined;
      }, { everyMs: 5000, maxMs: 300000, sleep });
    } catch (e) { note = `posted, but ${e.message}: look at the Page`; }
    return { id: videoId, url: `https://www.facebook.com/reel/${videoId}`, note };
  },
};
