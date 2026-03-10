import { type Prisma } from "@/app/generated/prisma/client";

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
	shippingCarrier: true,
	trackingNumber: true,
	trackingUrl: true,
	shippedAt: true,
	actualDelivery: true,
	paymentMethod: true,
	paidAt: true,
	// ROADMAP: Invoices - add invoiceNumber, invoiceGeneratedAt, invoiceStatus, stripeInvoiceId
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
