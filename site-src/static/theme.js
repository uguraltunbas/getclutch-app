/* Clutch · Day or Night. Loaded in <head>, before the stylesheet, so a pinned
   edition never flashes the other one (the CSP allows no inline script).
   The reader's pick — auto, light (Day) or dark (Night) — is kept in
   localStorage and put on <html data-theme>; auto leaves it to the
   stylesheet's prefers-color-scheme block. The stylesheet also shows the
   Theme button's word from it, so the button reads right at the first paint.
   The Theme button (the masthead's top-right corner, every width) steps
   through the three, its first tap always turning the page: Auto → Day →
   Night on a dark system, Auto → Night → Day on a light one (only the step
   back to Auto can look the same). The browser bar's colour follows the pick.
   It also puts data-toured on <html> once the front page's guide has been
   taken, or its chip offered on three visits (localStorage.tour, set by
   tour.js), so the "New here?" chip is gone before the first paint — no
   flash, no layout shift.
   Kept tiny on purpose: it blocks the first paint (the build's budget: 700 B). */
(function () {
  var d = document, r = d.documentElement, P = ["auto", "light", "dark"], t;
  try { t = P.indexOf(localStorage.theme); if (localStorage.tour) r.dataset.toured = 1; } catch (e) {}
  if (!(t > 0)) t = 0;
  function paint() {
    r.dataset.theme = P[t];
    var m = d.querySelectorAll("meta[name=theme-color]"), i;
    for (i = 0; i < m.length; i++) m[i].content = (t ? t < 2 : /light/.test(m[i].media)) ? "#EDEEF0" : "#15130F";
  }
  paint();
  d.addEventListener("click", function (e) {
    if (!e.target.closest || !e.target.closest(".tg")) return;
    t = (t + 1 + matchMedia("(prefers-color-scheme:light)").matches) % 3;
    try { localStorage.theme = P[t]; } catch (x) {}
    paint();
  });
})();
