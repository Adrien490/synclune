/**
 * Service de génération de codes SKU
 *
 * Ce module contient les fonctions pures pour :
 * - Générer des codes SKU uniques
 * - Formater des codes SKU
 */

// ============================================================================
// SKU GENERATION SERVICE
// Pure functions for generating unique SKU codes
// ============================================================================

/**
 * Génère un code SKU unique
 *
 * Format : SKU-{timestamp}-{random7chars}
 * Exemple : SKU-1704067200000-A2B3C4D
 *
 * @returns Code SKU unique
 */
export function generateSkuCode(): string {
	const timestamp = Date.now();
	const randomSuffix = crypto.randomUUID().replace(/-/g, "").slice(0, 7).toUpperCase();

	return `SKU-${timestamp}-${randomSuffix}`;
}

