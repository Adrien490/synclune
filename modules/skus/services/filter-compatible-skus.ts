/**
 * Service de filtrage et matching des SKUs
 *
 * Ce module contient les fonctions pures pour :
 * - Matcher les variantes de SKU (couleur, matériau, taille)
 * - Filtrer les SKUs compatibles avec une sélection
 */

import { slugify } from "@/shared/utils/generate-slug";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductSku } from "@/modules/products/types/product-services.types";
import type { VariantSelectors } from "../types/sku.types";

export type { VariantSelectors } from "../types/sku.types";

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

	// Pas de matériau sur le SKU = pas de match
	if (!sku.material) return false;

	const targetMaterial = materialSlug || material;
	if (!targetMaterial) return true;

	// Comparaison normalisée via slugify
	return slugify(sku.material.name) === slugify(targetMaterial);
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

// ============================================================================
// FILTERING FUNCTIONS
// ============================================================================

/**
 * Filtre les SKUs compatibles avec une sélection partielle
 *
 * Retourne uniquement les SKUs:
 * - Actifs (isActive = true)
 * - En stock (inventory > 0)
 * - Correspondant aux variantes sélectionnées
 *
 * @param product - Produit avec ses SKUs
 * @param selectedVariants - Sélecteurs de variantes partiels
 * @returns Liste des SKUs compatibles
 */
export function filterCompatibleSkus(
	product: GetProductReturn,
	selectedVariants: VariantSelectors
): ProductSku[] {
	if (!product.skus) return [];

	return product.skus.filter((sku: ProductSku) => {
		// Critères de base: actif et en stock
		if (!sku.isActive || sku.inventory <= 0) return false;

		// Matching des variantes
		return matchSkuVariants(sku, selectedVariants);
	});
}
