// The radar's door for the renderer (apps/radar src/content/flow.mjs, t70):
//
//   POST /content/in                     the post's words, checks and link → { id, order } (or { dup } when it came before)
//   PUT  /content/in/<id>/<photo|video>  each file, in `order`: the last one carries the buttons
//   POST /content/run                    what this run made, left out, will try later, and why
//
// RADAR_URL is a repository variable; CONTENT_KEY a secret shared with the
// radar. Neither the key nor a file's bytes are ever printed.

export function radar({ url = process.env.RADAR_URL, key = process.env.CONTENT_KEY, fetchImpl = fetch } = {}) {
  if (!url || !key) return null;
  const base = url.replace(/\/$/, "");
  async function call(method, path, body, type) {
    const r = await fetchImpl(`${base}${path}`, { method, headers: { "x-content-key": key, ...(type ? { "content-type": type } : {}) }, body });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`radar ${method} ${path}: HTTP ${r.status}${j.error ? ` (${String(j.error).slice(0, 160)})` : ""}`);
    return j;
  }
  return {
    ingest: (post) => call("POST", "/content/in", JSON.stringify(post), "application/json"),
    put: (id, kind, bytes) => call("PUT", `/content/in/${id}/${kind}`, bytes, kind === "video" ? "video/mp4" : "image/jpeg"),
    report: (run) => call("POST", "/content/run", JSON.stringify(run), "application/json"),
  };
}
