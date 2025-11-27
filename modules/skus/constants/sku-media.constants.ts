import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

export const GET_SKU_MEDIA_SELECT = {
	id: true,
	skuId: true,
	url: true,
	altText: true,
	isPrimary: true,
	createdAt: true,
	updatedAt: true,
	sku: {
		select: {
			id: true,
			sku: true,
			productId: true,
		},
	},
} as const satisfies Prisma.SkuMediaSelect;
