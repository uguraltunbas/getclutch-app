// The good-news posts on the app's paper (t70): the card hit and the hot run,
// drawn the way the app's card share image looks (clutch-mobile
// components/cards/CardShareCards.tsx): the Night Edition turned inside out —
// cream paper, black ink, an amber band — Fraunces for the words that speak,
// Plex Mono for labels and small numbers, Libre Franklin for team names, Doto
// for the big numbers with Doto's "%" drawn smaller in Plex (full size it
// reads as an "X").
//
// The other series are the share studio's (vendor/studio.js, built from the
// app); these two are drawn here. A classic script, so the page loads it from
// file:// and the tests read its words in node (globalThis.ClutchPaper):
//
//   cardhitPost(date, facts) / hotrunPost(date, facts)   → { still, reel }: each a scene with draw(ctx, t)
//   cardhitCaption / hotrunCaption(date, facts, limit)   → { short, long }
//   cardhitTitle / hotrunTitle(facts)                    → the line Telegram shows
//   fontsReady()                                         → every face these posts draw with, loaded
//
// What the posts claim: the cards, never the Ledger (the Ledger grades the
// favourite; a Bold card wins by taking underdogs), and on the hot run never
// more than the Ledger shows. ✓ and ✗ stay in ink, never green or red.
(() => {
  const PAPER = "#F1E9D8", INK = "#15130F", AMBER = "#FFB020";
  const W = 1080, H = 1350, REEL_H = 1920;
  /** The layout's place in the vertical video: the middle of the frame. */
  const REEL_TOP = Math.round((REEL_H - H) / 2);
  const PAD = 56;
  const FACE = {
    title: "Fraunces_900Black",
    italic: "Fraunces_700Bold_Italic",
    mono: "IBMPlexMono_500Medium",
    monoBold: "IBMPlexMono_600SemiBold",
    name: "LibreFranklin_700Bold",
    led: "Doto_900Black",
  };
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const TIER = { solid: "Solid", balanced: "Balanced", bold: "Bold" };
  const SUB = { solid: "the 3 surest favorites", balanced: "the 5 surest favorites", bold: "the 3 likeliest underdogs" };
  const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

  // ── words ───────────────────────────────────────────────────────────

  const md = (iso) => `${MONTHS[+iso.slice(5, 7) - 1]} ${+iso.slice(8, 10)}`;
  const mdy = (iso) => `${md(iso)}, ${iso.slice(0, 4)}`;
  const up = (s) => String(s).toUpperCase();
  /** "10:01 AM ET": the NBA's clock. */
  const et = (iso) => `${new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })} ET`;
  const pct = (p) => Math.round(p * 100);
  const seasonLabel = (s) => String(s).replace("-", "–");
  const oneIn = (p) => Math.round(1 / p);
  const shortHash = (h) => (h && h.length > 16 ? `${h.slice(0, 8)}…${h.slice(-6)}` : h ?? "");
  const listed = (xs) => (xs.length < 3 ? xs.join(" and ") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

  /** X's length (the studio's xLength): 1 for Latin and the common punctuation, 2 for the rest. */
  function xLength(text) {
    let n = 0;
    for (const ch of text) {
      const c = ch.codePointAt(0) ?? 0;
      n += c <= 0x10ff || (c >= 0x2000 && c <= 0x200d) || (c >= 0x2010 && c <= 0x201f) || (c >= 0x2032 && c <= 0x2037) ? 1 : 2;
    }
    return n;
  }
  /** The first parts that fit `limit`, in order; the head always. */
  function fit(parts, limit) {
    let out = parts[0];
    for (const p of parts.slice(1)) {
      const next = `${out}\n\n${p}`;
      if (xLength(next) <= limit) out = next;
    }
    return out;
  }

  // the card hit

  const forFor = (n) => `${n} for ${n}.`;
  function cardHead(f) {
    const won = f.cards.map((c) => TIER[c.tier]);
    if (f.all && f.night === 3) return "All three hit.";
    if (f.all && f.night === 2) return "Both cards hit.";
    if (won.length === 1) return `The ${won[0]} card hit.`;
    return `${listed(won)} hit.`;
  }
  /** "about a 1-in-32 night", by Clutch's own numbers; null when it was likelier than not. */
  function cardRarity(f) {
    if (f.all && f.night > 1 && f.joint > 0 && f.joint < 0.5) return { text: `${f.night === 3 ? "all three" : "both"} hitting was about a 1-in-${oneIn(f.joint)} night`, n: oneIn(f.joint) };
    const rarest = [...f.cards].sort((a, b) => a.chance - b.chance)[0];
    if (rarest.chance < 0.5) return { text: `the ${TIER[rarest.tier]} card hits about 1 night in ${oneIn(rarest.chance)}`, n: oneIn(rarest.chance) };
    return null;
  }

  function cardhitTitle(f) {
    return cardHead(f).replace(/\.$/, "");
  }

  function cardhitCaption(date, f, limit = 280) {
    const r = cardRarity(f);
    const head = f.all && f.night > 1 ? `${md(date)}: ${f.night === 3 ? "all three" : "both"} of Clutch's Cards hit.` : `${md(date)}: Clutch's ${listed(f.cards.map((c) => TIER[c.tier]))} card${f.cards.length > 1 ? "s" : ""} hit.`;
    const lines = f.cards.map((c) => `${TIER[c.tier]} ${c.legs.length} for ${c.legs.length} (${pct(c.chance)}%)`).join("\n");
    const sealed = f.seal ? `Built from the ${et(f.seal.committed_at)} seal, before the first tip.` : "Built from the morning seal, before the first tip.";
    const rare = r ? `By its own numbers, ${r.text}.` : "";
    const short = fit([head, lines, [rare, sealed].filter(Boolean).join(" ")], limit);
    const legs = f.cards.map((c) => `${TIER[c.tier]} card (${SUB[c.tier]}), Clutch's chance ${pct(c.chance)}%:\n${c.legs.map((l) => `✓ ${l.name} ${l.final ?? ""} (${pct(l.chance)}%)`.replace("  ", " ")).join("\n")}`).join("\n\n");
    const proof = f.seal ? `The seal: ${f.seal.file ?? "the morning file"}, sha256 ${shortHash(f.seal.sha256)}, committed ${et(f.seal.committed_at)}. First tip ${et(f.firstTip)}. One fixed rule builds the cards: rebuild them from that file.` : "";
    return { short, long: [head, legs, rare, proof].filter(Boolean).join("\n\n") };
  }

  // the hot run

  /** What the hero counts: the run on a mark, the record on a break. */
  const heroOf = (f) => (f.kind === "mark" ? [f.run, 0] : [f.record.right, f.record.wrong]);
  function runKicker(f) {
    if (f.kind === "mark" && f.runFrom) return `75% or higher · since the miss on ${md(f.runFrom)}`;
    return `Every time Clutch said 75% or higher${f.since ? ` · since ${md(f.since)}` : ""}`;
  }
  function runLede(f) {
    if (f.kind === "mark") return "Every one of those teams won.";
    if (f.ended >= 10) return `The run ends at ${f.ended}.`;
    const n = f.misses.length;
    return `${n <= 10 ? WORDS[n] : n} missed last night.`;
  }
  /** "Boston 78%: lost 101–108 to NYK" from a Ledger call (final = away-home). */
  function missLine(c) {
    const [away, home] = String(c.matchup).split(" @ ");
    const [a, h] = String(c.final ?? "").split("-").map(Number);
    const pickHome = c.pick === home;
    const mine = pickHome ? h : a, theirs = pickHome ? a : h;
    return { name: c.name ?? c.pick, pick: c.pick, pct: Math.round(c.claimed_pct), score: Number.isFinite(mine) && Number.isFinite(theirs) ? `${mine}–${theirs}` : "", opp: pickHome ? away : home };
  }
  const nights = (f) => new Set(f.tiles.map((x) => x.game_date)).size;

  function hotrunTitle(f) {
    if (f.kind === "mark") return `${f.run}–0 at 75%+`;
    return f.ended >= 10 ? `The run ends at ${f.ended}` : `${f.record.right}–${f.record.wrong} at 75%+`;
  }

  function hotrunCaption(date, f, limit = 280) {
    const scope = f.since ? `since ${md(f.since)}` : "this season";
    const record = `${f.record.right}–${f.record.wrong}`;
    let head, body;
    if (f.kind === "mark") {
      head = f.runFrom ? `Clutch at 75% or higher since its miss on ${md(f.runFrom)}: ${f.run} straight right.` : `Every time Clutch said 75% or higher ${scope}: ${f.run}–0.`;
      body = `Its own numbers expected ${f.runExpected.toFixed(1)} right. A hot run, not a promise.${f.runFrom ? ` At 75% or higher ${scope}: ${record}.` : ""}`;
    } else {
      const m = f.misses.map(missLine);
      const misses = m.map((x) => `${x.pick} ${x.pct}% lost ${x.score} to ${x.opp}`).join("; ");
      head = f.ended >= 10 ? `Clutch's run at 75% or higher ends at ${f.ended}: ${misses}.` : `A 75% call missed last night: ${misses}.`;
      body = `At 75% or higher ${scope}: ${record}. Its own numbers expected ${f.record.expected.toFixed(1)} right. The misses stay on the record.`;
    }
    const proof = `Every number sealed before tip, graded on the Ledger.`;
    return { short: fit([head, body, proof], limit), long: [head, body, proof].join("\n\n") };
  }

  // ── drawing ─────────────────────────────────────────────────────────

  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const easeOut = (x) => 1 - (1 - x) ** 3;

  /** Text with the house's tracking; right-aligned text sheds the last letter's spacing. → its width */
  function text(ctx, s, x, y, o) {
    const { size, face, color = INK, align = "left", spacing = 0, alpha = 1 } = o;
    if (alpha <= 0 || s === "") return 0;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.font = `${size}px "${face}"`;
    ctx.letterSpacing = `${spacing}px`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
    const w = ctx.measureText(s).width - spacing;
    ctx.fillText(s, align === "right" ? x + spacing : x, y);
    ctx.restore();
    return w;
  }
  function measure(ctx, s, o) {
    ctx.save();
    ctx.font = `${o.size}px "${o.face}"`;
    ctx.letterSpacing = `${o.spacing ?? 0}px`;
    const w = ctx.measureText(s).width - (o.spacing ?? 0);
    ctx.restore();
    return w;
  }
  /** The size at which `s` fits `width` (never under `min`). */
  function sized(ctx, s, width, o, min = 12) {
    let size = o.size;
    while (size > min && measure(ctx, s, { ...o, size }) > width) size -= 1;
    return { ...o, size };
  }
  /** A Doto number with its "%" in Plex at half the size, on the digits' baseline. → width */
  function pctNum(ctx, n, x, y, size, o = {}) {
    const num = { size, face: FACE.led, color: o.color ?? INK, alpha: o.alpha ?? 1 };
    const sign = { size: Math.max(11, Math.round(size * 0.5)), face: FACE.monoBold, color: o.color ?? INK, alpha: o.alpha ?? 1 };
    const wn = measure(ctx, String(n), num), ws = measure(ctx, "%", sign), gap = Math.round(size * 0.08);
    const x0 = o.align === "right" ? x - wn - gap - ws : x;
    text(ctx, String(n), x0, y, num);
    text(ctx, "%", x0 + wn + gap, y, sign);
    return wn + gap + ws;
  }
  function box(ctx, x, y, w, h, color, alpha = 1) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
  function line(ctx, x, y, w, weight = 2, alpha = 1) {
    box(ctx, x, y - weight / 2, w, weight, INK, alpha);
  }
  /** ✓ as the share card draws it (24-unit path), `s` px square at (x, y). */
  function tick(ctx, x, y, s, color, alpha = 1) {
    if (alpha <= 0) return;
    const k = s / 24;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.2 * k;
    ctx.lineCap = "square";
    ctx.lineJoin = "miter";
    ctx.beginPath();
    ctx.moveTo(x + 4.5 * k, y + 12.5 * k);
    ctx.lineTo(x + 9.3 * k, y + 17.3 * k);
    ctx.lineTo(x + 19.5 * k, y + 7 * k);
    ctx.stroke();
    ctx.restore();
  }
  function cross(ctx, x, y, s, color, alpha = 1) {
    if (alpha <= 0) return;
    const k = s / 24;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3 * k;
    ctx.lineCap = "square";
    ctx.beginPath();
    ctx.moveTo(x + 6.5 * k, y + 6.5 * k);
    ctx.lineTo(x + 17.5 * k, y + 17.5 * k);
    ctx.moveTo(x + 17.5 * k, y + 6.5 * k);
    ctx.lineTo(x + 6.5 * k, y + 17.5 * k);
    ctx.stroke();
    ctx.restore();
  }
  /** A leg's mark: ✓ in paper on an ink square, ✗ in ink inside an ink frame. */
  function mark(ctx, ok, x, y, s, alpha = 1) {
    if (alpha <= 0) return;
    if (ok) {
      box(ctx, x, y, s, s, INK, alpha);
      tick(ctx, x + s * 0.13, y + s * 0.13, s * 0.74, PAPER, alpha);
    } else {
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
      ctx.restore();
      cross(ctx, x + s * 0.13, y + s * 0.13, s * 0.74, INK, alpha);
    }
  }

  const label = (size = 22) => ({ size, face: FACE.mono, spacing: size * 0.115 });

  function band(ctx, oy, left, right, k) {
    box(ctx, 0, oy, W, 92, AMBER, k);
    const r = { size: 26, face: FACE.mono, spacing: 2, alpha: k };
    const rw = measure(ctx, right, r);
    const l = sized(ctx, left, W - PAD * 2 - rw - 32, { size: 26, face: FACE.monoBold, spacing: 3, alpha: k }, 16);
    text(ctx, left, PAD, oy + 56, l);
    text(ctx, right, W - PAD, oy + 56, { ...r, align: "right" });
  }

  /**
   * The wordmark and the links. The full footer sits under a rule from
   * y 1202; the compact one (a three-card night) drops the rule and keeps
   * to the last 120 px, as the card share image does.
   */
  function footer(ctx, oy, lines, k, compact = false) {
    const y = oy + (compact ? 1228 : 1202);
    if (!compact) line(ctx, PAD, y, W - PAD * 2, 2, k);
    text(ctx, "Clutch", PAD, y + 68, { size: 56, face: FACE.title, spacing: -1, alpha: k });
    text(ctx, "Beat Clutch.", PAD, y + 106, { size: 26, face: FACE.italic, alpha: k });
    lines.forEach((l, i) => {
      const o = sized(ctx, l, W - PAD * 2 - 300, { size: 20, face: FACE.mono, spacing: 1.6, alpha: k, align: "right" }, 14);
      text(ctx, l, W - PAD, y + 78 + i * 31 - (lines.length - 2) * 31, o);
    });
  }

  /** The proof box: ink, an amber head, then lines of Plex. `stats`: [big, label line 1, label line 2]. → its height */
  function proofBox(ctx, x, y, w, { head, stats = [], lines = [] }, k) {
    const pad = 30;
    const statH = stats.length ? 120 : 0;
    const h = 24 + 28 + (stats.length ? 14 + statH : 6) + lines.length * 30 + 22;
    box(ctx, x, y, w, h, INK, k);
    const hk = sized(ctx, head, w - pad * 2, { size: 21, face: FACE.monoBold, spacing: 2.5, color: AMBER, alpha: k }, 14);
    text(ctx, head, x + pad, y + 24 + 21, hk);
    let sx = x + pad;
    const sy = y + 24 + 28 + 14;
    for (const [big, l1, l2] of stats) {
      const bw = text(ctx, big, sx, sy + 48, { size: 54, face: FACE.led, color: PAPER, alpha: k });
      const lo = { size: 17, face: FACE.mono, spacing: 1.6, color: PAPER, alpha: k * 0.85 };
      const lw = Math.max(measure(ctx, l1, lo), measure(ctx, l2 ?? "", lo));
      text(ctx, l1, sx, sy + 48 + 30, lo);
      if (l2) text(ctx, l2, sx, sy + 48 + 52, lo);
      sx += Math.max(bw, lw) + 38;
    }
    const ly = y + 24 + 28 + (stats.length ? 14 + statH : 6);
    lines.forEach((l, i) => {
      const o = sized(ctx, l, w - pad * 2, { size: 20, face: FACE.mono, spacing: 0.3, color: PAPER, alpha: k }, 15);
      text(ctx, l, x + pad, ly + i * 30 + 20, o);
    });
    return h;
  }
  /** The box's height without drawing it (the same sums as proofBox). */
  const proofHeight = ({ stats = [], lines = [] }) => 24 + 28 + (stats.length ? 14 + 120 : 6) + lines.length * 30 + 22;

  /** Wrap words into lines no wider than `width`. */
  function wrap(ctx, s, width, o) {
    const out = [];
    let cur = "";
    for (const w of s.split(" ")) {
      const next = cur ? `${cur} ${w}` : w;
      if (cur && measure(ctx, next, o) > width) { out.push(cur); cur = w; } else cur = next;
    }
    if (cur) out.push(cur);
    return out;
  }

  /** A still and a reel of one layout; `layout(ctx, oy, k, t, still)`, k(a, b) = 1 at rest, eased in over [a, b] s in the video. */
  function post(series, file, duration, layout) {
    const page = (ctx, h) => box(ctx, 0, 0, W, h, PAPER);
    return {
      series,
      still: { id: `${series}-still`, kind: "post", file, w: W, h: H, duration: 0, poster: 0, draw(ctx) { ctx.save(); page(ctx, H); layout(ctx, 0, () => 1, Infinity, true); ctx.restore(); } },
      reel: {
        id: `${series}-reel`, kind: "reel", file: `${file}-reel`, w: W, h: REEL_H, duration, poster: duration - 0.5,
        draw(ctx, t) { ctx.save(); page(ctx, REEL_H); layout(ctx, REEL_TOP, (a, b) => easeOut(seg(t, a, b)), t, false); ctx.restore(); },
      },
    };
  }

  // ── the card hit ────────────────────────────────────────────────────

  function cardhitPost(date, f) {
    if (!f?.cards?.length) return null;
    const legs = f.cards.reduce((n, c) => n + c.legs.length, 0);
    const rarity = cardRarity(f);
    const proof = {
      head: up(f.seal ? `Built from the ${et(f.seal.committed_at)} seal · on GitHub` : "Built from the morning seal · on GitHub"),
      lines: f.seal ? [
        `${f.seal.file ?? "seal"} · sha256 ${shortHash(f.seal.sha256)}`,
        `Sealed ${et(f.seal.committed_at)}. First tip ${et(f.firstTip)}.`,
        "One fixed rule builds the cards: rebuild them from that file.",
      ] : [`First tip ${et(f.firstTip)}.`],
    };
    const ph = proofHeight(proof);
    // the cards' block at size 1: a card's head (label, headline, chance) is 79 px, a leg 44, 20 between cards
    const top = 218, oddsH = rarity ? 52 : 0;
    const need = f.cards.length * 79 + (f.cards.length - 1) * 20 + legs * 44;
    // a three-card night takes the compact footer (the share card's): the box may then reach y 1210
    const compact = top + need + oddsH + 18 + ph > 1182;
    const proofTop = (compact ? 1210 : 1182) - ph;
    const room = proofTop - 18 - oddsH - top;
    const sc = clamp(room / need, 1, 2); // a night of one or two cards draws them larger
    const headH = Math.round(79 * sc), rowH = Math.floor(clamp((room - f.cards.length * headH - (f.cards.length - 1) * 20) / legs, 44, 44 * sc));
    const used = f.cards.length * headH + (f.cards.length - 1) * 20 + legs * rowH;
    const air = Math.max(0, room - used); // what is left: a third above the cards, the rest below
    const title = f.all && f.night > 1 ? "Clutch's cards · every card hit" : f.cards.length === 1 ? "Clutch's card hit" : `Clutch's cards · ${f.cards.length} of ${f.night} hit`;
    // the video: each card ~2 s, a leg every 0.3 s
    let at = 1.6;
    const times = f.cards.map((c) => { const s0 = at; at += 0.7 + c.legs.length * 0.3 + 0.4; return s0; });
    const end = at;
    const duration = Math.max(12, Math.ceil(end + 4.5));

    const layout = (ctx, oy, k) => {
      band(ctx, oy, up(title), up(mdy(date)), k(0, 0.6));
      const hk = k(0.3, 1.1);
      const head = cardHead(f);
      const rl = [`${f.games} game${f.games === 1 ? "" : "s"}`, "every leg won"].map(up);
      const rw = Math.max(...rl.map((l) => measure(ctx, l, label())));
      text(ctx, head, PAD, oy + 188 + (1 - hk) * 24, sized(ctx, head, W - PAD * 2 - rw - 40, { size: 84, face: FACE.title, spacing: -2, alpha: hk }, 48));
      rl.forEach((l, i) => text(ctx, l, W - PAD, oy + 155 + i * 30, { ...label(), align: "right", alpha: hk }));
      let y = oy + top + Math.round(air / 3);
      f.cards.forEach((c, ci) => {
        const t0 = times[ci];
        const ck = k(t0, t0 + 0.6);
        const u = headH / 79;
        text(ctx, up(`${TIER[c.tier]} card · ${SUB[c.tier]}`), PAD, y + 18 * u, { ...label(Math.round(22 * Math.min(u, 1.15))), alpha: ck });
        text(ctx, forFor(c.legs.length), PAD, y + 60 * u, { size: Math.round(36 * u), face: FACE.title, spacing: -0.5, alpha: ck });
        pctNum(ctx, pct(c.chance), W - PAD, y + 38 * u, Math.round(52 * u), { align: "right", alpha: ck });
        text(ctx, "CLUTCH'S CHANCE", W - PAD, y + 66 * u, { ...label(Math.round(22 * Math.min(u, 1.15))), align: "right", alpha: ck });
        y += headH;
        line(ctx, PAD, y, (W - PAD * 2) * ck, 2);
        c.legs.forEach((l, li) => {
          const lk = k(t0 + 0.5 + li * 0.3, t0 + 0.9 + li * 0.3);
          const cy = y + rowH / 2;
          const ms = Math.round(clamp(rowH * 0.62, 30, 50));
          mark(ctx, true, PAD, cy - ms / 2, ms, lk);
          const nameO = { size: Math.round(clamp(rowH * 0.52, 25, 42)), face: FACE.name, alpha: lk };
          text(ctx, l.name, PAD + ms + 16, cy + nameO.size * 0.36, nameO);
          const fo = { size: Math.round(clamp(rowH * 0.46, 23, 36)), face: FACE.monoBold, spacing: 0.5, align: "right", alpha: lk };
          if (l.final) text(ctx, l.final, W - PAD, cy + fo.size * 0.36, fo);
          const po = { size: Math.round(clamp(rowH * 0.4, 21, 30)), face: FACE.mono, align: "right", alpha: lk * 0.72 };
          text(ctx, `${pct(l.chance)}%`, W - PAD - Math.round(fo.size * 10.9), cy + po.size * 0.36, po);
          y += rowH;
          line(ctx, PAD, y, (W - PAD * 2) * lk, 1.5);
        });
        y += 20;
      });
      y += air - Math.round(air / 3) - 20;
      if (rarity) {
        const s1 = `By Clutch's own numbers, ${rarity.text}.`;
        text(ctx, s1, PAD, y + 34, sized(ctx, s1, W - PAD * 2, { size: 26, face: FACE.italic, alpha: k(end - 0.2, end + 0.6) }, 18));
      }
      proofBox(ctx, PAD, oy + proofTop, W - PAD * 2, proof, k(end + 0.4, end + 1.2));
      footer(ctx, oy, [up(f.seal?.repo ?? "github.com/uguraltunbas/clutch-receipts"), "CLUTCHLEDGER.COM"], k(0.2, 1), compact);
    };
    return post("cardhit", `clutch-cardhit-${date}`, duration, layout);
  }

  // ── the hot run ─────────────────────────────────────────────────────

  function hotrunPost(date, f) {
    if (!f?.kind) return null;
    const isMark = f.kind === "mark";
    const misses = isMark ? [] : f.misses.slice(0, 3).map(missLine);
    const [hr, hw] = heroOf(f);
    const lead = f.lead ? `${f.lead[0]}-${f.lead[1]}H` : null;
    const n = f.sealed.of;
    const stats = [[`${f.sealed.count}/${n}`, "SEALED", "BEFORE TIP"]];
    if (isMark) {
      if (lead) stats.push([lead, "FIRST SEALED", "BEFORE TIP"]);
      stats.push(f.runFrom ? [`${f.record.right}-${f.record.wrong}`, "AT 75%+", f.since ? `SINCE ${up(md(f.since))}` : "THIS SEASON"] : [String(nights(f)), "NIGHTS", `${f.season.slice(0, 4)}–${f.season.slice(5)} SEASON`]);
    } else {
      if (f.ended > 0) stats.push([String(f.ended), "THE RUN", "THAT ENDED"]);
      stats.push([f.record.expected.toFixed(1), "ITS NUMBERS", "EXPECTED RIGHT"]);
    }
    const said = isMark
      ? `${lead ? `Clutch never switched sides in any of the ${n}. ` : ""}Its own numbers expected ${f.runExpected.toFixed(1)} right: a hot run, not a promise.`
      : `Its own numbers expected ${f.record.expected.toFixed(1)} right of ${f.record.right + f.record.wrong}. The misses stay on the record.`;
    const proof = { head: "SEALED BEFORE TIP · ON GITHUB · CHECK IT YOURSELF", stats, lines: [] };
    // the sentence wraps inside the box: measured with the page's own font once drawing starts
    const tiles = f.tiles;
    const next = isMark ? 1 : 0;
    // the video: the hero counts, then a tile every 0.11 s
    const tilesAt = 2.4;
    const step = clamp(4 / Math.max(tiles.length, 1), 0.04, 0.12);
    const end = tilesAt + tiles.length * step + 0.6;
    const duration = Math.max(12, Math.ceil(end + 4.5));

    const layout = (ctx, oy, k, t, still) => {
      const lines = wrap(ctx, said, W - PAD * 2 - 60, { size: 20, face: FACE.mono, spacing: 0.3 });
      const pr = { ...proof, lines };
      const ph = proofHeight(pr);
      const proofTop = 1176 - ph;
      band(ctx, oy, up(`Clutch's Ledger · ${seasonLabel(f.season)}`), up(`Through ${md(f.through)}`), k(0, 0.6));
      const kk = k(0.3, 0.9);
      const kick = up(runKicker(f));
      text(ctx, kick, PAD, oy + 150, sized(ctx, kick, W - PAD * 2, { size: 24, face: FACE.monoBold, spacing: 3, alpha: kk }, 16));
      // the hero: the run counting up in the video, at rest in the still
      const hk = k(0.5, 1.2);
      const count = still || !isMark ? hr : Math.round(hr * easeOut(seg(t, 0.6, 2.2)));
      const hero = `${count}-${hw}`;
      const heroFull = `${hr}-${hw}`;
      const ho = sized(ctx, heroFull, W - PAD * 2 + 16, { size: 252, face: FACE.led, spacing: -5, alpha: hk }, 120);
      text(ctx, hero, PAD - 8, oy + 368, ho);
      const lk = k(1.4, 2.1);
      const lede = runLede(f);
      text(ctx, lede, PAD, oy + 450 + (1 - lk) * 20, sized(ctx, lede, W - PAD * 2, { size: 50, face: FACE.title, spacing: -0.5, alpha: lk }, 34));
      let y = oy + 488;
      // a break's misses, each with its final
      misses.forEach((m, i) => {
        const mk = k(1.8 + i * 0.3, 2.4 + i * 0.3);
        const cy = y + 28;
        mark(ctx, false, PAD, cy - 17, 34, mk);
        const nw = text(ctx, m.name, PAD + 50, cy + 10, { size: 28, face: FACE.name, alpha: mk });
        text(ctx, `${m.pct}%`, PAD + 50 + nw + 18, cy + 9, { size: 22, face: FACE.mono, alpha: mk * 0.72 });
        text(ctx, `LOST ${m.score} ${m.opp}`, W - PAD, cy + 10, { size: 24, face: FACE.monoBold, spacing: 0.5, align: "right", alpha: mk });
        y += 56;
        line(ctx, PAD, y, (W - PAD * 2) * mk, 1.5);
      });
      if (misses.length) y += 18;
      // the tiles: the newest that fit, an "earlier" tile when some don't, NEXT on a mark
      const avail = oy + proofTop - 24 - y;
      const gap = 10;
      let cols = 8, th = 90, rows = 1, show = tiles.length;
      for (const c of [8, 10, 12, 14]) {
        cols = c;
        const tw = (W - PAD * 2 - (c - 1) * gap) / c;
        th = Math.round(tw * 0.8);
        const fitRows = Math.max(1, Math.floor((avail + gap) / (th + gap)));
        const want = tiles.length + next + (f.tilesFor > tiles.length ? 1 : 0);
        rows = Math.min(fitRows, Math.ceil(want / c));
        if (want <= fitRows * c) { show = tiles.length; break; }
        show = fitRows * c - next - 1;
      }
      const tw = (W - PAD * 2 - (cols - 1) * gap) / cols;
      const drawn = tiles.slice(tiles.length - show);
      const earlier = f.tilesFor - drawn.length;
      const cells = [...(earlier > 0 ? [{ earlier }] : []), ...drawn, ...(next ? [{ next: true }] : [])];
      cells.forEach((c, i) => {
        const x = PAD + (i % cols) * (tw + gap), ty = y + Math.floor(i / cols) * (th + gap);
        const ti = drawn.indexOf(c);
        const ck = c.next ? k(tilesAt + drawn.length * step, tilesAt + drawn.length * step + 0.5) : c.earlier ? k(tilesAt - 0.3, tilesAt + 0.2) : k(tilesAt + ti * step, tilesAt + ti * step + 0.35);
        if (ck <= 0) return;
        const code = { size: Math.round(th * 0.36), face: FACE.led, spacing: -1 };
        const small = { size: Math.round(th * 0.19), face: FACE.mono, spacing: 1 };
        if (c.next || c.earlier) {
          ctx.save();
          ctx.globalAlpha *= ck;
          ctx.strokeStyle = INK;
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(x + 1, ty + 1, tw - 2, th - 2);
          ctx.restore();
          text(ctx, c.next ? "?" : `+${c.earlier}`, x + th * 0.11, ty + th * 0.6, { ...code, alpha: ck });
          text(ctx, c.next ? "NEXT" : "EARLIER", x + th * 0.11, ty + th * 0.86, { ...small, alpha: ck });
          return;
        }
        if (c.correct) {
          box(ctx, x, ty, tw, th, INK, ck);
          tick(ctx, x + tw - th * 0.36, ty + th * 0.04, th * 0.3, AMBER, ck);
          text(ctx, c.pick, x + th * 0.11, ty + th * 0.6, { ...code, color: PAPER, alpha: ck });
          text(ctx, `${c.pct}%`, x + th * 0.11, ty + th * 0.86, { ...small, color: PAPER, alpha: ck * 0.82 });
        } else {
          ctx.save();
          ctx.globalAlpha *= ck;
          ctx.strokeStyle = INK;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, ty + 1, tw - 2, th - 2);
          ctx.restore();
          cross(ctx, x + tw - th * 0.36, ty + th * 0.04, th * 0.3, INK, ck);
          text(ctx, c.pick, x + th * 0.11, ty + th * 0.6, { ...code, alpha: ck });
          text(ctx, `${c.pct}%`, x + th * 0.11, ty + th * 0.86, { ...small, alpha: ck });
        }
      });
      proofBox(ctx, PAD, oy + proofTop, W - PAD * 2, pr, k(end, end + 0.8));
      footer(ctx, oy, [up(f.repo ?? "github.com/uguraltunbas/clutch-receipts"), "CLUTCHLEDGER.COM/LEDGER"], k(0.2, 1));
    };
    return post("hotrun", `clutch-hotrun-${date}`, duration, layout);
  }

  /** Every face these posts draw with (the page's @font-face list), loaded before the first frame. */
  async function fontsReady() {
    if (typeof document === "undefined") return;
    await Promise.all(Object.values(FACE).map((f) => document.fonts.load(`40px "${f}"`).catch(() => null)));
  }

  globalThis.ClutchPaper = { cardhitPost, cardhitCaption, cardhitTitle, hotrunPost, hotrunCaption, hotrunTitle, fontsReady, xLength, FACE };
})();
