// A team colour that can be seen on the night paper — the app's own rule
// (mobile lib/theme/teamSwatch.ts, ported): team colours are marks, never
// text, so the floor is WCAG's 3:1 for graphics against the ground. A colour
// under it is lifted toward the ink in tenths until it clears (the Nets'
// black, the navy teams), keeping its hue.

export const SWATCH_MIN_CONTRAST = 3;

function parse(c) {
  const h = String(c ?? "").trim().replace("#", "");
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(h)) return null;
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

const hex = ([r, g, b]) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase()}`;

function lum([r, g, b]) {
  const ch = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

/** WCAG contrast of two opaque hex colours; null when either can't be read. */
export function contrastOf(a, b) {
  const x = parse(a), y = parse(b);
  if (!x || !y) return null;
  const la = lum(x), lb = lum(y);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `color` as it should be drawn on `ground`: itself at 3:1 or more, else lifted toward `ink` until it is. */
export function swatchOn(color, ground, ink) {
  const c = parse(color), i = parse(ink);
  const first = contrastOf(color, ground);
  if (!c || !i || first === null || first >= SWATCH_MIN_CONTRAST) return color;
  for (let step = 1; step <= 10; step++) {
    const t = step / 10;
    const m = hex([c[0] + (i[0] - c[0]) * t, c[1] + (i[1] - c[1]) * t, c[2] + (i[2] - c[2]) * t]);
    const k = contrastOf(m, ground);
    if (k !== null && k >= SWATCH_MIN_CONTRAST) return m;
  }
  return ink;
}
