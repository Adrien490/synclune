import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// SELECT DEFINITION - CURRENT USER
// ============================================================================

export const GET_CURRENT_USER_DEFAULT_SELECT = {
	id: true,
	name: true,
	email: true,
	emailVerified: true,
	role: true,
	createdAt: true,
	updatedAt: true,
} as const satisfies Prisma.UserSelect;
