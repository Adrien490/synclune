import type { Prisma } from "@/app/generated/prisma/browser";
import { RefundReason, RefundStatus } from "@/app/generated/prisma/enums";
import { BULK_SELECTION_MAX } from "@/shared/constants/admin-bulk";
import type { BadgeVariant } from "@/shared/types/badge.types";

// ============================================================================
// SELECT DEFINITIONS - REFUND LIST
// ============================================================================

export const GET_REFUNDS_SELECT = {
	id: true,
	orderId: true,
	stripeRefundId: true,
	amount: true,
	currency: true,
	reason: true,
	status: true,
	failureReason: true,
	note: true,
	createdBy: true,
	processedAt: true,
	createdAt: true,
	updatedAt: true,
	order: {
		select: {
			id: true,
			orderNumber: true,
			customerEmail: true,
			customerName: true,
			total: true,
		},
	},
	_count: {
		select: {
			items: true,
		},
	},
} as const satisfies Prisma.RefundSelect;

// ============================================================================
// SELECT DEFINITIONS - REFUND DETAIL
// ============================================================================

export const GET_REFUND_SELECT = {
	id: true,
	orderId: true,
	stripeRefundId: true,
	amount: true,
	currency: true,
	reason: true,
	status: true,
	failureReason: true,
	note: true,
	createdBy: true,
	processedAt: true,
	createdAt: true,
	updatedAt: true,
	order: {
		select: {
			id: true,
			orderNumber: true,
			customerEmail: true,
			customerName: true,
			total: true,
			stripePaymentIntentId: true,
		},
	},
	items: {
		select: {
			id: true,
			orderItemId: true,
			quantity: true,
			amount: true,
			restock: true,
			createdAt: true,
			orderItem: {
				select: {
					id: true,
					productTitle: true,
					skuColor: true,
					skuMaterial: true,
					skuSize: true,
					skuImageUrl: true,
					price: true,
					quantity: true,
					skuId: true,
				},
			},
		},
	},
} as const satisfies Prisma.RefundSelect;

// ============================================================================
// SELECT DEFINITIONS - ORDER FOR REFUND
// ============================================================================

export const GET_ORDER_FOR_REFUND_SELECT = {
	id: true,
	orderNumber: true,
	customerEmail: true,
	customerName: true,
	subtotal: true,
	discountAmount: true,
	total: true,
	status: true,
	paymentStatus: true,
	fulfillmentStatus: true,
	trackingNumber: true,
	stripePaymentIntentId: true,
	items: {
		select: {
			id: true,
			productTitle: true,
			productImageUrl: true,
			skuColor: true,
			skuMaterial: true,
			skuSize: true,
			skuImageUrl: true,
			price: true,
			quantity: true,
			skuId: true,
			refundItems: {
				where: {
					refund: {
						status: {
							in: [RefundStatus.PENDING, RefundStatus.APPROVED, RefundStatus.COMPLETED],
						},
					},
				},
				select: {
					quantity: true,
				},
			},
		},
	},
	refunds: {
		where: {
			status: {
				in: [RefundStatus.PENDING, RefundStatus.APPROVED, RefundStatus.COMPLETED],
			},
		},
		select: {
			amount: true,
		},
	},
} as const satisfies Prisma.OrderSelect;

// ============================================================================
// LABELS (FRANÇAIS)
// ============================================================================

export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
	[RefundStatus.PENDING]: "En attente",
	[RefundStatus.APPROVED]: "Approuvé",
	[RefundStatus.COMPLETED]: "Remboursé",
	[RefundStatus.REJECTED]: "Refusé",
	[RefundStatus.FAILED]: "Échoué",
	[RefundStatus.CANCELLED]: "Annulé",
};

export const REFUND_STATUS_VARIANTS: Record<RefundStatus, BadgeVariant> = {
	[RefundStatus.PENDING]: "warning",
	[RefundStatus.APPROVED]: "default",
	[RefundStatus.COMPLETED]: "success",
	[RefundStatus.REJECTED]: "destructive",
	[RefundStatus.FAILED]: "destructive",
	[RefundStatus.CANCELLED]: "secondary",
};

export const REFUND_REASON_LABELS: Record<RefundReason, string> = {
	[RefundReason.CUSTOMER_REQUEST]: "Rétractation client",
	[RefundReason.DEFECTIVE]: "Produit défectueux",
	[RefundReason.WRONG_ITEM]: "Erreur de préparation",
	[RefundReason.LOST_IN_TRANSIT]: "Colis perdu",
	[RefundReason.FRAUD]: "Fraude",
	[RefundReason.OTHER]: "Autre",
};

