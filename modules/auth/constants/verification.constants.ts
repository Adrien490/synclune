import { Prisma } from "@/app/generated/prisma/client";

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

export const GET_VERIFICATIONS_DEFAULT_SELECT = {
	id: true,
	identifier: true,
	expiresAt: true,
	createdAt: true,
	updatedAt: true,
} as const satisfies Prisma.VerificationSelect;

// ============================================================================
// PAGINATION & SORTING
// ============================================================================

export const GET_VERIFICATIONS_DEFAULT_PER_PAGE = 50;
export const GET_VERIFICATIONS_MAX_RESULTS_PER_PAGE = 200;
export const GET_VERIFICATIONS_DEFAULT_SORT_BY = "createdAt";
export const GET_VERIFICATIONS_DEFAULT_SORT_ORDER = "desc";

export const GET_VERIFICATIONS_SORT_FIELDS = [
	"createdAt",
	"updatedAt",
	"expiresAt",
] as const;

