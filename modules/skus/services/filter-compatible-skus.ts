import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductSku } from "@/modules/products/types/product-services.types";
import {
	matchSkuVariants,
	type VariantSelectors,
} from "../utils/match-sku-variants";

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
