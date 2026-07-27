import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { cacheProductDetail } from "@/modules/products/utils/cache.utils";
import { GET_PRODUCT_FOR_DUPLICATION_SELECT } from "../constants/product.constants";

// ============================================================================
// TYPES
// ============================================================================

type ProductForDuplication = Awaited<ReturnType<typeof fetchProductForDuplication>>;

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère un produit avec toutes les données nécessaires à la duplication
 *
 * Inclut: collections, SKUs avec images + couleurs/matériaux M2M
 * Utilisé par duplicate-product.ts
 *
 * Le select vit dans `constants/product.constants.ts` avec les 4 autres du module —
 * il était en ligne ici, et c'est ainsi qu'il a raté la mise à jour M2M de mai 2026.
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
			select: GET_PRODUCT_FOR_DUPLICATION_SELECT,
		});
	} catch (error) {
		logger.error("Failed to fetch product for duplication", error, {
			service: "fetchProductForDuplication",
		});
		return null;
	}
}
