import { slugify } from "@/shared/utils/generate-slug";
import type { ProductSku } from "@/modules/products/types/product-services.types";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Sélecteurs de variantes pour le matching
 */
export interface VariantSelectors {
	colorId?: string;
	colorSlug?: string;
	colorHex?: string;
	material?: string;
	materialSlug?: string;
	size?: string;
}

// ============================================================================
// MATCHING FUNCTIONS
// ============================================================================

/**
 * Vérifie si un SKU correspond à la sélection de couleur
 * Priorité: slug > hex > id
 *
 * @param sku - SKU à vérifier
 * @param selectors - Sélecteurs de variantes
 * @returns true si la couleur correspond ou si aucune couleur n'est sélectionnée
 */
export function matchColor(
	sku: ProductSku,
	selectors: Pick<VariantSelectors, "colorSlug" | "colorHex" | "colorId">
): boolean {
	const { colorSlug, colorHex, colorId } = selectors;

	// Aucune sélection = match par défaut
	if (!colorSlug && !colorHex && !colorId) return true;

	// Priorité 1: Slug de couleur (recommandé, URL-friendly)
	if (colorSlug) {
		return sku.color?.slug === colorSlug;
	}

	// Priorité 2: Hex code (legacy pour rétrocompatibilité)
	if (colorHex) {
		return sku.color?.hex === colorHex;
	}

	// Priorité 3: ID (legacy)
	if (colorId) {
		return sku.color?.id === colorId;
	}

	return true;
}

/**
 * Vérifie si un SKU correspond à la sélection de matériau
 * Utilise slugify pour normaliser la comparaison
 *
 * @param sku - SKU à vérifier
 * @param selectors - Sélecteurs de variantes
 * @returns true si le matériau correspond ou si aucun matériau n'est sélectionné
 */
export function matchMaterial(
	sku: ProductSku,
	selectors: Pick<VariantSelectors, "material" | "materialSlug">
): boolean {
	const { material, materialSlug } = selectors;

	// Aucune sélection = match par défaut
	if (!material && !materialSlug) return true;

	const targetMaterial = materialSlug || material;

	// Pas de matériau cible ou SKU sans matériau = pas de match
	if (!targetMaterial || !sku.material) return false;

	// Comparaison normalisée via slugify
	return slugify(sku.material) === slugify(targetMaterial);
}

/**
 * Vérifie si un SKU correspond à la sélection de taille
 * Comparaison exacte
 *
 * @param sku - SKU à vérifier
 * @param selectors - Sélecteurs de variantes
 * @returns true si la taille correspond ou si aucune taille n'est sélectionnée
 */
export function matchSize(
	sku: ProductSku,
	selectors: Pick<VariantSelectors, "size">
): boolean {
	const { size } = selectors;

	// Aucune sélection = match par défaut
	if (!size) return true;

	return sku.size === size;
}

/**
 * Vérifie si un SKU correspond à tous les sélecteurs de variantes
 *
 * @param sku - SKU à vérifier
 * @param selectors - Sélecteurs de variantes
 * @returns true si toutes les variantes correspondent
 */
export function matchSkuVariants(
	sku: ProductSku,
	selectors: VariantSelectors
): boolean {
	return (
		matchColor(sku, selectors) &&
		matchMaterial(sku, selectors) &&
		matchSize(sku, selectors)
	);
}
