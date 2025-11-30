import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

export const GET_PRODUCT_SKU_SELECT = {
	id: true,
	sku: true,
	productId: true,
	priceInclTax: true,
	inventory: true,
	isActive: true,
	isDefault: true,
	color: {
		select: {
			id: true,
			name: true,
			hex: true,
		},
	},
	materialId: true,
	materialRef: {
		select: {
			id: true,
			name: true,
		},
	},
	material: true, // Conservé pour compatibilité avec données historiques
	size: true,
	createdAt: true,
	updatedAt: true,
	product: {
		select: {
			id: true,
			slug: true,
			title: true,
			status: true,
		},
	},
} as const satisfies Prisma.ProductSkuSelect;
