// What every publisher shares: a JSON call that never puts a secret in an
// error (the log of a public repository is public), and a wait-until loop.

/** Replaces every secret in `s` with <secret>. */
export function redact(s, secrets = []) {
  let out = String(s);
  for (const x of secrets) if (x && String(x).length >= 8) out = out.split(String(x)).join("<secret>");
  return out.replace(/(access_token=)[^&\s"]+/g, "$1<secret>");
}

/**
 * fetch → JSON, or a short error naming the step. `form` sends
 * application/x-www-form-urlencoded, `json` sends JSON, `body` is raw.
 */
export async function call(fetchImpl, label, url, { method = "POST", headers = {}, form, json, body, secrets = [], okStatus = null } = {}) {
  const init = { method, headers: { ...headers } };
  if (form) { init.body = new URLSearchParams(form); }
  else if (json !== undefined) { init.body = JSON.stringify(json); init.headers["Content-Type"] ??= "application/json"; }
  else if (body !== undefined) init.body = body;
  let r;
  try { r = await fetchImpl(url, init); }
  catch (e) { throw new Error(redact(`${label}: ${e.message}`, secrets)); }
  const text = await r.text().catch(() => "");
  let data = null;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 200) }; }
  if (!(okStatus ? okStatus.includes(r.status) : r.ok)) {
    const msg = data?.error?.message ?? data?.error_description ?? data?.message ?? data?.error ?? data?.raw ?? "";
    throw new Error(redact(`${label}: HTTP ${r.status} ${typeof msg === "string" ? msg : JSON.stringify(msg)}`.slice(0, 300), secrets));
  }
  return { data, headers: r.headers, status: r.status };
}

/** Calls `check` until it returns a value (not undefined), every `everyMs`, for up to `maxMs`. */
export async function until(label, check, { everyMs = 5000, maxMs = 300000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  for (let waited = 0; waited <= maxMs; waited += everyMs) {
    const v = await check();
    if (v !== undefined) return v;
    await sleep(everyMs);
  }
  throw new Error(`${label}: not ready after ${Math.round(maxMs / 1000)} s`);
}

/**
 * The address a platform can fetch with no redirect: a GitHub release asset's
 * download link answers 302 to a short-lived signed URL, and Meta doesn't
 * promise to follow redirects. Resolved right before the container is made.
 */
export async function directUrl(fetchImpl, url, hops = 3) {
  let u = url;
  for (let i = 0; i < hops; i++) {
    const r = await fetchImpl(u, { method: "HEAD", redirect: "manual" });
    const loc = r.headers.get("location");
    if (r.status >= 300 && r.status < 400 && loc) { u = new URL(loc, u).toString(); continue; }
    return u;
  }
  return u;
}
