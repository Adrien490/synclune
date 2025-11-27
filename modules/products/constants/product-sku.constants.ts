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
	material: true,
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
