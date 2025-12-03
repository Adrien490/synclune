import type { Prisma } from "@/app/generated/prisma";
import { DiscountType } from "@/app/generated/prisma/browser";

// ============================================================================
// SELECT DEFINITIONS - DISCOUNT DETAIL
// ============================================================================

export const GET_DISCOUNT_SELECT = {
	id: true,
	code: true,
	type: true,
	value: true,
	minOrderAmount: true,
	maxUsageCount: true,
	maxUsagePerUser: true,
	usageCount: true,
	isActive: true,
	createdAt: true,
	updatedAt: true,
	_count: { select: { usages: true } },
} as const satisfies Prisma.DiscountSelect;

// ============================================================================
// SELECT DEFINITIONS - DISCOUNT LIST
// ============================================================================

export const GET_DISCOUNTS_SELECT = {
	id: true,
	code: true,
	type: true,
	value: true,
	minOrderAmount: true,
	maxUsageCount: true,
	maxUsagePerUser: true,
	usageCount: true,
	isActive: true,
	createdAt: true,
	_count: { select: { usages: true } },
} as const satisfies Prisma.DiscountSelect;

// ============================================================================
// SELECT DEFINITIONS - DISCOUNT VALIDATION (minimal)
// ============================================================================

export const GET_DISCOUNT_VALIDATION_SELECT = {
	id: true,
	code: true,
	type: true,
	value: true,
	minOrderAmount: true,
	maxUsageCount: true,
	maxUsagePerUser: true,
	usageCount: true,
	isActive: true,
} as const satisfies Prisma.DiscountSelect;

// ============================================================================
// PAGINATION & SORTING
// ============================================================================

export const GET_DISCOUNTS_DEFAULT_PER_PAGE = 20;
export const GET_DISCOUNTS_MAX_RESULTS_PER_PAGE = 100;

export const DISCOUNTS_SORT_OPTIONS = {
	CREATED_DESC: "created-descending",
	CREATED_ASC: "created-ascending",
	CODE_ASC: "code-ascending",
	CODE_DESC: "code-descending",
	USAGE_DESC: "usage-descending",
	USAGE_ASC: "usage-ascending",
} as const;

export const GET_DISCOUNTS_SORT_FIELDS = Object.values(
	DISCOUNTS_SORT_OPTIONS
) as unknown as readonly (typeof DISCOUNTS_SORT_OPTIONS)[keyof typeof DISCOUNTS_SORT_OPTIONS][];

export const GET_DISCOUNTS_DEFAULT_SORT_BY = DISCOUNTS_SORT_OPTIONS.CREATED_DESC;

export const DISCOUNTS_SORT_LABELS = {
	[DISCOUNTS_SORT_OPTIONS.CREATED_DESC]: "Plus récents",
	[DISCOUNTS_SORT_OPTIONS.CREATED_ASC]: "Plus anciens",
	[DISCOUNTS_SORT_OPTIONS.CODE_ASC]: "Code (A-Z)",
	[DISCOUNTS_SORT_OPTIONS.CODE_DESC]: "Code (Z-A)",
	[DISCOUNTS_SORT_OPTIONS.USAGE_DESC]: "Plus utilisés",
	[DISCOUNTS_SORT_OPTIONS.USAGE_ASC]: "Moins utilisés",
} as const;

// ============================================================================
// TYPE LABELS
// ============================================================================

export const DISCOUNT_TYPE_LABELS = {
	[DiscountType.PERCENTAGE]: "Pourcentage",
	[DiscountType.FIXED_AMOUNT]: "Montant fixe",
} as const;

export const DISCOUNT_TYPE_ICONS = {
	[DiscountType.PERCENTAGE]: "%",
	[DiscountType.FIXED_AMOUNT]: "€",
} as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const DISCOUNT_ERROR_MESSAGES = {
	NOT_FOUND: "Code promo introuvable",
	NOT_ACTIVE: "Ce code promo n'est plus actif",
	MAX_USAGE_REACHED: "Ce code promo a atteint sa limite d'utilisation",
	USER_MAX_USAGE_REACHED: "Vous avez déjà utilisé ce code promo",
	MIN_ORDER_NOT_MET: "Commande minimum de {amount}€ requise",
	ALREADY_EXISTS: "Un code promo avec ce code existe déjà",
	CREATE_FAILED: "Erreur lors de la création du code promo",
	UPDATE_FAILED: "Erreur lors de la modification du code promo",
	DELETE_FAILED: "Erreur lors de la suppression du code promo",
	HAS_USAGES: "Ce code promo a déjà été utilisé et ne peut pas être supprimé",
} as const;

// ============================================================================
// CACHE SETTINGS
// ============================================================================

export const GET_DISCOUNTS_DEFAULT_CACHE = {
	revalidate: 60 * 5, // 5 minutes
	stale: 60 * 10, // 10 minutes
	expire: 60 * 30, // 30 minutes
} as const;
