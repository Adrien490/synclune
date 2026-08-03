import type { Prisma } from "@/app/generated/prisma/browser";
import { RefundReason, RefundStatus } from "@/app/generated/prisma/enums";
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
	// Avoir comptable partiel (Art. 272-I CGI) — EINV-UI-102
	creditNoteNumber: true,
	creditNoteGeneratedAt: true,
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

// Le select de la page « Nouveau remboursement » est parti au Lot 2 S3.3
// (création in-app supprimée — les remboursements se font dans Stripe).

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

export const GET_REFUNDS_DEFAULT_PER_PAGE = 20;
export const GET_REFUNDS_MAX_RESULTS_PER_PAGE = 100;

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

// REFUND_ERROR_MESSAGES est parti au Lot 2 S3.3 avec les 7 actions du workflow
// in-app qui les rendaient.