// ============================================================================
// PAGINATION & SORTING
// ============================================================================

export const GET_REFUNDS_DEFAULT_PER_PAGE = 10;
export const GET_REFUNDS_MAX_RESULTS_PER_PAGE = 100;

/**
 * Cap des ids retournés par get-filtered-refund-ids pour le banner
 * "Sélectionner les N filtrés" (parité produits).
 */
export const BULK_REFUND_ACTION_LIMIT = BULK_SELECTION_MAX;

export const SORT_OPTIONS = {
	CREATED_DESC: "created-descending",
	CREATED_ASC: "created-ascending",
	AMOUNT_DESC: "amount-descending",
	AMOUNT_ASC: "amount-ascending",
	STATUS_ASC: "status-ascending",
	STATUS_DESC: "status-descending",
} as const;

export const SORT_LABELS = {
	[SORT_OPTIONS.CREATED_DESC]: "Plus récents",
	[SORT_OPTIONS.CREATED_ASC]: "Plus anciens",
	[SORT_OPTIONS.AMOUNT_DESC]: "Montant décroissant",
	[SORT_OPTIONS.AMOUNT_ASC]: "Montant croissant",
	[SORT_OPTIONS.STATUS_ASC]: "Statut (A-Z)",
	[SORT_OPTIONS.STATUS_DESC]: "Statut (Z-A)",
} as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const REFUND_ERROR_MESSAGES = {
	NOT_FOUND: "Le remboursement n'existe pas.",
	ORDER_NOT_FOUND: "La commande n'existe pas.",
	CREATE_FAILED: "Erreur lors de la création du remboursement.",
	UPDATE_FAILED: "Erreur lors de la mise à jour du remboursement.",
	APPROVE_FAILED: "Erreur lors de l'approbation du remboursement.",
	PROCESS_FAILED: "Erreur lors du traitement du remboursement.",
	REJECT_FAILED: "Erreur lors du rejet du remboursement.",
	CANCEL_FAILED: "Erreur lors de l'annulation du remboursement.",
	RETRY_FAILED: "Erreur lors de la relance du remboursement.",
	NOT_FAILED: "Seuls les remboursements en échec peuvent être relancés.",
	ALREADY_PROCESSED: "Ce remboursement a déjà été traité.",
	ALREADY_APPROVED: "Ce remboursement est déjà approuvé.",
	ALREADY_REJECTED: "Ce remboursement a déjà été refusé.",
	NOT_APPROVED: "Ce remboursement doit d'abord être approuvé avant d'être traité.",
	CANNOT_CANCEL: "Ce remboursement ne peut plus être annulé (déjà traité ou refusé).",
	AMOUNT_EXCEEDS_ORDER: "Le montant du remboursement dépasse le total de la commande.",
	AMOUNT_EXCEEDS_REMAINING: "Le montant dépasse le montant restant remboursable.",
	ORDER_CANCELLED_NEEDS_CONFIRMATION:
		"Cette commande est annulée. Coche la case de confirmation pour rembourser malgré tout.",
	NO_CHARGE_ID: "Impossible de rembourser : aucun ID de paiement Stripe trouvé.",
	STRIPE_ERROR: "Erreur lors du remboursement Stripe.",
	INVALID_ITEMS: "Les articles du remboursement sont invalides.",
	QUANTITY_EXCEEDS_AVAILABLE: "La quantité demandée dépasse la quantité disponible.",
	// Client-facing return request errors
	RETURN_NOT_ELIGIBLE: "Cette commande n'est pas éligible au retour.",
	RETURN_DEADLINE_EXCEEDED: "Le délai de rétractation de 14 jours est dépassé.",
	RETURN_ALREADY_REQUESTED: "Une demande de retour est déjà en cours pour cette commande.",
	RETURN_REQUEST_FAILED: "Erreur lors de la demande de retour.",
	// ORD-STRIPE-007 : action admin bloquée car un dispute Stripe est ouvert
	OPEN_DISPUTE:
		"Un litige Stripe est en cours sur cette commande. Toute action de remboursement ou d'annulation doit attendre la résolution du litige (gérée automatiquement par le webhook).",
} as const;
