import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { prisma } from "@/shared/lib/prisma";

// ============================================================================
// SINGLE SKU QUERY
// ============================================================================

/**
 * Fetches a SKU with all relations needed for validation (stock check, soft-delete check)
 *
 * Cached with `checkout` profile (60s stale / 30s revalidate / 5min expire).
 * Tags: SKU_STOCK (invalidated on inventory mutations) + SKU_DETAIL_BY_ID
 * (invalidated on price/status/soft-delete changes). Overselling is prevented
 * downstream by `FOR UPDATE` row locks in `order-creation.service.ts`.
 */
export async function fetchSkuForValidation(skuId: string) {
	"use cache";
	cacheLife("checkout");
	cacheTag(PRODUCTS_CACHE_TAGS.SKU_STOCK(skuId), PRODUCTS_CACHE_TAGS.SKU_DETAIL_BY_ID(skuId));

	return prisma.productSku.findUnique({
		where: { id: skuId },
		select: {
			id: true,
			sku: true,
			priceInclTax: true,
			compareAtPrice: true,
			inventory: true,
			isActive: true,
			size: true,
			deletedAt: true,
			product: {
				select: {
					id: true,
					title: true,
					slug: true,
					status: true,
					description: true,
					deletedAt: true,
				},
			},
			images: {
				orderBy: { createdAt: "asc" },
				select: {
					url: true,
					altText: true,
					isPrimary: true,
				},
			},
			colors: {
				select: {
					colorId: true,
					position: true,
					color: {
						select: {
							id: true,
							name: true,
							hex: true,
						},
					},
				},
				orderBy: { position: "asc" },
			},
			materials: {
				select: {
					materialId: true,
					position: true,
					material: {
						select: {
							id: true,
							name: true,
						},
					},
				},
				orderBy: { position: "asc" },
			},
		},
	});
}

// ============================================================================
// BATCH SKU QUERY
// ============================================================================

/**
 * Fetches multiple SKUs in a single query for batch validation (merge carts, cart validation)
 *
 * Cached with `checkout` profile. Tags each SKU with SKU_STOCK so any inventory
 * mutation on any SKU in the batch invalidates this cache entry.
 */
export async function fetchSkusForBatchValidation(skuIds: string[]) {
	"use cache";
	cacheLife("checkout");
	for (const skuId of skuIds) {
		cacheTag(PRODUCTS_CACHE_TAGS.SKU_STOCK(skuId), PRODUCTS_CACHE_TAGS.SKU_DETAIL_BY_ID(skuId));
	}

	return prisma.productSku.findMany({
		where: { id: { in: skuIds } },
		select: {
			id: true,
			inventory: true,
			isActive: true,
			deletedAt: true,
			product: {
				select: {
					status: true,
					deletedAt: true,
				},
			},
		},
	});
}

/**
 * Fetches multiple SKUs with full details in a single query (checkout session creation).
 *
 * Identical select to `fetchSkuForValidation` but batched, replacing N parallel
 * `findUnique` calls. Same cache profile and tags so invalidation behaves identically.
 */
export async function fetchSkusForCheckoutValidation(skuIds: string[]) {
	"use cache";
	cacheLife("checkout");
	for (const skuId of skuIds) {
		cacheTag(PRODUCTS_CACHE_TAGS.SKU_STOCK(skuId), PRODUCTS_CACHE_TAGS.SKU_DETAIL_BY_ID(skuId));
	}

	return prisma.productSku.findMany({
		where: { id: { in: skuIds } },
		select: {
			id: true,
			sku: true,
			priceInclTax: true,
			compareAtPrice: true,
			inventory: true,
			isActive: true,
			size: true,
			deletedAt: true,
			product: {
				select: {
					id: true,
					title: true,
					slug: true,
					status: true,
					description: true,
					deletedAt: true,
				},
			},
			images: {
				orderBy: { createdAt: "asc" },
				select: {
					url: true,
					altText: true,
					isPrimary: true,
				},
			},
			colors: {
				select: {
					colorId: true,
					position: true,
					color: {
						select: {
							id: true,
							name: true,
							hex: true,
						},
					},
				},
				orderBy: { position: "asc" },
			},
			materials: {
				select: {
					materialId: true,
					position: true,
					material: {
						select: {
							id: true,
							name: true,
						},
					},
				},
				orderBy: { position: "asc" },
			},
		},
	});
}
