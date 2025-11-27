import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// SELECT DEFINITIONS - ORDER LIST
// ============================================================================

export const GET_ORDERS_SELECT = {
	id: true,
	orderNumber: true,
	userId: true,
	customerEmail: true,
	customerName: true,
	stripePaymentIntentId: true,
	stripeCustomerId: true,
	total: true,
	currency: true,
	status: true,
	paymentStatus: true,
	fulfillmentStatus: true,
	shippingMethod: true,
	shippingCarrier: true,
	trackingNumber: true,
	trackingUrl: true,
	shippedAt: true,
	paymentMethod: true,
	paidAt: true,
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

// ============================================================================
// SELECT DEFINITIONS - ORDER DETAIL
// ============================================================================

export const GET_ORDER_SELECT = {
	id: true,
	orderNumber: true,
	userId: true,
	stripeCheckoutSessionId: true,
	stripePaymentIntentId: true,
	stripeChargeId: true,
	stripeCustomerId: true,
	stripeInvoiceId: true,
	customerEmail: true,
	customerName: true,
	customerPhone: true,
	subtotal: true,
	discountAmount: true,
	shippingCost: true,
	taxAmount: true,
	total: true,
	currency: true,
	shippingFirstName: true,
	shippingLastName: true,
	shippingAddress1: true,
	shippingAddress2: true,
	shippingPostalCode: true,
	shippingCity: true,
	shippingCountry: true,
	shippingPhone: true,
	billingFirstName: true,
	billingLastName: true,
	billingAddress1: true,
	billingAddress2: true,
	billingPostalCode: true,
	billingCity: true,
	billingCountry: true,
	billingPhone: true,
	shippingMethod: true,
	shippingCarrier: true,
	shippingRateId: true,
	trackingNumber: true,
	trackingUrl: true,
	estimatedDelivery: true,
	actualDelivery: true,
	shippedAt: true,
	status: true,
	paymentStatus: true,
	fulfillmentStatus: true,
	paymentMethod: true,
	paidAt: true,
	invoiceNumber: true,
	invoiceGeneratedAt: true,
	invoiceStatus: true,
	createdAt: true,
	updatedAt: true,
	items: {
		select: {
			id: true,
			skuId: true,
			productId: true,
			productTitle: true,
			productDescription: true,
			productImageUrl: true,
			skuColor: true,
			skuMaterial: true,
			skuSize: true,
			skuImageUrl: true,
			price: true,
			quantity: true,
			taxAmount: true,
			taxRate: true,
		},
	},
} as const satisfies Prisma.OrderSelect;

// ============================================================================
// PAGINATION & SORTING
// ============================================================================

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

export const GET_ORDERS_SORT_FIELDS = Object.values(
	SORT_OPTIONS
) as unknown as readonly (typeof SORT_OPTIONS)[keyof typeof SORT_OPTIONS][];

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

// ============================================================================
// CACHE SETTINGS
// ============================================================================

export const GET_ORDERS_DEFAULT_CACHE = {
	revalidate: 60 * 5,
	stale: 60 * 10,
	expire: 60 * 30,
} as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ORDER_ERROR_MESSAGES = {
	NOT_FOUND: "La commande n'existe pas.",
	DELETE_FAILED: "Erreur lors de la suppression de la commande.",
	CANCEL_FAILED: "Erreur lors de l'annulation de la commande.",
	HAS_INVOICE:
		"Cette commande ne peut pas être supprimée car une facture a été émise. " +
		"Annulez la commande à la place pour préserver la traçabilité comptable.",
	ALREADY_CANCELLED: "Cette commande est déjà annulée.",
	CANNOT_DELETE_PAID:
		"Cette commande ne peut pas être supprimée car elle a été payée. " +
		"Annulez la commande et procédez à un remboursement à la place.",
	BULK_DELETE_NONE_ELIGIBLE:
		"Aucune commande ne peut être supprimée (toutes ont des factures ou sont payées).",
	// Mark as paid
	MARK_AS_PAID_FAILED: "Erreur lors du marquage de la commande comme payée.",
	ALREADY_PAID: "Cette commande est déjà payée.",
	CANNOT_PAY_CANCELLED: "Une commande annulée ne peut pas être marquée comme payée.",
	// Mark as shipped
	MARK_AS_SHIPPED_FAILED: "Erreur lors du marquage de la commande comme expédiée.",
	ALREADY_SHIPPED: "Cette commande est déjà expédiée.",
	CANNOT_SHIP_UNPAID: "Une commande non payée ne peut pas être expédiée.",
	CANNOT_SHIP_CANCELLED: "Une commande annulée ne peut pas être expédiée.",
	// Mark as delivered
	MARK_AS_DELIVERED_FAILED: "Erreur lors du marquage de la commande comme livrée.",
	ALREADY_DELIVERED: "Cette commande est déjà livrée.",
	CANNOT_DELIVER_NOT_SHIPPED: "Une commande non expédiée ne peut pas être marquée comme livrée.",
} as const;
