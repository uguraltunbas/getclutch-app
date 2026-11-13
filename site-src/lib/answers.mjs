// "The short answers": a page's most-searched questions, each answered in its
// first sentence (answer engines — featured snippets, People Also Ask, AI
// answers, voice — lift one sentence under a question heading). The same
// words go out twice: once on the page, once as FAQPage JSON-LD, nothing added
// to either. Pairs with an empty answer are dropped, so a page asks only what
// its data can answer tonight.

import { esc } from "./html.mjs";

/** [[question, answer], …] → the ones with an answer. */
const kept = (qa) => qa.filter(([q, a]) => q && a);

/** The visible block, in the style of /how-it-works/'s "The short answers". "" when nothing is left to ask. */
export function answersSection(qa, { id = "answers", heading = "The short answers" } = {}) {
  const xs = kept(qa);
  if (!xs.length) return "";
  return `<section class="blk" aria-labelledby="${id}"><h2 id="${id}">${esc(heading)}</h2>${xs.map(([q, a]) => `<div class="blk gap"><h3 class="side-h">${esc(q)}</h3><p>${esc(a)}</p></div>`).join("")}</section>`;
}

/** The same questions as FAQPage JSON-LD, or null when there are none. */
export function faqLd(qa) {
  const xs = kept(qa);
  if (!xs.length) return null;
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: xs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
}
