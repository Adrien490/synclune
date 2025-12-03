import { Prisma } from "@/app/generated/prisma";

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

export const GET_VERIFICATION_SELECT = {
	id: true,
	identifier: true,
	value: true,
	expiresAt: true,
	createdAt: true,
	updatedAt: true,
} as const satisfies Prisma.VerificationSelect;
