/*
 * The Ledger's filters (lib/pages/paper.mjs callFilter): result, team and week over this
 * season's rows, on each row's data-r (1 right, 0 missed), data-t (both team codes) and
 * data-w (the week's Monday). Rows are hidden with the hidden attribute, never a style (the
 * CSP admits no inline style). Without this script the form stays hidden and every row shows.
 */
(function () {
  var f = document.getElementById("lf");
  if (!f) return;
  var rows = document.querySelectorAll("#calls ~ .rlist .lrow");
  var out = document.getElementById("lf-n");
  function run() {
    var r = f.elements.r.value, t = f.elements.t.value, w = f.elements.w.value, n = 0;
    for (var i = 0; i < rows.length; i++) {
      var d = rows[i].dataset;
      var ok = (!r || d.r === r) && (!t || (" " + d.t + " ").indexOf(" " + t + " ") >= 0) && (!w || d.w === w);
      rows[i].hidden = !ok;
      if (ok) n++;
    }
    out.textContent = n === rows.length ? "" : n === 0 ? "No calls match" : n + " of " + rows.length + " calls";
  }
  f.addEventListener("change", run);
  f.addEventListener("submit", function (e) { e.preventDefault(); });
  f.hidden = false;
})();
