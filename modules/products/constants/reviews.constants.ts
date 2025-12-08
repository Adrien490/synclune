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
 *
 * Fonctions: voir utils/seo.ts
 */

/**
 * Configuration des avis - À utiliser avec de VRAIES données uniquement
 */
export const REVIEW_CONFIG = {
	bestRating: 5,
	worstRating: 1,
} as const;

// Re-export pour retrocompatibilite
export { getProductAggregateRating } from "../utils/seo";

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
