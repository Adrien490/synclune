import { Prisma } from "@/app/generated/prisma";

// ============================================================================
// SELECT DEFINITION - ACCOUNT
// ============================================================================

export const GET_ACCOUNT_DEFAULT_SELECT = {
	id: true,
	accountId: true,
	providerId: true,
	userId: true,
	scope: true,
	accessTokenExpiresAt: true,
	refreshTokenExpiresAt: true,
	createdAt: true,
	updatedAt: true,
	user: {
		select: {
			id: true,
			email: true,
			role: true,
		},
	},
} as const satisfies Prisma.AccountSelect;
