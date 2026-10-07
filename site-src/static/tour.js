/* Clutch · "Clutch in a minute", the front page's guide. Offered, never
   started by itself: the hero's "New here?" chip (until the guide has been
   taken; theme.js hides it before the first paint) and the quiet
   "1-minute tour" under Three moves a night open it. Four stops on the
   paper's own elements (the data-tour hooks the build writes): the game of
   the night's number, its why line, the call buttons, the Ledger, then an
   end card. A stop whose element isn't on the page (no game yet, a game
   already live) is left out and the count says so. The words are in the page
   (<template id="tour">), so the build's betting-words check reads them.
   The dim is four panes around a hole, so clicks inside reach the real
   element; Esc skips; Tab stays in the card; arrow keys step; reduced motion
   = no smooth scroll, no fade. Everything moves by transform (no layout
   shift while the reader scrolls). Without this script the page is whole (the
   chip and the link only show where theme.js ran). localStorage.tour keeps
   "done" or "skipped"; every access is wrapped. */
(function () {
  "use strict";
  var d = document, tpl = d.getElementById("tour");
  if (!tpl || !tpl.content || !window.requestAnimationFrame) return;
  var PAD = 8, GAP = 12, M = 12;
  var root, card, panes, ring, steps, at, opener, raf = 0, still;

  function q(s) { return root.querySelector(s); }
  function store(v) {
    try { localStorage.tour = v; } catch (e) {}
    d.documentElement.dataset.toured = 1;
  }
  /* Moved with transforms, never top/left: a fixed box that moves as the page scrolls would count as layout shift. */
  function move(el, x, y) { el.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)"; }
  function box(el, x, y, w, h) {
    move(el, x, y);
    el.style.width = Math.max(0, w) + "px";
    el.style.height = Math.max(0, h) + "px";
  }
  function vw() { return d.documentElement.clientWidth; }
  /* What the hole hugs: the stop's children (the two call buttons, not the board's padding round them), else the element itself. */
  function rect(el) {
    var k = el.children, t = 1e9, l = 1e9, b = -1e9, e = -1e9, i, c;
    for (i = 0; i < k.length; i++) {
      c = k[i].getBoundingClientRect();
      if (c.width) { t = Math.min(t, c.top); l = Math.min(l, c.left); b = Math.max(b, c.bottom); e = Math.max(e, c.right); }
    }
    return b > t ? { top: t, left: l, bottom: b, right: e, height: b - t } : el.getBoundingClientRect();
  }

  function place() {
    raf = 0;
    if (!root) return;
    var W = vw(), H = innerHeight, s = steps[at], cw = card.offsetWidth, ch = card.offsetHeight, x, y, r, t, b, l, e;
    if (!s) {
      box(panes[0], 0, 0, W, H);
      box(panes[1], 0, 0, 0, 0);
      box(panes[2], 0, 0, 0, 0);
      box(panes[3], 0, 0, 0, 0);
      ring.hidden = true;
      x = (W - cw) / 2;
      y = Math.max(M, (H - ch) / 2);
    } else {
      r = rect(s.el);
      t = Math.max(0, Math.floor(r.top - PAD));
      b = Math.max(t, Math.min(H, Math.ceil(r.bottom + PAD)));
      l = Math.max(0, Math.floor(r.left - PAD));
      e = Math.max(l, Math.min(W, Math.ceil(r.right + PAD)));
      box(panes[0], 0, 0, W, t);
      box(panes[1], 0, b, W, H - b);
      box(panes[2], 0, t, l, b - t);
      box(panes[3], e, t, W - e, b - t);
      ring.hidden = false;
      box(ring, l, t, e - l, b - t);
      x = Math.min(Math.max(M + 4, r.left), W - cw - M - 4);
      if (r.bottom + PAD + GAP + ch <= H - M) y = r.bottom + PAD + GAP;
      else if (r.top - PAD - GAP - ch >= M) y = r.top - PAD - GAP - ch;
      else y = H - M - ch;
    }
    move(card, Math.max(M, x), y);
  }
  function later() { if (!raf) raf = requestAnimationFrame(place); }

  /* Bring a stop and its card into view: the Tonight row first (a sideways scroller on phones), then the page, only when they don't already fit. */
  function bring(el) {
    var sc = el.closest(".cards"), c = el.closest(".gcard") || el, H = innerHeight, ch = card.offsetHeight, r, need;
    if (sc && sc.scrollWidth > sc.clientWidth) sc.scrollLeft += c.getBoundingClientRect().left - sc.getBoundingClientRect().left;
    r = rect(el);
    if (r.top - PAD >= M && r.bottom + PAD <= H - M && (r.bottom + PAD + GAP + ch <= H - M || r.top - PAD - GAP - ch >= M)) return;
    need = r.height + PAD * 2 + GAP + ch;
    window.scrollBy({ top: need + M * 2 <= H ? r.top - PAD - (H - need) / 2 : r.top - PAD - M, behavior: still ? "auto" : "smooth" });
  }

  function show(k) {
    at = k;
    var s = steps[k], end = !s, li = end ? q(".end") : s.li;
    q("#tour-h").textContent = li.querySelector("b").textContent;
    q("#tour-p").textContent = li.querySelector("i").textContent;
    q(".tc").textContent = end ? "" : k + 1 + " / " + steps.length + " \u00b7 ";
    q(".te").hidden = !end;
    q(".tb").hidden = end;
    q(".tend").hidden = !end;
    q("[data-a=back]").hidden = !k;
    if (!still) { card.classList.remove("in"); void card.offsetWidth; card.classList.add("in"); }
    if (s) bring(s.el);
    place();
    card.focus({ preventScroll: true });
    setTimeout(later, 400);
  }
  function go(k) { if (k >= 0 && k <= steps.length) show(k); }

  function close(v) {
    store(v);
    removeEventListener("scroll", later, true);
    removeEventListener("resize", later);
    d.removeEventListener("keydown", key, true);
    d.removeEventListener("click", hole, true);
    root.remove();
    root = null;
    var f = opener && opener !== d.body && opener.getClientRects().length ? opener : d.querySelector(".tl");
    if (f) f.focus({ preventScroll: true });
  }

  function key(e) {
    var k = e.key, f, i;
    if (k === "Escape") { e.preventDefault(); close(steps[at] ? "skipped" : "done"); }
    else if ((k === "ArrowRight" || k === "ArrowLeft") && steps[at]) { e.preventDefault(); go(at + (k === "ArrowRight" ? 1 : -1)); }
    else if (k === "Tab") {
      f = [].filter.call(card.querySelectorAll("a[href],button"), function (n) { return n.getClientRects().length; });
      i = f.indexOf(d.activeElement);
      if (f.length && (e.shiftKey ? i <= 0 : i < 0 || i === f.length - 1)) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); }
    }
  }
  /* A link followed inside the hole (a call button) or on the end card: the guide did its job. */
  function hole(e) {
    var s = root && steps[at];
    if (s && s.el.contains(e.target) && e.target.closest("a")) store("done");
  }
  function act(e) {
    var b = e.target.closest("[data-a]"), a = b && b.getAttribute("data-a");
    if (e.target.closest("a")) store("done");
    if (a === "next") go(at + 1);
    else if (a === "back") go(at - 1);
    else if (a) close(a === "done" ? "done" : "skipped");
  }

  function open() {
    if (root) return;
    root = tpl.content.firstElementChild.cloneNode(true);
    d.body.appendChild(root);
    card = q(".tcard");
    ring = q(".tring");
    panes = root.querySelectorAll(".tdim");
    still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    steps = [];
    [].forEach.call(root.querySelectorAll("[data-s]"), function (li) {
      var el = d.querySelector("[data-tour=" + li.getAttribute("data-s") + "]");
      if (el && el.getClientRects().length) steps.push({ el: el, li: li });
    });
    opener = d.activeElement;
    addEventListener("scroll", later, true);
    addEventListener("resize", later);
    d.addEventListener("keydown", key, true);
    d.addEventListener("click", hole, true);
    root.addEventListener("click", act);
    show(0);
  }

  d.addEventListener("click", function (e) {
    var g = e.target.closest && e.target.closest("[data-tour-go]");
    if (g) { e.preventDefault(); open(); }
  });
})();
