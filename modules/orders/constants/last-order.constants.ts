import { Prisma } from "@/app/generated/prisma";

// ============================================================================
// SELECT DEFINITION - LAST ORDER
// ============================================================================

export const GET_LAST_ORDER_DEFAULT_SELECT = {
	id: true,
	orderNumber: true,
	total: true,
	currency: true,
	status: true,
	paymentStatus: true,
	fulfillmentStatus: true,
	trackingNumber: true,
	trackingUrl: true,
	shippedAt: true,
	estimatedDelivery: true,
	paymentMethod: true,
	paidAt: true,
	createdAt: true,
	items: {
		select: {
			id: true,
			productTitle: true,
			productImageUrl: true,
			skuImageUrl: true,
			quantity: true,
			price: true,
		},
		take: 3,
	},
	_count: {
		select: {
			items: true,
		},
	},
} as const satisfies Prisma.OrderSelect;
