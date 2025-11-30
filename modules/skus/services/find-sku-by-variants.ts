import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductSku } from "@/modules/products/types/product-services.types";
import {
	matchSkuVariants,
	type VariantSelectors,
} from "../utils/match-sku-variants";

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
export function findSkuByVariants(
	product: GetProductReturn,
	variants: VariantSelectors
): ProductSku | null {
	if (!product.skus) return null;

	return (
		product.skus.find(
			(sku: ProductSku) => sku.isActive && matchSkuVariants(sku, variants)
		) || null
	);
}
