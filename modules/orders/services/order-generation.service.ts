/**
 * Service de génération de commandes
 *
 * Ce module contient les fonctions pures pour :
 * - Générer des numéros de commande uniques
 */

// ============================================================================
// ORDER GENERATION SERVICE
// Pure functions for generating order identifiers
// ============================================================================

/**
 * Génère un numéro de commande unique
 *
 * Format : CMD-{timestamp}-{random4chars}
 * Exemple : CMD-1704067200000-A2B3
 *
 * @returns Numéro de commande unique
 */
export function generateOrderNumber(): string {
	const timestamp = Date.now();
	const randomSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();

	return `CMD-${timestamp}-${randomSuffix}`;
}
