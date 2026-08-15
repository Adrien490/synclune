/**
 * Utilitaires pour les formulaires de variante
 */

import type { VariantDetail } from "../data/get-variant";
import type { UpdateProductVariantFormValues } from "../types/variant-form.types";

/**
 * Génère les options du formulaire d'édition de variante avec les valeurs
 * pré-remplies — schéma lean : pas de média ni de compareAtPrice, une seule
 * couleur / un seul matériau.
 */
export function getUpdateProductVariantFormOpts(variant: VariantDetail) {
	return {
		defaultValues: {
			variantId: variant.id,
			// Centimes → Euros ; null = hérite du prix produit (champ vide).
			priceEuros: variant.priceCents !== null ? variant.priceCents / 100 : ("" as const),
			stock: variant.stock,
			// String pour le RadioGroupField (cf. UpdateProductVariantFormValues.active).
			active: variant.active ? ("true" as const) : ("false" as const),
			colorId: variant.color?.id ?? "",
			materialId: variant.material?.id ?? "",
			size: variant.size ?? "",
		} satisfies UpdateProductVariantFormValues,
	};
}
