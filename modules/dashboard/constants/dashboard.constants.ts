import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// SELECT DEFINITIONS - RECENT ORDERS
// ============================================================================

export const GET_DASHBOARD_RECENT_ORDERS_SELECT = {
	id: true,
	orderNumber: true,
	createdAt: true,
	status: true,
	paymentStatus: true,
	total: true,
	user: {
		select: {
			name: true,
			email: true,
		},
	},
} as const satisfies Prisma.OrderSelect;

// ============================================================================
// SELECT DEFINITIONS - TOP PRODUCTS
// ============================================================================

export const GET_DASHBOARD_TOP_PRODUCTS_SELECT = {
	id: true,
	title: true,
	slug: true,
	skus: {
		select: {
			images: {
				where: { isPrimary: true },
				take: 1,
				select: {
					url: true,
					altText: true,
				},
			},
		},
		take: 1,
	},
} as const satisfies Prisma.ProductSelect;

// ============================================================================
// SELECT DEFINITIONS - STOCK ALERTS
// ============================================================================

export const GET_DASHBOARD_STOCK_ALERTS_SELECT = {
	id: true,
	sku: true,
	inventory: true,
	product: {
		select: {
			id: true,
			title: true,
			slug: true,
		},
	},
	color: {
		select: {
			name: true,
		},
	},
	material: {
		select: {
			id: true,
			name: true,
		},
	},
	size: true,
} as const satisfies Prisma.ProductSkuSelect;

// ============================================================================
// DEFAULTS
// ============================================================================

export const DASHBOARD_RECENT_ORDERS_LIMIT = 5;
export const DASHBOARD_TOP_PRODUCTS_LIMIT = 5;
export const DASHBOARD_STOCK_ALERTS_LIMIT = 10;

// Note: CURRENCY_DIVISOR has been moved to shared/constants/currency.ts
// Import from there: import { CURRENCY_DIVISOR } from "@/shared/constants/currency";

