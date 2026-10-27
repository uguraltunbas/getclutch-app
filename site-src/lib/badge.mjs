// A one-line SVG badge in the shields.io shape: a dark label on the left, the
// number on amber on the right. For the places that refuse an <iframe> box
// (/embed/…) but show an image: a GitHub README, Substack, a forum post. The
// files themselves are built in lib/pages/embed.mjs (badgeFiles).
//
// The text is Verdana 11px, the font shields.io measures with. Each piece is
// sized from the table below and pinned with textLength, so a reader whose
// fallback font is narrower or wider still sees the text fill its half.

import { esc } from "./html.mjs";

// Advance widths in px at 11px Verdana: a–z, A–Z, then digits and the few signs the badges use.
const LOWER = [6.7, 6.9, 5.8, 6.9, 6.7, 3.9, 6.9, 7, 3, 3.8, 6.5, 3, 10.7, 7, 6.7, 6.9, 6.9, 4.7, 5.7, 4.3, 7, 6.5, 9, 6.5, 6.5, 5.8];
const UPPER = [7.5, 7.6, 7.7, 8.5, 7, 6.3, 8.5, 8.3, 4.6, 5, 7.6, 6.1, 9.4, 8.2, 8.7, 6.6, 8.7, 7.7, 7.5, 6.8, 8.1, 7.5, 11.1, 7.5, 6.8, 7.5];
const SIGNS = { " ": 3.9, "%": 11.9, "·": 4.4, "–": 7, "-": 4.9, ".": 3.9, ",": 3.9, ":": 4.6, "'": 2.7, "’": 2.7, "@": 12 };

/** The text's width in px; an unknown character counts as a wide letter. */
export function textWidth(s) {
  let w = 0;
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    w += c >= 97 && c <= 122 ? LOWER[c - 97] : c >= 65 && c <= 90 ? UPPER[c - 65] : c >= 48 && c <= 57 ? 7 : SIGNS[ch] ?? 7.5;
  }
  return w;
}

/** The badge's SVG. `alt` is what a screen reader says, and the tooltip. */
export function badgeSvg(label, message, alt) {
  const lw = Math.round(textWidth(label) + 12);
  const mw = Math.round(textWidth(message) + 12);
  const w = lw + mw;
  const text = (x, s) => `<text x="${x}" y="14" textLength="${Math.round(textWidth(s))}">${esc(s)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${esc(alt)}"><title>${esc(alt)}</title><clipPath id="r"><rect width="${w}" height="20" rx="3"/></clipPath><g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#15130F"/><rect x="${lw}" width="${mw}" height="20" fill="#FFB020"/></g><g text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11"><g fill="#F1E9D8">${text(lw / 2, label)}</g><g fill="#15130F">${text(lw + mw / 2, message)}</g></g></svg>\n`;
}
