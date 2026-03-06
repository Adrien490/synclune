import { type Prisma } from "@/app/generated/prisma/client";

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

export const GET_USERS_SORT_FIELDS = ["createdAt", "updatedAt", "name", "email", "role"] as const;

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
// USER PROFILE CONSTANTS
// ============================================================================

export const USER_CONSTANTS = {
	MAX_NAME_LENGTH: 100,
	MIN_NAME_LENGTH: 2,
	MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5 Mo
	ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"],
	/** Texte de confirmation pour suppression de compte (RGPD) */
	ACCOUNT_DELETION_CONFIRMATION: "SUPPRIMER",
} as const;

export const USER_ERROR_MESSAGES = {
	NOT_AUTHENTICATED: "Vous devez être connecté",
	EMAIL_ALREADY_EXISTS: "Cette adresse email est déjà utilisée",
	INVALID_EMAIL: "L'adresse email n'est pas valide",
	NAME_TOO_SHORT: `Le nom doit contenir au moins ${USER_CONSTANTS.MIN_NAME_LENGTH} caractères`,
	NAME_TOO_LONG: `Le nom ne peut pas dépasser ${USER_CONSTANTS.MAX_NAME_LENGTH} caractères`,
	IMAGE_TOO_LARGE: `L'image ne peut pas dépasser ${USER_CONSTANTS.MAX_IMAGE_SIZE / 1024 / 1024} Mo`,
	IMAGE_INVALID_TYPE: "Format d'image non supporté",
	UPDATE_FAILED: "Une erreur est survenue lors de la mise à jour",
} as const;
