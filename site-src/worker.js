// clutchledger.com's only code. It runs for the embeddable boxes alone (/embed/*,
// wrangler.jsonc run_worker_first); every other address is served straight from
// the static assets, as before.
//
// It counts which sites show a box: the host name of the page the box is framed
// on (from the Referer, which browsers cut to the site for a frame on another
// site) and which box (game, tonight or team), one data point a load, in Workers
// Analytics Engine (dataset clutch_embeds). Nothing about the reader: no IP
// address, no browser, no cookie, no page path on the other site. Loads from
// clutchledger.com itself (the /widget/ previews) and loads with no Referer are
// not counted. The privacy page says this (content/legal.mjs, This website).
//
// Then it serves the box with the box's headers. Cloudflare applies _headers
// only to responses it serves without code, so the /embed/* rules of
// static/_headers are set here too; build.mjs checks the two say the same.

/** The headers of a box: static/_headers' /* rules with /embed/*'s on top (framable by anyone, nothing but its stylesheet loads). */
export const EMBED_HEADERS = {
  "Content-Security-Policy": "default-src 'none'; style-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors *",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cache-Control": "public, max-age=120, stale-while-revalidate=600",
};
/** Site-wide headers a box must not carry (they would stop it being framed). */
export const EMBED_DROPS = ["X-Frame-Options", "Cross-Origin-Opener-Policy"];

/** The framing site's host name, or null (no Referer, not a web address, or clutchledger.com itself). */
export function hostOf(referer) {
  if (!referer) return null;
  let host;
  try {
    const u = new URL(referer);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    host = u.hostname.toLowerCase();
  } catch {
    return null;
  }
  if (!host || host === "clutchledger.com" || host.endsWith(".clutchledger.com")) return null;
  return host.slice(0, 120);
}

/** Which box an address is: "game", "tonight", "team" or "other". */
export function boxOf(pathname) {
  if (pathname.startsWith("/embed/games/")) return "game";
  if (pathname.startsWith("/embed/tonight")) return "tonight";
  if (pathname.startsWith("/embed/team/")) return "team";
  return "other";
}

export default {
  async fetch(request, env) {
    const res = await env.ASSETS.fetch(request);
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith("/embed/")) return res;
    const host = hostOf(request.headers.get("Referer"));
    if (host && request.method === "GET" && (res.status === 200 || res.status === 304)) {
      // Never let the count stop the box: no binding (a local run) or a failed write is fine.
      try {
        env.EMBEDS?.writeDataPoint({ blobs: [host, boxOf(pathname)], indexes: [host] });
      } catch {}
    }
    const out = new Response(res.body, res);
    for (const name of EMBED_DROPS) out.headers.delete(name);
    for (const [name, value] of Object.entries(EMBED_HEADERS)) out.headers.set(name, value);
    return out;
  },
};
