/**
 * Configuration des avis produits pour Schema.org
 *
 * STATUS: DÉSACTIVÉ - Pas de vrais avis clients pour le moment
 *
 * Ce fichier contient des templates pour le système d'avis.
 * À réactiver quand un vrai système d'avis sera implémenté avec :
 * - Table Review dans Prisma
 * - Formulaire de soumission d'avis
 * - Modération des avis
 *
 * L'AggregateRating ne doit PAS être utilisé avec des données fictives
 * car cela peut entraîner des pénalités SEO de Google.
 */

/**
 * Configuration des avis - À utiliser avec de VRAIES données uniquement
 */
export const REVIEW_CONFIG = {
	bestRating: 5,
	worstRating: 1,
} as const;

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

/**
 * TODO: Implémenter un vrai système d'avis
 *
 * Étapes suggérées :
 * 1. Créer table Review dans Prisma (product_id, user_id, rating, comment, date)
 * 2. Créer endpoint API pour soumettre un avis après achat
 * 3. Système de modération (auto-publish ou validation manuelle)
 * 4. Calculer aggregateRating depuis les vraies données
 * 5. Afficher les avis sur les pages produits
 * 6. Réactiver les rich snippets Google avec les vraies données
 */
