import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";

import { GET_PRODUCT_SKU_SELECT } from "../constants/sku.constants";
import type { SkuWithImages } from "../types/sku.types";
import { cacheSkuDetailById } from "../utils/cache.utils";

// Re-export pour compatibilité
export type { SkuWithImages } from "../types/sku.types";

// ============================================================================
// GET SKU BY ID (pour édition)
// ============================================================================

/**
 * Récupère un SKU par son ID avec ses images
 * Protection: Nécessite un compte ADMIN
 */
export async function getSkuById(skuId: string): Promise<SkuWithImages | null> {
	if (!skuId) return null;

	const admin = await isAdmin();
	if (!admin) return null;

	return fetchSkuById(skuId);
}

/**
 * Récupère le SKU avec ses images depuis la DB avec cache
 */
async function fetchSkuById(skuId: string): Promise<SkuWithImages | null> {
	"use cache";
	cacheSkuDetailById(skuId);

	try {
		const sku = await prisma.productSku.findUnique({
			where: { id: skuId },
			select: {
				...GET_PRODUCT_SKU_SELECT,
				compareAtPrice: true,
				images: {
					select: {
						id: true,
						url: true,
						thumbnailUrl: true,
						blurDataUrl: true,
						altText: true,
						mediaType: true,
						isPrimary: true,
					},
					orderBy: { position: "asc" },
				},
			},
		});

		return sku;
	} catch (error) {
		console.error("[get-sku] Erreur fetchSkuById:", error);
		return null;
	}
}
