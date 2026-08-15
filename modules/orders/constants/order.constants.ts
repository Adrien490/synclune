import type { OrderStatus, Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// SELECTS — convention repo : les selects vivent dans constants/, jamais en
// ligne dans une fonction data/ (un select invisible rate les migrations).
// ============================================================================

/**
 * Liste admin — snapshots UNIQUEMENT : jamais de jointure vers le produit
 * vivant pour afficher un nom ou un montant (les FK ne servent qu'aux liens).
 */
export const GET_ORDERS_SELECT = {
	id: true,
	invoiceNumber: true,
	status: true,
	email: true,
	customerName: true,
	amountTotalCents: true,
	trackingNumber: true,
	createdAt: true,
	_count: { select: { items: true } },
} as const satisfies Prisma.OrderSelect;

/** Détail admin — tout l'Order + lignes snapshots (FK = liens de navigation). */
export const GET_ORDER_SELECT = {
	id: true,
	invoiceNumber: true,
	status: true,
	stripeSessionId: true,
	stripePaymentIntentId: true,
	amountItemsCents: true,
	amountShippingCents: true,
	amountTotalCents: true,
	email: true,
	customerName: true,
	shippingLine1: true,
	shippingLine2: true,
	shippingZip: true,
	shippingCity: true,
	shippingCountry: true,
	shippedAt: true,
	trackingNumber: true,
	createdAt: true,
	updatedAt: true,
	items: {
		select: {
			id: true,
			productId: true,
			variantId: true,
			nameSnapshot: true,
			variantSnapshot: true,
			unitPriceCents: true,
			quantity: true,
			product: { select: { slug: true } },
		},
	},
} as const satisfies Prisma.OrderSelect;

/** Suivi client + facture — pas de stripeSessionId ni de FK exposées. */
export const GET_ORDER_TRACKING_SELECT = {
	id: true,
	invoiceNumber: true,
	status: true,
	amountItemsCents: true,
	amountShippingCents: true,
	amountTotalCents: true,
	email: true,
	customerName: true,
	shippingLine1: true,
	shippingLine2: true,
	shippingZip: true,
	shippingCity: true,
	shippingCountry: true,
	shippedAt: true,
	trackingNumber: true,
	createdAt: true,
	updatedAt: true,
	items: {
		select: {
			id: true,
			nameSnapshot: true,
			variantSnapshot: true,
			unitPriceCents: true,
			quantity: true,
		},
	},
} as const satisfies Prisma.OrderSelect;

// ============================================================================
// PAGINATION / TRI
// ============================================================================

export const GET_ORDERS_DEFAULT_PER_PAGE = 20;
export const GET_ORDERS_MAX_RESULTS_PER_PAGE = 200;

export const GET_ORDERS_SORT_FIELDS = ["created-descending", "created-ascending"] as const;
export const GET_ORDERS_DEFAULT_SORT_BY = "created-descending";

export const ORDERS_SORT_LABELS: Record<(typeof GET_ORDERS_SORT_FIELDS)[number], string> = {
	"created-descending": "Plus récentes",
	"created-ascending": "Plus anciennes",
};

// ============================================================================
// STATUTS
// ============================================================================

export const ORDER_STATUSES = ["PENDING", "PAID", "SHIPPED", "REFUNDED", "CANCELLED"] as const;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
	PENDING: "En attente de paiement",
	PAID: "Payée — à expédier",
	SHIPPED: "Expédiée",
	REFUNDED: "Remboursée",
	CANCELLED: "Annulée",
};

/** Variante du Badge par statut (sémantique avant décoration). */
export const ORDER_STATUS_BADGE_VARIANTS: Record<
	OrderStatus,
	"default" | "secondary" | "destructive" | "outline"
> = {
	PENDING: "outline",
	PAID: "default",
	SHIPPED: "secondary",
	REFUNDED: "secondary",
	CANCELLED: "destructive",
};

// ============================================================================
// DIALOGS (overlay store)
// ============================================================================

export const MARK_ORDER_AS_SHIPPED_DIALOG_ID = "mark-order-as-shipped";
export const CANCEL_ORDER_DIALOG_ID = "cancel-order";
