import type { Prisma, RetractationStatus } from "@/app/generated/prisma/client";

// ============================================================================
// SELECTS
// ============================================================================

/** Liste admin — la commande liée en snapshots légers (identité + montant). */
export const GET_RETRACTATIONS_SELECT = {
	id: true,
	status: true,
	reason: true,
	requestedAt: true,
	acknowledgedAt: true,
	itemReceivedAt: true,
	refundedAt: true,
	creditNoteNumber: true,
	order: {
		select: {
			id: true,
			invoiceNumber: true,
			email: true,
			customerName: true,
			amountTotalCents: true,
			status: true,
			shippedAt: true,
		},
	},
} as const satisfies Prisma.RetractationRequestSelect;

/** Détail admin — commande complète en snapshots (lignes comprises). */
export const GET_RETRACTATION_SELECT = {
	id: true,
	status: true,
	reason: true,
	requestedAt: true,
	acknowledgedAt: true,
	itemReceivedAt: true,
	refundedAt: true,
	stripeRefundId: true,
	creditNoteNumber: true,
	order: {
		select: {
			id: true,
			invoiceNumber: true,
			email: true,
			customerName: true,
			amountItemsCents: true,
			amountShippingCents: true,
			amountTotalCents: true,
			status: true,
			shippedAt: true,
			stripePaymentIntentId: true,
			items: {
				select: {
					id: true,
					variantId: true,
					nameSnapshot: true,
					variantSnapshot: true,
					unitPriceCents: true,
					quantity: true,
				},
			},
		},
	},
} as const satisfies Prisma.RetractationRequestSelect;

// ============================================================================
// STATUTS
// ============================================================================

export const RETRACTATION_STATUS_LABELS: Record<RetractationStatus, string> = {
	RECEIVED: "Reçue — accusé en attente",
	ACKNOWLEDGED: "Accusée — retour attendu",
	AWAITING_RETURN: "Colis reçu — à rembourser",
	REFUNDED: "Remboursée",
	REJECTED: "Rejetée",
};

export const RETRACTATION_STATUS_BADGE_VARIANTS: Record<
	RetractationStatus,
	"default" | "secondary" | "destructive" | "outline"
> = {
	RECEIVED: "outline",
	ACKNOWLEDGED: "default",
	AWAITING_RETURN: "default",
	REFUNDED: "secondary",
	REJECTED: "destructive",
};

// ============================================================================
// DÉLAIS
// ============================================================================

/**
 * Remboursement sous 14 jours après la demande (art. L221-24 C. conso).
 * Pas de cron (perte volontaire § 1) : c'est une ALERTE VISUELLE dans la
 * liste admin, pilotée par ce délai.
 */
export const RETRACTATION_REFUND_DEADLINE_DAYS = 14;

// ============================================================================
// DIALOGS (overlay store)
// ============================================================================

export const MARK_RETURN_RECEIVED_DIALOG_ID = "mark-return-received";
export const REFUND_RETRACTATION_DIALOG_ID = "refund-retractation";
export const REJECT_RETRACTATION_DIALOG_ID = "reject-retractation";
