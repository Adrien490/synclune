import { Prisma } from "@/app/generated/prisma";

export const GET_ORDERS_DEFAULT_SELECT = {
	id: true,
	orderNumber: true,
	userId: true,

	// === INFORMATIONS CLIENT ===
	customerEmail: true,
	customerName: true,

	// === IDENTIFIANTS STRIPE ===
	stripePaymentIntentId: true,
	stripeCustomerId: true,

	// === MONTANTS ===
	total: true,
	currency: true,

	// === STATUTS ===
	status: true,
	paymentStatus: true,
	fulfillmentStatus: true,

	// === LIVRAISON ===
	shippingMethod: true,
	shippingCarrier: true,
	trackingNumber: true,
	trackingUrl: true,
	shippedAt: true,

	// === PAIEMENT ===
	paymentMethod: true,
	paidAt: true,

	// === FACTURATION ===
	invoiceNumber: true,
	invoiceStatus: true,
	invoiceGeneratedAt: true,

	createdAt: true,
	updatedAt: true,

	user: {
		select: {
			id: true,
			name: true,
			email: true,
		},
	},

	_count: {
		select: {
			items: true,
		},
	},
} as const satisfies Prisma.OrderSelect;

export const GET_ORDERS_DEFAULT_PER_PAGE = 10;
export const GET_ORDERS_MAX_RESULTS_PER_PAGE = 100;

export const SORT_OPTIONS = {
	CREATED_DESC: "created-descending",
	CREATED_ASC: "created-ascending",
	TOTAL_DESC: "total-descending",
	TOTAL_ASC: "total-ascending",
	STATUS_ASC: "status-ascending",
	STATUS_DESC: "status-descending",
	PAYMENT_STATUS_ASC: "paymentStatus-ascending",
	PAYMENT_STATUS_DESC: "paymentStatus-descending",
	FULFILLMENT_STATUS_ASC: "fulfillmentStatus-ascending",
	FULFILLMENT_STATUS_DESC: "fulfillmentStatus-descending",
} as const;

export const GET_ORDERS_SORT_FIELDS = Object.values(SORT_OPTIONS) as unknown as readonly (typeof SORT_OPTIONS)[keyof typeof SORT_OPTIONS][];

export const SORT_LABELS = {
	[SORT_OPTIONS.CREATED_DESC]: "Plus récentes",
	[SORT_OPTIONS.CREATED_ASC]: "Plus anciennes",
	[SORT_OPTIONS.TOTAL_DESC]: "Montant décroissant",
	[SORT_OPTIONS.TOTAL_ASC]: "Montant croissant",
	[SORT_OPTIONS.STATUS_ASC]: "Statut (A-Z)",
	[SORT_OPTIONS.STATUS_DESC]: "Statut (Z-A)",
	[SORT_OPTIONS.PAYMENT_STATUS_ASC]: "Paiement (A-Z)",
	[SORT_OPTIONS.PAYMENT_STATUS_DESC]: "Paiement (Z-A)",
	[SORT_OPTIONS.FULFILLMENT_STATUS_ASC]: "Livraison (A-Z)",
	[SORT_OPTIONS.FULFILLMENT_STATUS_DESC]: "Livraison (Z-A)",
} as const;

export const GET_ORDERS_DEFAULT_CACHE = {
	revalidate: 60 * 5, // 5 minutes (données sensibles)
	stale: 60 * 10, // 10 minutes
	expire: 60 * 30, // 30 minutes
} as const;
