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
	const randomSuffix = Math.random()
		.toString(36)
		.substring(2, 9)
		.toUpperCase();

	return `SKU-${timestamp}-${randomSuffix}`;
}

/**
 * Génère un code SKU avec préfixe personnalisé
 *
 * @param prefix - Préfixe à utiliser (défaut: "SKU")
 * @returns Code SKU unique
 */
export function generateSkuCodeWithPrefix(prefix: string = "SKU"): string {
	const timestamp = Date.now();
	const randomSuffix = Math.random()
		.toString(36)
		.substring(2, 9)
		.toUpperCase();

	return `${prefix}-${timestamp}-${randomSuffix}`;
}

/**
 * Génère un code SKU basé sur un produit et ses attributs
 *
 * Format : {productCode}-{color}-{material}-{size}
 * Les parties vides sont omises
 *
 * @param productCode - Code du produit (ex: "BAGUE")
 * @param colorCode - Code couleur (ex: "OR")
 * @param materialCode - Code matériau (ex: "750")
 * @param sizeCode - Code taille (ex: "52")
 * @returns Code SKU structuré
 */
export function generateStructuredSkuCode(
	productCode: string,
	colorCode?: string | null,
	materialCode?: string | null,
	sizeCode?: string | null
): string {
	const parts = [productCode];

	if (colorCode) parts.push(colorCode);
	if (materialCode) parts.push(materialCode);
	if (sizeCode) parts.push(sizeCode);

	return parts.join("-").toUpperCase();
}

/**
 * Génère un suffixe aléatoire pour les codes SKU
 *
 * @param length - Longueur du suffixe (défaut: 4)
 * @returns Suffixe aléatoire en majuscules
 */
export function generateRandomSuffix(length: number = 4): string {
	return Math.random()
		.toString(36)
		.substring(2, 2 + length)
		.toUpperCase();
}
