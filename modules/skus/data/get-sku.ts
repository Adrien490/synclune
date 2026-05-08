import { isAdmin } from "@/modules/auth/utils/guards";
import { logger } from "@/shared/lib/logger";
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

	try {
		return await fetchSkuById(skuId);
	} catch (error) {
		logger.error("Failed to fetch sku by id", error, { service: "getSkuById" });
		return null;
	}
}

/**
 * Récupère le SKU avec ses images depuis la DB avec cache
 * Note: pas de try/catch ici — une erreur DB ne doit pas être mise en cache comme null.
 */
async function fetchSkuById(skuId: string): Promise<SkuWithImages | null> {
	"use cache";
	cacheSkuDetailById(skuId);

	return prisma.productSku.findUnique({
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
}

// ============================================================================
// GET SKU DETAIL BY ID — page détail admin enrichie
// ============================================================================

export type SkuDetailReturn = NonNullable<Awaited<ReturnType<typeof fetchSkuDetailById>>>;

export async function getSkuDetailById(skuId: string) {
	if (!skuId) return null;

	const admin = await isAdmin();
	if (!admin) return null;

	try {
		return await fetchSkuDetailById(skuId);
	} catch (error) {
		logger.error("Failed to fetch sku detail by id", error, { service: "getSkuDetailById" });
		return null;
	}
}

async function fetchSkuDetailById(skuId: string) {
	"use cache";
	cacheSkuDetailById(skuId);

	return prisma.productSku.findUnique({
		where: { id: skuId },
		select: {
			id: true,
			sku: true,
			productId: true,
			priceInclTax: true,
			compareAtPrice: true,
			inventory: true,
			isActive: true,
			isDefault: true,
			size: true,
			createdAt: true,
			updatedAt: true,
			color: { select: { id: true, name: true, hex: true, slug: true } },
			material: { select: { id: true, name: true, slug: true } },
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
			_count: { select: { orderItems: true } },
			product: {
				select: {
					id: true,
					slug: true,
					title: true,
					status: true,
					_count: { select: { skus: true } },
					skus: {
						where: { isDefault: true },
						take: 1,
						select: {
							images: {
								where: { isPrimary: true },
								take: 1,
								select: { url: true, blurDataUrl: true, altText: true },
							},
						},
					},
				},
			},
		},
	});
}
