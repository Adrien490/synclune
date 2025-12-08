/**
 * Utilitaires pour les formulaires SKU
 */

import type { SkuWithImages } from "../data/get-sku";
import type { UpdateProductSkuFormValues } from "../types/sku-form.types";

/**
 * Génère les options du formulaire d'édition de SKU avec les valeurs pré-remplies
 */
export function getUpdateProductSkuFormOpts(sku: SkuWithImages) {
	// Trouver l'image principale
	const primaryImage = sku.images.find((img) => img.isPrimary);

	// Récupérer les images de galerie (non-primary)
	const galleryMedia = sku.images
		.filter((img) => !img.isPrimary)
		.map((img) => ({
			url: img.url,
			thumbnailUrl: img.thumbnailUrl || undefined,
			thumbnailSmallUrl: img.thumbnailSmallUrl || undefined,
			blurDataUrl: img.blurDataUrl || undefined,
			altText: img.altText || undefined,
			mediaType: img.mediaType,
		}));

	return {
		defaultValues: {
			skuId: sku.id,
			priceInclTaxEuros: sku.priceInclTax / 100, // Centimes → Euros
			compareAtPriceEuros: sku.compareAtPrice
				? sku.compareAtPrice / 100
				: undefined,
			inventory: sku.inventory,
			isDefault: sku.isDefault,
			isActive: sku.isActive,
			colorId: sku.color?.id || "",
			materialId: sku.materialId || "",
			size: sku.size || "",
			primaryImage: primaryImage
				? {
						url: primaryImage.url,
						thumbnailUrl: primaryImage.thumbnailUrl || undefined,
						thumbnailSmallUrl: primaryImage.thumbnailSmallUrl || undefined,
						blurDataUrl: primaryImage.blurDataUrl || undefined,
						altText: primaryImage.altText || undefined,
						mediaType: primaryImage.mediaType,
					}
				: undefined,
			galleryMedia,
		} satisfies UpdateProductSkuFormValues,
	};
}
