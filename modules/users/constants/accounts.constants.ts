import type { Prisma } from "@/app/generated/prisma/browser";

// ============================================================================
// SELECT DEFINITION - ACCOUNTS LIST
// ============================================================================

export const GET_ACCOUNTS_DEFAULT_SELECT = {
	id: true,
	accountId: true,
	providerId: true,
	userId: true,
	accessTokenExpiresAt: true,
	refreshTokenExpiresAt: true,
	scope: true,
	createdAt: true,
	updatedAt: true,
	user: {
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
		},
	},
} as const satisfies Prisma.AccountSelect;

// ============================================================================
// PAGINATION & SORTING
// ============================================================================

export const GET_ACCOUNTS_DEFAULT_PER_PAGE = 50;
export const GET_ACCOUNTS_MAX_RESULTS_PER_PAGE = 200;
export const GET_ACCOUNTS_DEFAULT_SORT_BY = "createdAt";
export const GET_ACCOUNTS_DEFAULT_SORT_ORDER = "desc";

export const GET_ACCOUNTS_SORT_FIELDS = ["createdAt", "updatedAt", "providerId"] as const;
