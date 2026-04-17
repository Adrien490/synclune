/**
 * Minimum number of concurrent carts required before showing the "Dans X paniers" FOMO badge.
 *
 * Rationale: showing "Dans 1 panier" is weak social proof and can feel inauthentic. Requiring
 * at least 2 keeps the signal credible and consistent with Etsy / Shopify patterns.
 */
export const CARTS_COUNT_MIN_THRESHOLD = 2;
