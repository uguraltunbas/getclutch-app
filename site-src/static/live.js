/* Clutch · live scores. The page is complete without this: it only refreshes
   tonight's status and scores from the public games table (anon key, public
   by design — it ships in the app), so a build from hours ago still shows
   the live score. Polls once a minute while a game is on, or due to tip within
   three hours, and the tab shows; a night still hours away is checked again
   when its first tip is three hours off (at most every 30 minutes). */
(function () {
  "use strict";
  var U = "__SUPABASE_URL__", K = "__SUPABASE_ANON_KEY__";
  if (!window.fetch || !document.querySelector) return;
  var nodes = Array.prototype.slice.call(document.querySelectorAll("[data-gid]"));
  if (!nodes.length) return;
  var ids = [];
  nodes.forEach(function (n) { if (ids.indexOf(n.getAttribute("data-gid")) < 0) ids.push(n.getAttribute("data-gid")); });
  var timer = null, done = false;

  function st(s) { return s === "in_progress" ? "live" : s === "cancelled" || s === "canceled" ? "postponed" : s; }
  function per(p) { return p <= 4 ? "Q" + p : p === 5 ? "OT" : (p - 4) + "OT"; }
  function zero(c) {
    var s = String(c).trim();
    var v = s.indexOf(":") >= 0 ? s.split(":").reduce(function (a, x) { return a * 60 + Number(x); }, 0) : Number(s);
    return v === 0;
  }
  function label(g) {
    var s = st(g.status);
    if (s === "final") return g.period > 4 ? "FINAL/" + (g.period === 5 ? "OT" : (g.period - 4) + "OT") : "FINAL";
    if (s === "halftime") return "HALF";
    if (s === "live") return g.period ? per(g.period) + (g.clock && !zero(g.clock) ? " " + String(g.clock).replace(/^0(?=\d:)/, "") : "") : "LIVE";
    if (s === "postponed") return "POSTPONED";
    return null;
  }
  var SOON = 3 * 3600e3, MIN = 60e3, MAX = 30 * 60e3;
  /* When to look again: a minute while a game is on or tips within three hours; later for a night still far off; never once all are done. */
  function next(rows) {
    var now = Date.now(), wait = null;
    rows.forEach(function (r) {
      var s = st(r.status);
      if (s === "live" || s === "halftime") { wait = MIN; return; }
      if (s !== "scheduled" || !r.game_time_utc) return;
      var w = Math.max(MIN, Math.min(MAX, Date.parse(r.game_time_utc) - SOON - now));
      if (wait === null || w < wait) wait = w;
    });
    return wait;
  }
  function paint(rows) {
    var by = {};
    rows.forEach(function (r) { by[r.id] = r; });
    nodes.forEach(function (n) {
      var g = by[n.getAttribute("data-gid")];
      if (!g) return;
      var s = st(g.status), l = label(g), scored = (s === "live" || s === "halftime" || s === "final") && g.home_score != null && g.away_score != null;
      if (!l) return;
      var a = n.getAttribute("data-a") || "", h = n.getAttribute("data-h") || "";
      var line = a + " " + g.away_score + " · " + h + " " + g.home_score;
      var sc = n.querySelectorAll('[data-live="sc"]');
      var stn = n.querySelectorAll('[data-live="st"]');
      for (var i = 0; i < stn.length; i++) stn[i].textContent = l + (scored && !sc.length ? " · " + line : "");
      if (scored) {
        for (var j = 0; j < sc.length; j++) {
          sc[j].textContent = sc[j].getAttribute("data-fmt") === "dash" ? g.away_score + "–" + g.home_score : line;
          sc[j].hidden = false;
        }
        var pre = n.querySelectorAll('[data-live="pre"]');
        for (var k = 0; k < pre.length; k++) pre[k].hidden = true;
      }
      n.classList.toggle("is-live", s === "live" || s === "halftime");
    });
  }
  function load() {
    timer = null;
    if (document.hidden) return;
    fetch(U + "/rest/v1/games?select=id,status,period,clock,home_score,away_score,game_time_utc&id=in.(" + ids.join(",") + ")", { headers: { apikey: K, Authorization: "Bearer " + K } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (rows) {
        if (!rows) { timer = setTimeout(load, 5 * MIN); return; }
        paint(rows);
        var w = next(rows);
        if (w !== null) timer = setTimeout(load, w);
        else done = true;
      })
      .catch(function () { timer = setTimeout(load, 5 * MIN); });
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && !timer && !done) load(); });
  load();
})();
