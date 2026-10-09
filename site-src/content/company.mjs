// Who makes Clutch, and since when — the Company page and the front page's
// Organization record read it from here. Every date is checkable: the first
// commit (April 15, 2026), the App Store's own release date for the app
// (April 24, 2026, apps.apple.com/app/id6761838099), the domain (October
// 2026). A profile link that is null is left out until it exists.

import { APP_STORE } from "../lib/html.mjs";
import { SUPPORT_EMAIL, OPERATOR } from "./legal.mjs";

export const COMPANY = {
  name: "Clutch",
  founder: OPERATOR,
  role: "Founder",
  city: "Istanbul",
  country: "Türkiye",
  countryCode: "TR",
  founded: "2026-04",
  foundedText: "April 2026",
  email: SUPPORT_EMAIL,
  funding: "Bootstrapped: no outside funding.",
  links: {
    appStore: APP_STORE,
    x: "https://x.com/getclutchledger",
    linkedinCompany: null,
    linkedinFounder: null,
  },
  /** [when, what] — oldest first. */
  timeline: [
    ["April 2026", "Work starts on Clutch: the model pipeline and the first iPhone build."],
    ["April 24, 2026", "Clutch's first version goes live on the App Store."],
    ["September 2026", "The model is rebuilt and tested on two full seasons against ESPN's BPI and the market's final price."],
    ["October 2026", "clutchledger.com opens: every game's page and the public Ledger. The web app follows at app.clutchledger.com."],
  ],
};

/** The schema.org Organization for the front page and the Company page. */
export function organizationLd(origin) {
  const { links } = COMPANY;
  const founder = { "@type": "Person", name: COMPANY.founder, jobTitle: COMPANY.role };
  if (links.linkedinFounder) founder.sameAs = [links.linkedinFounder];
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: COMPANY.name,
    url: origin + "/",
    logo: origin + "/icon-512.png",
    email: COMPANY.email,
    foundingDate: COMPANY.founded,
    founder,
    address: { "@type": "PostalAddress", addressLocality: COMPANY.city, addressCountry: COMPANY.countryCode },
    sameAs: [links.appStore, links.x, links.linkedinCompany].filter(Boolean),
  };
}
