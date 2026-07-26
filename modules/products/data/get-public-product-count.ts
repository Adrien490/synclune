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
	"use cache";

	cacheLife("catalog");
	cacheTag(PRODUCTS_CACHE_TAGS.LIST);

	try {
		return await prisma.product.count({
			where: { status: "PUBLIC", ...notDeleted },
		});
	} catch (error) {
		logger.error("Failed to count public products", error, {
			service: "getPublicProductCount",
		});
		return 0;
	}
}
