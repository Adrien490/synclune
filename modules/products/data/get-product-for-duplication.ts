import { logger } from "@/shared/lib/logger";
import { isAdmin } from "@/modules/admin-auth/lib/require-admin";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { cacheProductDetailById } from "@/modules/products/utils/cache.utils";
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
	// La requête ci-dessous ne filtre pas `status` (dupliquer un DRAFT est le cas
	// nominal) : la garde appartient donc à cette couche, pas au seul appelant.
	// `requireAdmin()` dans `actions/duplicate-product.ts` était l'unique protection
	// — correcte aujourd'hui, mais rien n'empêchait un second appelant de s'en
	// passer. `isAdmin()` (et non `requireAdmin`) : un retour `ActionState` n'a pas
	// de sens dans `data/`. Il est lu ICI, dans le wrapper, jamais dans le scope
	// caché — `headers()` y est interdit.
	if (!(await isAdmin())) {
		return null;
	}

	return fetchProductForDuplication(productId);
}

// ============================================================================
// FETCH FUNCTION (CACHED)
// ============================================================================

async function fetchProductForDuplication(productId: string) {
	"use cache";

	// Le produit n'a pas encore de slug connu côté appelant, on cache par ID.
	// ⚠️ C'était `cacheProductDetail(\`product-id-${productId}\`)` : un id nourri à
	// une fabrique de SLUG, qui émettait `product-product-id-<cuid>` — tag qu'aucun
	// mutateur n'invalidait (tous appellent `DETAIL(slug)`).
	cacheProductDetailById(productId);

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
