import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// SELECT DEFINITION - ORDER ITEMS LIST
// ============================================================================

export const GET_ORDER_ITEMS_DEFAULT_SELECT = {
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
			status: true,
			createdAt: true,
		},
	},
	product: {
		select: {
			id: true,
			slug: true,
			title: true,
			status: true,
		},
	},
	sku: {
		select: {
			id: true,
			sku: true,
			color: {
				select: {
					id: true,
					name: true,
					hex: true,
				},
			},
			materialRelation: {
				select: {
					id: true,
					name: true,
				},
			},
			size: true,
		},
	},
} as const satisfies Prisma.OrderItemSelect;

// ============================================================================
// PAGINATION & SORTING
// ============================================================================

export const GET_ORDER_ITEMS_DEFAULT_PER_PAGE = 50;
export const GET_ORDER_ITEMS_MAX_RESULTS_PER_PAGE = 200;
export const GET_ORDER_ITEMS_DEFAULT_SORT_BY = "createdAt";
export const GET_ORDER_ITEMS_DEFAULT_SORT_ORDER = "desc";

export const GET_ORDER_ITEMS_SORT_FIELDS = [
	"createdAt",
	"updatedAt",
	"price",
	"quantity",
] as const;

// ============================================================================
// CACHE SETTINGS
// ============================================================================

export const GET_ORDER_ITEMS_DEFAULT_CACHE = {
	revalidate: 60 * 5,
	stale: 60 * 10,
	expire: 60 * 30,
} as const;
