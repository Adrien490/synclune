import type { Prisma } from "@/app/generated/prisma/browser";
import type { ReadonlyValues } from "@/shared/types/sort.types";

// ============================================================================
// SELECT DEFINITIONS - ORDER LIST
// ============================================================================

export const GET_ORDERS_SELECT = {
	id: true,
	orderNumber: true,
	// Identité client : colonnes SNAPSHOT uniquement — pas de join `user`
	// (relation quasi toujours NULL depuis le retrait de l'espace client
	// 2026-07-31, achat 100 % invité).
	customerEmail: true,
	customerName: true,
	stripePaymentIntentId: true,
	stripeCustomerId: true,
	total: true,
	currency: true,
	status: true,
	paymentStatus: true,
	fulfillmentStatus: true,
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
	_count: {
		select: {
			items: true,
		},
	},
} as const satisfies Prisma.OrderSelect;

// ============================================================================
// SELECT DEFINITIONS - ORDER DETAIL
// ============================================================================
//
// Deux sélecteurs distincts pour la fiche commande :
//   - GET_ORDER_SELECT_ADMIN (alias GET_ORDER_SELECT) : complet, réservé admin
//   - GET_ORDER_SELECT_CUSTOMER : minimisation RGPD pour l'espace client
//
// Différences customer vs admin :
//   - stripePaymentIntentId / stripeCustomerId : retirés (cross-order fingerprint inutile)
//   - history.metadata : retiré (peut contenir des PII, ex: previous.email sur ADDRESS_UPDATED)
//   - history.authorName : retiré (fuite identité admin interne)
//
// Cf. audit conformité 2026-05-27 — ORD-COMPLY-001 + ORD-COMPLY-004
// ============================================================================

