import type { GetProductReturn } from "@/modules/products/types/product.types";
import { slugify } from "@/shared/utils/slugify";
import type { ProductSku } from "@/modules/products/types/product-services.types";

/**
 * Filtre les SKUs compatibles avec une sélection partielle
 */
export function filterCompatibleSkus(
	product: GetProductReturn,
	selectedVariants: {
		colorId?: string;
		colorSlug?: string;
		colorHex?: string;
		material?: string;
		materialSlug?: string;
		size?: string;
	}
): ProductSku[] {
	if (!product.skus) return [];

	return product.skus.filter((sku: ProductSku) => {
		if (!sku.isActive || sku.inventory <= 0) return false;

		// Matching de couleur : priorité au slug
		let colorMatch = true;
		if (
			selectedVariants.colorSlug ||
			selectedVariants.colorHex ||
			selectedVariants.colorId
		) {
			// Priorité 1: Slug
			if (selectedVariants.colorSlug) {
				colorMatch = sku.color?.slug === selectedVariants.colorSlug;
			}
			// Priorité 2: Hex (legacy)
			else if (selectedVariants.colorHex) {
				colorMatch = sku.color?.hex === selectedVariants.colorHex;
			}
			// Priorité 3: ID (legacy)
			else if (selectedVariants.colorId) {
				colorMatch = sku.color?.id === selectedVariants.colorId;
			}
		}

		// Matching de matériau : normalisation
		let materialMatch = true;
		if (selectedVariants.material || selectedVariants.materialSlug) {
			const targetMaterial =
				selectedVariants.materialSlug || selectedVariants.material;
			if (targetMaterial && sku.material) {
				materialMatch = slugify(sku.material) === slugify(targetMaterial);
			} else {
				materialMatch = false;
			}
		}

		// Matching de taille
		const sizeMatch = !selectedVariants.size || sku.size === selectedVariants.size;

		return colorMatch && materialMatch && sizeMatch;
	});
}
