/**
 * Service de filtrage et matching des SKUs
 *
 * Ce module contient les fonctions pures pour :
 * - Matcher les variantes de SKU (couleur, matériau, taille)
 * - Filtrer les SKUs compatibles avec une sélection
 */

import { slugify } from "@/shared/utils/generate-slug";
import type { BaseProductSku } from "@/shared/types/product-sku.types";
import type { VariantSelectors } from "../types/sku.types";
import { buildComboKey } from "./sku-info-extraction.service";

export type { VariantSelectors } from "../types/sku.types";

/**
 * Vérifie si un SKU porte EXACTEMENT la combinaison de couleurs ciblée par
 * `comboKey` (set égalité, ordre indifférent).
 *
 * Utilisé par le sélecteur PDP pour cibler une variante M2M précise via
 * `?variant=or-rose__argent` — strict, contrairement au matchColor « any-of »
 * legacy qui matche dès qu'une couleur du SKU correspond.
 */
export function matchColorCombo(sku: BaseProductSku, comboKey: string): boolean {
	const skuColors = sku.colors;
	if (skuColors.length === 0) return comboKey === "";

	const slugs = skuColors.map((link) => link.color.slug).filter(Boolean);
	if (slugs.length === 0) return false;

	return buildComboKey(slugs) === comboKey;
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
	sku: BaseProductSku,
	selectors: Pick<VariantSelectors, "colorSlug" | "colorHex" | "colorId" | "colorCombo">,
): boolean {
	const { colorSlug, colorHex, colorId, colorCombo } = selectors;

	// Priorité absolue : combo strict (set égalité)
	if (colorCombo) return matchColorCombo(sku, colorCombo);

	// Aucune sélection = match par défaut
	if (!colorSlug && !colorHex && !colorId) return true;

	// Pas de couleur sur le SKU = pas de match (M2M peut être vide)
	if (sku.colors.length === 0) return false;

	// Priorité 1: Slug de couleur (recommandé, URL-friendly).
	// M2M tolérant : match si AU MOINS UNE des couleurs du SKU correspond.
	if (colorSlug) {
		return sku.colors.some((link) => link.color.slug === colorSlug);
	}

	// Priorité 2: Hex code (legacy pour rétrocompatibilité)
	if (colorHex) {
		const normalize = (hex: string) => hex.toLowerCase().replace(/^#/, "");
		const target = normalize(colorHex);
		return sku.colors.some((link) =>
			link.color.hex ? normalize(link.color.hex) === target : false,
		);
	}

	// Priorité 3: ID (legacy)
	if (colorId) {
		return sku.colors.some((link) => link.color.id === colorId);
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
	sku: BaseProductSku,
	selectors: Pick<VariantSelectors, "material" | "materialSlug">,
): boolean {
	const { material, materialSlug } = selectors;

	// Aucune sélection = match par défaut
	if (!material && !materialSlug) return true;

	// Pas de matériau sur le SKU = pas de match
	if (sku.materials.length === 0) return false;

	const targetMaterial = materialSlug ?? material;
	if (!targetMaterial) return true;

	// Comparaison normalisée via slugify (any of M2M materials matches)
	const targetSlug = slugify(targetMaterial);
	return sku.materials.some((m) => slugify(m.material.name) === targetSlug);
}

/**
 * Vérifie si un SKU correspond à la sélection de taille
 * Comparaison exacte
 *
 * @param sku - SKU à vérifier
 * @param selectors - Sélecteurs de variantes
 * @returns true si la taille correspond ou si aucune taille n'est sélectionnée
 */
export function matchSize(sku: BaseProductSku, selectors: Pick<VariantSelectors, "size">): boolean {
	const { size } = selectors;

	// Aucune sélection = match par défaut
	if (!size) return true;

	// Comparaison INSENSIBLE À LA CASSE, par cohérence avec
	// `assertUniqueVariantCombination` qui compare `size` en `mode: "insensitive"` :
	// « M » et « m » sont donc la MÊME variante pour la garde d'unicité (impossible de
	// créer les deux), mais étaient deux tailles DIFFÉRENTES ici — une taille saisie
	// « m » par l'admin restait inatteignable depuis un lien `?size=M`. Rien ne
	// normalise la casse stockée, la casse ne porte donc aucune identité : c'est la
	// sélection qui doit s'aligner, pas le libellé de l'admin qu'il faut écraser.
	return sku.size?.toLowerCase() === size.toLowerCase();
}

/**
 * Vérifie si un SKU correspond à tous les sélecteurs de variantes
 *
 * @param sku - SKU à vérifier
 * @param selectors - Sélecteurs de variantes
 * @returns true si toutes les variantes correspondent
 */
export function matchSkuVariants(sku: BaseProductSku, selectors: VariantSelectors): boolean {
	return matchColor(sku, selectors) && matchMaterial(sku, selectors) && matchSize(sku, selectors);
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
export function filterCompatibleSkus<
	TSku extends BaseProductSku,
	TProduct extends { skus?: TSku[] | null },
>(product: TProduct, selectedVariants: VariantSelectors): TSku[] {
	if (!product.skus) return [];

	return product.skus.filter((sku: TSku) => {
		// Critères de base: actif et en stock
		if (!sku.isActive || sku.inventory <= 0) return false;

		// Matching des variantes
		return matchSkuVariants(sku, selectedVariants);
	});
}
