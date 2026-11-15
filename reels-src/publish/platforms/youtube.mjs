// YouTube Shorts through the YouTube Data API v3: a vertical video of at most
// three minutes is a Short. One resumable upload (videos.insert), public, not
// made for kids, Sports.
//
// Secrets: YT_CLIENT_ID, YT_CLIENT_SECRET (a "Desktop app" OAuth client of the
// brand's Google Cloud project) and YT_REFRESH_TOKEN (scope youtube.upload,
// signed in once as the brand channel; SETUP-TR.md). The consent screen must
// be "In production", or Google drops the refresh token after 7 days.
import { call } from "./http.mjs";

export const youtube = {
  name: "youtube",
  label: "YouTube Shorts",
  secrets: ["YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN"],
  needsUrl: false,
  /** What a dry run prints. */
  preview: (w) => ({ title: w.title, description: w.description, tags: w.tags, privacy: "public", category: "Sports (17)" }),

  async publish({ mp4, words }, { env, fetchImpl = fetch }) {
    const secrets = [env.YT_CLIENT_SECRET, env.YT_REFRESH_TOKEN];
    const tok = await call(fetchImpl, "youtube token", "https://oauth2.googleapis.com/token", {
      form: { client_id: env.YT_CLIENT_ID, client_secret: env.YT_CLIENT_SECRET, refresh_token: env.YT_REFRESH_TOKEN, grant_type: "refresh_token" }, secrets,
    });
    const access = tok.data.access_token;
    secrets.push(access);
    const meta = {
      snippet: { title: words.title, description: words.description, tags: words.tags, categoryId: "17", defaultLanguage: "en" },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false, containsSyntheticMedia: false, embeddable: true },
    };
    const start = await call(fetchImpl, "youtube start", "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
      json: meta, secrets,
      headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Length": String(mp4.length), "X-Upload-Content-Type": "video/mp4" },
    });
    const at = start.headers.get("location");
    if (!at) throw new Error("youtube start: no upload URL");
    const up = await call(fetchImpl, "youtube upload", at, { method: "PUT", body: mp4, secrets, headers: { Authorization: `Bearer ${access}`, "Content-Type": "video/mp4" } });
    const id = up.data.id;
    if (!id) throw new Error("youtube upload: no video id");
    const privacy = up.data.status?.privacyStatus;
    return { id, url: `https://youtube.com/shorts/${id}`, note: privacy && privacy !== "public" ? `YouTube set it ${privacy} (an unverified API project?)` : null };
  },
};
