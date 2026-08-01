import { cacheLife, cacheTag } from "next/cache";

import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { PRODUCTS_CACHE_TAGS } from "../constants/cache";

/**
 * Compte les créations publiques (storefront).
 * Utilisé par les stats atelier de la home — bien plus léger que getProducts
 * (qui charge tout le catalogue avant pagination JS).
 */
export async function getPublicProductCount(): Promise<number> {
	// Le repli vit ICI, hors du scope de cache. Le `try/catch` était À L'INTÉRIEUR
	// du `"use cache"` : une panne DB transitoire pendant un cache miss retournait
	// `0` NORMALEMENT, donc Next mettait ce `0` en cache pour toute la fenêtre du
	// profil `catalog` (5 min revalidate / 15 min stale / 6 h expire). La home
	// annonçait « 0 création » longtemps après le rétablissement, et rien ne
	// distinguait ce zéro d'un catalogue réellement vide. Même motif que
	// `skus/data/fetch-skus.ts`.
	try {
		return await fetchPublicProductCount();
	} catch (error) {
		logger.error("Failed to count public products", error, {
			service: "getPublicProductCount",
		});
		return 0;
	}
}

async function fetchPublicProductCount(): Promise<number> {
	"use cache";

	cacheLife("catalog");
	cacheTag(PRODUCTS_CACHE_TAGS.LIST);

	return prisma.product.count({
		where: { status: "PUBLIC", ...notDeleted },
	});
}
