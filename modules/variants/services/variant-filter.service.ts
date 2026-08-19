/**
 * Service de filtrage et matching des variantes — schéma lean (lot 2) :
 * une variante porte UNE couleur (FK) et UN matériau (FK). L'identité URL de
 * la couleur est son NOM slugifié (Color n'a plus de colonne slug).
 */

import { slugify } from "@/shared/utils/generate-slug";
import type { BaseProductVariant } from "@/shared/types/product-variant.types";
import type { VariantSelectors } from "../types/variant.types";

export type { VariantSelectors } from "../types/variant.types";

// ============================================================================
// MATCHING FUNCTIONS
// ============================================================================

/**
 * Vérifie si une variante correspond à la sélection de couleur.
 * Priorité : slug (nom slugifié) > hex > id.
 */
export function matchColor(
	variant: BaseProductVariant,
	selectors: Pick<VariantSelectors, "colorSlug" | "colorHex" | "colorId">,
): boolean {
	const { colorSlug, colorHex, colorId } = selectors;

	// Aucune sélection = match par défaut
	if (!colorSlug && !colorHex && !colorId) return true;

	// Pas de couleur sur la variante : le sélecteur expose alors le MATÉRIAU
	// comme identité de pastille (cf. extractVariantInfo) — on matche dessus.
	if (!variant.color) {
		if (colorSlug && variant.material) {
			return slugify(variant.material.name) === slugify(colorSlug);
		}
		return false;
	}

	if (colorSlug) {
		return slugify(variant.color.name) === slugify(colorSlug);
	}

	if (colorHex) {
		const normalize = (hex: string) => hex.toLowerCase().replace(/^#/, "");
		return variant.color.hex ? normalize(variant.color.hex) === normalize(colorHex) : false;
	}

	if (colorId) {
		return variant.color.id === colorId;
	}

	return true;
}

/**
 * Vérifie si une variante correspond à la sélection de matériau
 * (comparaison normalisée via slugify).
 */
export function matchMaterial(
	variant: BaseProductVariant,
	selectors: Pick<VariantSelectors, "material" | "materialSlug">,
): boolean {
	const { material, materialSlug } = selectors;

	if (!material && !materialSlug) return true;
	if (!variant.material) return false;

	const targetMaterial = materialSlug ?? material;
	if (!targetMaterial) return true;

	return slugify(variant.material.name) === slugify(targetMaterial);
}

/**
 * Vérifie si une variante correspond à la sélection de taille.
 * Comparaison INSENSIBLE à la casse (la casse ne porte aucune identité).
 */
export function matchSize(
	variant: BaseProductVariant,
	selectors: Pick<VariantSelectors, "size">,
): boolean {
	const { size } = selectors;
	if (!size) return true;
	return variant.size?.toLowerCase() === size.toLowerCase();
}

/**
 * Vérifie si une variante correspond à tous les sélecteurs.
 */
export function matchVariantSelectors(
	variant: BaseProductVariant,
	selectors: VariantSelectors,
): boolean {
	return (
		matchColor(variant, selectors) &&
		matchMaterial(variant, selectors) &&
		matchSize(variant, selectors)
	);
}

// ============================================================================
// FILTERING FUNCTIONS
// ============================================================================

/**
 * Filtre les variantes compatibles avec une sélection partielle
 * (actives, en stock, correspondant aux sélecteurs).
 */
export function filterCompatibleVariants<
	TVariant extends BaseProductVariant,
	TProduct extends { variants?: TVariant[] | null },
>(product: TProduct, selectedVariants: VariantSelectors): TVariant[] {
	if (!product.variants) return [];

	// Pas d'indirection `selectors_of(variant, selectors)` ici : elle retournait son
	// second argument tel quel, en snake_case, « pour garder la signature stable si
	// des sélecteurs contextuels arrivent plus tard ». Ils ne sont pas arrivés.
	return product.variants.filter((variant: TVariant) => {
		if (!variant.active || variant.stock <= 0) return false;
		return matchVariantSelectors(variant, selectedVariants);
	});
}
