/**
 * Configuration des avis produits pour Schema.org
 *
 * Le système d'avis complet est implémenté dans modules/reviews/.
 * Ce fichier expose la configuration Schema.org et le helper SEO.
 *
 * L'AggregateRating ne doit PAS être utilisé avec des données fictives
 * car cela peut entraîner des pénalités SEO de Google.
 */

export const REVIEW_CONFIG = {
	bestRating: 5,
	worstRating: 1,
} as const;

// Re-export pour retrocompatibilite
export { getProductAggregateRating } from "../utils/seo";
