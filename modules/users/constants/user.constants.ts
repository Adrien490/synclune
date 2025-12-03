import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// SELECT DEFINITIONS - USER DETAIL
// ============================================================================

export const GET_USER_SELECT = {
	id: true,
	email: true,
	name: true,
	role: true,
	accountStatus: true,
	emailVerified: true,
	createdAt: true,
	updatedAt: true,
} as const satisfies Prisma.UserSelect;

// ============================================================================
// SELECT DEFINITIONS - USER LIST
// ============================================================================

export const GET_USERS_SELECT = {
	id: true,
	role: true,
	accountStatus: true,
	name: true,
	email: true,
	emailVerified: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
	suspendedAt: true,
	_count: {
		select: {
			orders: true,
			sessions: true,
			accounts: true,
		},
	},
} as const satisfies Prisma.UserSelect;

// ============================================================================
// PAGINATION & SORTING
// ============================================================================

export const GET_USERS_DEFAULT_PER_PAGE = 50;
export const GET_USERS_MAX_RESULTS_PER_PAGE = 200;
export const GET_USERS_DEFAULT_SORT_BY = "createdAt";
export const GET_USERS_DEFAULT_SORT_ORDER = "desc";
export const GET_USERS_ADMIN_FALLBACK_SORT_BY = "updatedAt";

export const GET_USERS_SORT_FIELDS = [
	"createdAt",
	"updatedAt",
	"name",
	"email",
	"role",
] as const;

// ============================================================================
// UI OPTIONS
// ============================================================================

export const USERS_SORT_OPTIONS = {
	CREATED_ASC: "createdAt-ascending",
	CREATED_DESC: "createdAt-descending",
	UPDATED_ASC: "updatedAt-ascending",
	UPDATED_DESC: "updatedAt-descending",
	NAME_ASC: "name-ascending",
	NAME_DESC: "name-descending",
	EMAIL_ASC: "email-ascending",
	EMAIL_DESC: "email-descending",
} as const;

export const USERS_SORT_LABELS = {
	[USERS_SORT_OPTIONS.CREATED_DESC]: "Plus récents",
	[USERS_SORT_OPTIONS.CREATED_ASC]: "Plus anciens",
	[USERS_SORT_OPTIONS.UPDATED_DESC]: "Mis à jour récemment",
	[USERS_SORT_OPTIONS.UPDATED_ASC]: "Mis à jour anciennement",
	[USERS_SORT_OPTIONS.NAME_ASC]: "Nom (A-Z)",
	[USERS_SORT_OPTIONS.NAME_DESC]: "Nom (Z-A)",
	[USERS_SORT_OPTIONS.EMAIL_ASC]: "Email (A-Z)",
	[USERS_SORT_OPTIONS.EMAIL_DESC]: "Email (Z-A)",
} as const;

// ============================================================================
// CACHE SETTINGS
// ============================================================================

export const GET_USERS_DEFAULT_CACHE = {
	revalidate: 60 * 10,
	stale: 60 * 15,
	expire: 60 * 30,
} as const;
