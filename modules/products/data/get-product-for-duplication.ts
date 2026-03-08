import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { cacheProductDetail } from "@/modules/products/utils/cache.utils";

// ============================================================================
// TYPES
// ============================================================================

export type ProductForDuplication = Awaited<ReturnType<typeof fetchProductForDuplication>>;

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère un produit avec toutes les données nécessaires à la duplication
 *
 * Inclut: collections, SKUs avec images
 * Utilisé par duplicate-product.ts
 *
 * @param productId - ID du produit à dupliquer
 */
export async function getProductForDuplication(productId: string): Promise<ProductForDuplication> {
	return fetchProductForDuplication(productId);
}

// ============================================================================
// FETCH FUNCTION (CACHED)
// ============================================================================

async function fetchProductForDuplication(productId: string) {
	"use cache";

	// Le product n'a pas encore de slug connu, on cache par ID
	cacheProductDetail(`product-id-${productId}`);

	try {
		return await prisma.product.findFirst({
			where: { id: productId, ...notDeleted },
			select: {
				id: true,
				title: true,
				slug: true,
				description: true,
				typeId: true,
				collections: {
					select: {
						collectionId: true,
						collection: {
							select: { slug: true },
						},
					},
				},
				skus: {
					select: {
						sku: true,
						priceInclTax: true,
						compareAtPrice: true,
						inventory: true,
						isActive: true,
						isDefault: true,
						colorId: true,
						materialId: true,
						size: true,
						images: {
							select: {
								url: true,
								thumbnailUrl: true,
								blurDataUrl: true,
								altText: true,
								mediaType: true,
								isPrimary: true,
								position: true,
							},
						},
					},
				},
			},
		});
	} catch (error) {
		logger.error("Failed to fetch product for duplication", error, {
			service: "fetchProductForDuplication",
		});
		return null;
	}
}
