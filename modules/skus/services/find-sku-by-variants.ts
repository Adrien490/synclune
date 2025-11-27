import type { GetProductReturn } from "@/modules/products/types/product.types";
import { slugify } from "@/shared/utils/slugify";
import type { ProductSku } from "@/modules/products/types/product-services.types";

/**
 * Trouve un SKU par combinaison de variantes
 * STRATÉGIE UNIFIÉE : Utilise le SLUG de couleur comme identifiant unique
 * Le paramètre URL "color" contient maintenant le SLUG de la couleur (ex: "or-rose")
 */
export function findSkuByVariants(
	product: GetProductReturn,
	variants: {
		colorId?: string;
		colorSlug?: string;
		colorHex?: string;
		material?: string;
		materialSlug?: string;
		size?: string;
	}
): ProductSku | null {
	if (!product.skus) return null;

	return (
		product.skus.find((sku: ProductSku) => {
			// Matching de couleur : priorité au slug
			let colorMatch = true;
			if (variants.colorSlug || variants.colorHex || variants.colorId) {
				// Priorité 1: Slug de couleur (recommandé)
				if (variants.colorSlug) {
					colorMatch = sku.color?.slug === variants.colorSlug;
				}
				// Priorité 2: Hex code (legacy pour rétrocompatibilité)
				else if (variants.colorHex) {
					colorMatch = sku.color?.hex === variants.colorHex;
				}
				// Priorité 3: ID (legacy)
				else if (variants.colorId) {
					colorMatch = sku.color?.id === variants.colorId;
				}
			}

			// Matching de matériau : normalisation sur slugify
			let materialMatch = true;
			if (variants.material || variants.materialSlug) {
				const targetMaterial = variants.materialSlug || variants.material;
				if (targetMaterial && sku.material) {
					materialMatch = slugify(sku.material) === slugify(targetMaterial);
				} else {
					materialMatch = false;
				}
			}

			// Matching de taille (exact)
			const sizeMatch = !variants.size || sku.size === variants.size;

			return sku.isActive && colorMatch && materialMatch && sizeMatch;
		}) || null
	);
}