export const GET_ORDER_SELECT_ADMIN = {
	id: true,
	orderNumber: true,
	userId: true,
	stripePaymentIntentId: true,
	stripeCustomerId: true,
	customerEmail: true,
	customerName: true,
	customerPhone: true,
	// Discriminant e-reporting B2C (toujours B2C — micro-entreprise franchise)
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
	billingSameAsShipping: true,
	billingFirstName: true,
	billingLastName: true,
	billingAddress1: true,
	billingAddress2: true,
	billingPostalCode: true,
	billingCity: true,
	billingCountry: true,
	billingPhone: true,
	shippingCarrier: true,
	trackingNumber: true,
	trackingUrl: true,
	actualDelivery: true,
	estimatedDelivery: true,
	shippedAt: true,
	status: true,
	paymentStatus: true,
	fulfillmentStatus: true,
	paymentMethod: true,
	paidAt: true,
	invoiceNumber: true,
	invoiceStatus: true,
	invoiceGeneratedAt: true,
	invoiceVoidedAt: true,
	creditNoteNumber: true,
	creditNoteGeneratedAt: true,
	// DLQ facturation (EINV-UI-105) — escalade archivage/avoir en échec
	invoiceRetryDeferred: true,
	invoiceReconcileAttempts: true,
	// Archivage PDF immuable (Art. L102 B LPF) — admin only (URL/hash sensibles)
	invoicePdfUrl: true,
	invoicePdfHash: true,
	// Snapshot InvoiceData figé (Art. L102 B LPF) — source de vérité unique du
	// rendu PDF/XML (EINV-PDF-001). `resolveInvoiceDataForRender` préfère ce
	// snapshot à toute recomputation depuis les colonnes Order.
	invoiceDataSnapshot: true,
	invoiceDataHash: true,
	// Snapshot vendeur fige au moment de invoiceGeneratedAt (Art. L102 B LPF)
	vendorLegalName: true,
	vendorTradeName: true,
	vendorAddress: true,
	vendorSiren: true,
	vendorSiret: true,
	vendorVatNumber: true,
	vendorVatRegime: true,
	vendorLegalForm: true,
	// Extension snapshot (EINV-FORMAT-007/008 — 2026-05-28)
	vendorEmail: true,
	vendorApeCode: true,
	vendorBankIban: true,
	vendorBankBic: true,
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
			skuSku: true,
			skuColor: true,
			skuColorHexes: true,
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
			note: true,
			processedAt: true,
			createdAt: true,
			// Avoir par refund (Phase 2A — EINV-AUDIT-010)
			creditNoteNumber: true,
			creditNoteGeneratedAt: true,
			items: {
				select: {
					id: true,
					orderItemId: true,
					quantity: true,
					amount: true,
					orderItem: {
						select: {
							productTitle: true,
							skuColor: true,
						},
					},
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

/**
 * Alias rétro-compatible. Les types `GetOrderReturn` (cf. order.types.ts)
 * sont dérivés de ce sélecteur (forme la plus large = admin).
 */
export const GET_ORDER_SELECT = GET_ORDER_SELECT_ADMIN;

/**
 * Sélecteur minimisé pour les consommateurs non-admin (espace client).
 * Tout champ retiré ici n'est jamais transporté hors du serveur pour un client.
 */
export const GET_ORDER_SELECT_CUSTOMER = {
	id: true,
	orderNumber: true,
	userId: true,
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
	billingSameAsShipping: true,
	billingFirstName: true,
	billingLastName: true,
	billingAddress1: true,
	billingAddress2: true,
	billingPostalCode: true,
	billingCity: true,
	billingCountry: true,
	billingPhone: true,
	shippingCarrier: true,
	trackingNumber: true,
	trackingUrl: true,
	actualDelivery: true,
	estimatedDelivery: true,
	shippedAt: true,
	status: true,
	paymentStatus: true,
	fulfillmentStatus: true,
	paymentMethod: true,
	paidAt: true,
	invoiceNumber: true,
	invoiceStatus: true,
	invoiceGeneratedAt: true,
	invoiceVoidedAt: true,
	creditNoteNumber: true,
	creditNoteGeneratedAt: true,
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
			skuSku: true,
			skuColor: true,
			skuColorHexes: true,
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
			note: true,
			processedAt: true,
			createdAt: true,
			// Avoir par refund (Phase 2A — EINV-AUDIT-010)
			creditNoteNumber: true,
			creditNoteGeneratedAt: true,
			items: {
				select: {
					id: true,
					orderItemId: true,
					quantity: true,
					amount: true,
					orderItem: {
						select: {
							productTitle: true,
							skuColor: true,
						},
					},
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

export const GET_ORDERS_DEFAULT_PER_PAGE = 20;
export const GET_ORDERS_MAX_RESULTS_PER_PAGE = 100;

// ============================================================================
// FILTRE MONTANT — SSOT de l'unité
// ============================================================================

/**
 * Plafond du filtre de montant, **en centimes** (unité de `Order.total`).
 *
 * ⚠️ La frontière d'unité est ici, et une seule fois. L'URL (`filter_totalMin` /
 * `filter_totalMax`) et les inputs admin sont en **euros** ; `parseFilters` convertit
 * en centimes avant le schéma. Ce plafond avait été dupliqué en trois endroits avec
 * trois unités différentes — un `MAX_PRICE = 500_000` commenté « en centimes » mais
 * poussé tel quel dans un champ en euros, ×100 par `parseFilters` = 50 000 000
 * centimes, soit 5× le plafond du schéma : saisir un montant minimum faisait
 * **planter la liste** (error boundary). Dériver les euros d'ici, jamais l'inverse.
 */
export const ORDER_TOTAL_FILTER_MAX_CENTS = 10_000_000;

/** Même plafond exprimé en euros — valeur à passer aux inputs et au schéma d'URL. */
export const ORDER_TOTAL_FILTER_MAX_EUROS = ORDER_TOTAL_FILTER_MAX_CENTS / 100;

/**
 * Longueur maximale d'un numéro de suivi — alignée sur `Order.trackingNumber
 * VarChar(50)`.
 *
 * ⚠️ `markAsShippedSchema` et `updateTrackingSchema` bornaient à **100**, et les deux
 * actions écrivent `validated.data.trackingNumber` sans troncature : un numéro de 51
 * à 100 caractères (référence transporteur longue collée depuis un back-office)
 * traversait toute la chaîne de validation puis échouait en `22001` Postgres au
 * moment de marquer la commande expédiée — erreur générique, sans indication du
 * champ fautif. Les deux schémas ET les deux inputs dérivent d'ici.
 */
export const TRACKING_NUMBER_MAX_LENGTH = 50;

/**
 * Longueur maximale d'une URL de suivi — alignée sur `Order.trackingUrl
 * VarChar(2048)`. Même classe de défaut que `TRACKING_NUMBER_MAX_LENGTH` :
 * sans borne Zod, une URL trop longue saisie en mode « URL personnalisée »
 * traversait la validation puis échouait en 22001 Postgres, erreur générique.
 * Déclarée dans `zod-prisma-length-parity.contract.test.ts`.
 */
export const TRACKING_URL_MAX_LENGTH = 2048;

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

export const GET_ORDERS_SORT_FIELDS: ReadonlyValues<typeof SORT_OPTIONS> =
	Object.values(SORT_OPTIONS);

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
	// Garde atomique updateMany count===0 : le statut a changé entre le
	// findUnique et l'update (admin concurrent, webhook, cron).
	CONCURRENT_CHANGE:
		"La commande a été modifiée par une autre opération. Rechargez la page et réessayez.",
	DELETE_FAILED: "Erreur lors de la suppression de la commande.",
	CANCEL_FAILED: "Erreur lors de l'annulation de la commande.",
	HAS_INVOICE:
		"Cette commande ne peut pas être supprimée car une facture a été émise. " +
		"Annulez la commande à la place pour préserver la traçabilité comptable.",
	ALREADY_CANCELLED: "Cette commande est déjà annulée.",
	CANNOT_DELETE_PAID:
		"Cette commande ne peut pas être supprimée car elle a été payée. " +
		"Annulez la commande et procédez à un remboursement à la place.",
	// Mark as paid
	MARK_AS_PAID_FAILED: "Erreur lors du marquage de la commande comme payée.",
	ALREADY_PAID: "Cette commande est déjà payée.",
	CANNOT_PAY_CANCELLED: "Une commande annulée ne peut pas être marquée comme payée.",
	// Mark as shipped
	MARK_AS_SHIPPED_FAILED: "Erreur lors du marquage de la commande comme expédiée.",
	ALREADY_SHIPPED: "Cette commande est déjà expédiée.",
	CANNOT_SHIP_UNPAID: "Une commande non payée ne peut pas être expédiée.",
	CANNOT_SHIP_CANCELLED: "Une commande annulée ne peut pas être expédiée.",
	CANNOT_SHIP_NOT_PROCESSING:
		"Seule une commande en préparation peut être expédiée. Passez-la d'abord en préparation.",
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
	// Undo return
	UNDO_RETURN_FAILED: "Erreur lors de l'annulation du retour.",
	CANNOT_UNDO_NOT_RETURNED:
		"Seule une commande marquée comme retournée peut voir son retour annulé.",
	// Update shipping address
	UPDATE_SHIPPING_ADDRESS_FAILED: "Erreur lors de la modification de l'adresse de livraison.",
	CANNOT_UPDATE_ADDRESS_SHIPPED:
		"L'adresse ne peut plus être modifiée car la commande a été expédiée.",
	// Update billing address
	UPDATE_BILLING_ADDRESS_FAILED: "Erreur lors de la modification de l'adresse de facturation.",
	CANNOT_UPDATE_BILLING_INVOICED:
		"Ces informations ne peuvent plus être modifiées car une facture a été émise.",
	// Update note
	UPDATE_NOTE_FAILED: "Erreur lors de la modification de la note.",
	NOTE_NOT_FOUND: "Note introuvable.",
	NOT_NOTE_AUTHOR: "Vous ne pouvez modifier que vos propres notes.",
	// Reorder
	REORDER_FAILED: "Erreur lors de l'ajout des articles au panier.",
	REORDER_NO_AVAILABLE_ITEMS:
		"Aucun article de cette commande n'est disponible à la vente actuellement.",
	// Mark as fully refunded
	MARK_AS_FULLY_REFUNDED_FAILED: "Erreur lors du marquage de la commande comme remboursée.",
	CANNOT_REFUND_NOT_PAID: "Seules les commandes payées peuvent être marquées comme remboursées.",
	ALREADY_FULLY_REFUNDED: "Cette commande est déjà entièrement remboursée.",
	PENDING_STRIPE_REFUNDS:
		"Un remboursement Stripe est en cours de traitement pour cette commande. " +
		"Attendez sa confirmation ou annulez-le avant de marquer la commande comme remboursée manuellement.",
	// Update customer info
	UPDATE_CUSTOMER_INFO_FAILED: "Erreur lors de la modification des informations client.",
	// Export single order
	EXPORT_ORDER_FAILED: "Erreur lors de l'export de la commande.",
} as const;
