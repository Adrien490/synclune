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

/**
 * Alias pour compatibilité (même select que GET_ORDERS_SELECT)
 * @deprecated Utiliser GET_ORDERS_SELECT à la place
 */
export const GET_ORDERS_DEFAULT_SELECT = GET_ORDERS_SELECT;

// ============================================================================
// SELECT DEFINITIONS - ORDER DETAIL
// ============================================================================

export const GET_ORDER_SELECT = {
	id: true,
	orderNumber: true,
	userId: true,
	stripeCheckoutSessionId: true,
	stripePaymentIntentId: true,
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
	invoiceStatus: true,
	invoiceGeneratedAt: true,
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
		},
	},
	refunds: {
		select: {
			id: true,
			status: true,
			reason: true,
			amount: true,
			currency: true,
			createdAt: true,
			items: {
				select: {
					id: true,
					orderItemId: true,
					quantity: true,
					amount: true,
				},
			},
		},
		orderBy: { createdAt: "desc" as const },
	},
	discountUsages: {
		select: {
			discountCode: true,
			amountApplied: true,
		},
	},
	history: {
		select: {
			id: true,
			action: true,
			previousStatus: true,
			newStatus: true,
			previousPaymentStatus: true,
			newPaymentStatus: true,
			previousFulfillmentStatus: true,
			newFulfillmentStatus: true,
			note: true,
			metadata: true,
			authorName: true,
			source: true,
			createdAt: true,
		},
		orderBy: { createdAt: "desc" as const },
		take: 50,
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
	// Mark as processing
	MARK_AS_PROCESSING_FAILED: "Erreur lors du passage en préparation.",
	ALREADY_PROCESSING: "Cette commande est déjà en cours de préparation.",
	CANNOT_PROCESS_UNPAID: "Une commande non payée ne peut pas être mise en préparation.",
	CANNOT_PROCESS_CANCELLED: "Une commande annulée ne peut pas être mise en préparation.",
	CANNOT_PROCESS_NOT_PENDING: "Seule une commande en attente peut être passée en préparation.",
	// Revert to processing
	REVERT_TO_PROCESSING_FAILED: "Erreur lors de l'annulation de l'expédition.",
	CANNOT_REVERT_NOT_SHIPPED: "Seule une commande expédiée peut être remise en préparation.",
	// Mark as returned
	MARK_AS_RETURNED_FAILED: "Erreur lors du marquage comme retourné.",
	ALREADY_RETURNED: "Cette commande est déjà marquée comme retournée.",
	CANNOT_RETURN_NOT_DELIVERED: "Seule une commande livrée peut être marquée comme retournée.",
	// Update shipping address
	UPDATE_SHIPPING_ADDRESS_FAILED: "Erreur lors de la modification de l'adresse de livraison.",
	CANNOT_UPDATE_ADDRESS_SHIPPED: "L'adresse ne peut plus être modifiée car la commande a été expédiée.",
} as const;
