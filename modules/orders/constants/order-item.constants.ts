import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// SELECT DEFINITION - ORDER ITEM
// ============================================================================

export const GET_ORDER_ITEM_DEFAULT_SELECT = {
	id: true,
	orderId: true,
	productId: true,
	skuId: true,
	productTitle: true,
	productDescription: true,
	productImageUrl: true,
	skuColor: true,
	skuMaterial: true,
	skuSize: true,
	skuImageUrl: true,
	price: true,
	quantity: true,
	createdAt: true,
	updatedAt: true,
	order: {
		select: {
			id: true,
			orderNumber: true,
			userId: true,
		},
	},
	sku: {
		select: {
			id: true,
			sku: true,
			productId: true,
		},
	},
} as const satisfies Prisma.OrderItemSelect;
