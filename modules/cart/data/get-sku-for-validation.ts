import { prisma } from "@/shared/lib/prisma";

// ============================================================================
// TYPES
// ============================================================================

export type SkuForValidation = Awaited<ReturnType<typeof fetchSkuForValidation>>;
export type SkuForDetails = Awaited<ReturnType<typeof fetchSkuForDetails>>;
export type BatchSkuRow = NonNullable<Awaited<ReturnType<typeof fetchSkusForBatchValidation>>>[number];

// ============================================================================
// SINGLE SKU QUERIES
// ============================================================================

/**
 * Fetches a SKU with all relations needed for validation (stock check, soft-delete check)
 */
export async function fetchSkuForValidation(skuId: string) {
	return prisma.productSku.findUnique({
		where: { id: skuId },
		include: {
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
			},
			color: {
				select: {
					id: true,
					name: true,
					hex: true,
				},
			},
			material: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	});
}

/**
 * Fetches a SKU with full relations for display details
 */
export async function fetchSkuForDetails(skuId: string) {
	return prisma.productSku.findUnique({
		where: { id: skuId },
		include: {
			product: true,
			images: {
				orderBy: { createdAt: "asc" },
			},
			color: {
				select: {
					id: true,
					name: true,
					hex: true,
				},
			},
			material: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	});
}

// ============================================================================
// BATCH SKU QUERY
// ============================================================================

/**
 * Fetches multiple SKUs in a single query for batch validation (merge carts, cart validation)
 */
export async function fetchSkusForBatchValidation(skuIds: string[]) {
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
