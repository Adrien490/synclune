import type { BaseProductVariant } from "@/shared/types/product-variant.types";
import { matchVariantSelectors, type VariantSelectors } from "./variant-filter.service";

/**
 * Trouve un VARIANT par combinaison de variantes
 *
 * STRATÉGIE UNIFIÉE : Utilise le SLUG de couleur comme identifiant unique
 * Le paramètre URL "color" contient maintenant le SLUG de la couleur (ex: "or-rose")
 *
 * @param product - Produit avec ses VARIANTs
 * @param variants - Sélecteurs de variantes (couleur, matériau, taille)
 * @returns Le VARIANT correspondant ou null si non trouvé
 */
export function findVariantBySelectors<
	TVariant extends BaseProductVariant,
	TProduct extends { variants?: TVariant[] | null },
>(product: TProduct, variants: VariantSelectors): TVariant | null {
	if (!product.variants) return null;

	return (
		product.variants.find(
			(variant: TVariant) => variant.active && matchVariantSelectors(variant, variants),
		) ?? null
	);
}
