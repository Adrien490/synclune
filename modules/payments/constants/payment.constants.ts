import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

export const GET_STRIPE_PAYMENTS_SELECT = {
	id: true,
	orderNumber: true,
	userId: true,
	user: {
		select: {
			id: true,
			name: true,
			email: true,
		},
	},
	total: true,
	paymentStatus: true,
	paidAt: true,
	stripePaymentIntentId: true,
	createdAt: true,
} as const satisfies Prisma.OrderSelect;

// ============================================================================
// PAGINATION & SORTING
// ============================================================================

export const GET_STRIPE_PAYMENTS_DEFAULT_PER_PAGE = 25;
export const GET_STRIPE_PAYMENTS_MAX_RESULTS_PER_PAGE = 100;
export const GET_STRIPE_PAYMENTS_DEFAULT_SORT_ORDER: Prisma.SortOrder = "desc";

export const SORT_OPTIONS = {
	PAID_AT_DESC: "paidAt-descending",
	PAID_AT_ASC: "paidAt-ascending",
	TOTAL_DESC: "total-descending",
	TOTAL_ASC: "total-ascending",
	PAYMENT_STATUS_ASC: "paymentStatus-ascending",
	PAYMENT_STATUS_DESC: "paymentStatus-descending",
} as const;

export const GET_STRIPE_PAYMENTS_SORT_FIELDS = Object.values(SORT_OPTIONS);

export const SORT_LABELS = {
	[SORT_OPTIONS.PAID_AT_DESC]: "Plus récents",
	[SORT_OPTIONS.PAID_AT_ASC]: "Plus anciens",
	[SORT_OPTIONS.TOTAL_DESC]: "Montant décroissant",
	[SORT_OPTIONS.TOTAL_ASC]: "Montant croissant",
	[SORT_OPTIONS.PAYMENT_STATUS_ASC]: "Statut (A-Z)",
	[SORT_OPTIONS.PAYMENT_STATUS_DESC]: "Statut (Z-A)",
} as const;
