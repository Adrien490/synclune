import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// SELECT DEFINITIONS - RECENT ORDERS
// ============================================================================

export const GET_DASHBOARD_RECENT_ORDERS_SELECT = {
	id: true,
	orderNumber: true,
	createdAt: true,
	status: true,
	paymentStatus: true,
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
