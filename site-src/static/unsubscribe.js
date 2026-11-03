/*
 * The unsubscribe page (lib/pages/unsubscribe.mjs). An e-mail's unsubscribe link lands here as
 * /unsubscribe/#t=<token>, sent on by the email-unsubscribe function. The token rides in the
 * fragment, so it never reaches this site's server, and it leaves the address bar as soon as it
 * is read. Only the button acts: it POSTs the token to email-unsubscribe, so a mail scanner that
 * opens every link unsubscribes no one (security audit 2026-11, S-10). The words are the page's
 * data-* attributes, not here.
 */
(function () {
  var box = document.getElementById("un");
  if (!box) return;
  var go = document.getElementById("un-go"), out = document.getElementById("un-out");
  var m = /(?:^#|&)t=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:&|$)/i.exec(location.hash);
  if (location.hash && history.replaceState) history.replaceState(null, "", location.pathname);
  if (!m) { out.textContent = box.dataset.none; return; }
  var t = m[1].toLowerCase();
  function say(k, again) { out.textContent = box.dataset[k]; go.disabled = !again; }
  go.addEventListener("click", function () {
    say("wait", false);
    fetch("__SUPABASE_URL__/functions/v1/email-unsubscribe?t=" + t, { method: "POST" }).then(function (r) {
      if (r.ok) { go.hidden = true; say("done", false); } else if (r.status < 500) say("bad", false); else say("again", true);
    }, function () { say("again", true); });
  });
  go.hidden = false;
})();
