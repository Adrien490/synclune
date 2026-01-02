import type { BaseProductSku } from "@/shared/types/product-sku.types";
import { matchSkuVariants, type VariantSelectors } from "./sku-filter.service";

/**
 * Trouve un SKU par combinaison de variantes
 *
 * STRATÉGIE UNIFIÉE : Utilise le SLUG de couleur comme identifiant unique
 * Le paramètre URL "color" contient maintenant le SLUG de la couleur (ex: "or-rose")
 *
 * @param product - Produit avec ses SKUs
 * @param variants - Sélecteurs de variantes (couleur, matériau, taille)
 * @returns Le SKU correspondant ou null si non trouvé
 */
export function findSkuByVariants<
	TSku extends BaseProductSku,
	TProduct extends { skus?: TSku[] | null }
>(product: TProduct, variants: VariantSelectors): TSku | null {
	if (!product.skus) return null;

	return (
		product.skus.find(
			(sku: TSku) => sku.isActive && matchSkuVariants(sku, variants)
		) || null
	);
}
