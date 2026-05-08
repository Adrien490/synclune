import type { Prisma } from "@/app/generated/prisma/browser";

// ============================================================================
// SELECT DEFINITIONS - RECENT ORDERS
// ============================================================================

export const GET_DASHBOARD_RECENT_ORDERS_SELECT = {
	id: true,
	orderNumber: true,
	createdAt: true,
	status: true,
	paymentStatus: true,
	fulfillmentStatus: true,
	total: true,
	user: {
		select: {
			name: true,
			email: true,
		},
	},
} as const satisfies Prisma.OrderSelect;

// ============================================================================
// DEFAULTS
// ============================================================================

export const DASHBOARD_RECENT_ORDERS_LIMIT = 5;

/**
 * Below this volume in the previous period, the evolution % is statistically
 * unreliable for a micro-entreprise. The KPI card displays a "Données limitées"
 * badge instead of a misleading percentage.
 *
 * Why 10: at 20-30 orders/month, +/-20 % evolution = ~5 orders. A single
 * delayed payment can swing the percentage. 10 is the floor where deltas
 * become marginally meaningful.
 */
export const LOW_VOLUME_THRESHOLD = 10;
