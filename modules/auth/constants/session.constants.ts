import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

export const GET_SESSION_SELECT = {
	id: true,
	expiresAt: true,
	token: true,
	createdAt: true,
	updatedAt: true,
	ipAddress: true,
	userAgent: true,
	userId: true,
	user: {
		select: {
			id: true,
			email: true,
			role: true,
			name: true,
		},
	},
} as const satisfies Prisma.SessionSelect;

export const GET_SESSIONS_SELECT = {
	id: true,
	expiresAt: true,
	createdAt: true,
	updatedAt: true,
	ipAddress: true,
	userAgent: true,
	userId: true,
	user: {
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
		},
	},
} as const satisfies Prisma.SessionSelect;

export const GET_SESSIONS_ADMIN_SELECT = {
	...GET_SESSIONS_SELECT,
} as const satisfies Prisma.SessionSelect;

// ============================================================================
// PAGINATION & SORTING
// ============================================================================

export const GET_SESSIONS_DEFAULT_PER_PAGE = 30;
export const GET_SESSIONS_MAX_RESULTS_PER_PAGE = 200;
export const GET_SESSIONS_DEFAULT_SORT_BY = "createdAt";
export const GET_SESSIONS_DEFAULT_SORT_ORDER = "desc";
export const GET_SESSIONS_ADMIN_FALLBACK_SORT_BY = "updatedAt";

export const GET_SESSIONS_SORT_FIELDS = [
	"createdAt",
	"updatedAt",
	"expiresAt",
] as const;

// ============================================================================
// CACHE SETTINGS
// ============================================================================

export const GET_SESSIONS_DEFAULT_CACHE = {
	revalidate: 60 * 1,
	stale: 60 * 2,
	expire: 60 * 5,
} as const;
