// Game pages that earned search impressions (Search Console › Performance ›
// Pages, last three months), so the sitemap keeps them after their window of
// recent nights (build.mjs SITEMAP_NIGHTS). Refreshed by hand in the SEO
// routine; a page that earns impressions later is added here. No night page
// (/games/<date>/) had any on the date below.
export const SEARCH_KEEP_UPDATED = "2026-10-30";

export const SEARCH_KEEP = new Set([
  "/games/2026-10-21/mil-at-was/",
  "/games/2026-10-23/lac-at-lal/",
  "/games/2026-10-24/gsw-at-phx/",
  "/games/2026-10-24/hou-at-atl/",
  "/games/2026-10-24/sas-at-dal/",
  "/games/2026-10-25/orl-at-nyk/",
  "/games/2026-10-26/was-at-cha/",
  "/games/2026-10-27/bkn-at-bos/",
  "/games/2026-10-27/det-at-nyk/",
  "/games/2026-10-27/por-at-lal/",
  "/games/2026-10-27/sac-at-sas/",
  "/games/2026-10-28/cha-at-det/",
  "/games/2026-10-28/den-at-nop/",
  "/games/2026-10-28/phi-at-ind/",
]);
