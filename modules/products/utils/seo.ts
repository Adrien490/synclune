/**
 * Utilitaires SEO pour les produits
 */

import { REVIEW_CONFIG } from "../constants/reviews.constants";

/**
 * Génère le Schema.org AggregateRating pour un produit
 * À utiliser UNIQUEMENT avec de vrais avis depuis la base de données
 *
 * @param ratingValue - Note moyenne réelle
 * @param reviewCount - Nombre réel d'avis
 */
export function getProductAggregateRating(
	ratingValue: number,
	reviewCount: number
) {
	// Ne pas générer si pas d'avis réels
	if (reviewCount === 0) {
		return null;
	}

	return {
		"@type": "AggregateRating",
		ratingValue: ratingValue.toString(),
		reviewCount: reviewCount.toString(),
		bestRating: REVIEW_CONFIG.bestRating.toString(),
		worstRating: REVIEW_CONFIG.worstRating.toString(),
	};
}
