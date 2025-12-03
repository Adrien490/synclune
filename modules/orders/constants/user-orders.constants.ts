import { Prisma } from "@/app/generated/prisma";

// ============================================================================
// SELECT DEFINITION - USER ORDERS
// ============================================================================

export const GET_USER_ORDERS_SELECT = {
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
	actualDelivery: true,
	paymentMethod: true,
	paidAt: true,
	invoiceNumber: true,
	invoiceGeneratedAt: true,
	invoiceStatus: true,
	stripeInvoiceId: true,
	createdAt: true,
	_count: {
		select: {
			items: true,
		},
	},
} as const satisfies Prisma.OrderSelect;

// ============================================================================
// PAGINATION & SORTING
// ============================================================================

export const GET_USER_ORDERS_DEFAULT_PER_PAGE = 10;
export const GET_USER_ORDERS_MAX_RESULTS_PER_PAGE = 50;

export const USER_ORDERS_SORT_OPTIONS = {
	CREATED_DESC: "created-descending",
	CREATED_ASC: "created-ascending",
	TOTAL_DESC: "total-descending",
	TOTAL_ASC: "total-ascending",
} as const;

export const GET_USER_ORDERS_SORT_FIELDS = Object.values(
	USER_ORDERS_SORT_OPTIONS
) as unknown as readonly (typeof USER_ORDERS_SORT_OPTIONS)[keyof typeof USER_ORDERS_SORT_OPTIONS][];

export const USER_ORDERS_SORT_LABELS = {
	[USER_ORDERS_SORT_OPTIONS.CREATED_DESC]: "Plus récentes",
	[USER_ORDERS_SORT_OPTIONS.CREATED_ASC]: "Plus anciennes",
	[USER_ORDERS_SORT_OPTIONS.TOTAL_DESC]: "Montant décroissant",
	[USER_ORDERS_SORT_OPTIONS.TOTAL_ASC]: "Montant croissant",
} as const;

// ============================================================================
// CACHE SETTINGS
// ============================================================================

export const GET_USER_ORDERS_DEFAULT_CACHE = {
	revalidate: 60,
	stale: 60 * 5,
	expire: 60 * 15,
} as const;
