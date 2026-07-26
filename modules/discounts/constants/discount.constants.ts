import type { Prisma } from "@/app/generated/prisma/browser";
import { DiscountType } from "@/app/generated/prisma/browser";
import type { ReadonlyValues } from "@/shared/types/sort.types";
import { formatEuro } from "@/shared/utils/format-euro";

import type { DiscountStatus } from "../types/discount.types";

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
	startsAt: true,
	endsAt: true,
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
	startsAt: true,
	endsAt: true,
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
	startsAt: true,
	endsAt: true,
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

export const GET_DISCOUNTS_SORT_FIELDS: ReadonlyValues<typeof DISCOUNTS_SORT_OPTIONS> =
	Object.values(DISCOUNTS_SORT_OPTIONS);

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
// STATUS BADGE CONFIG (mutualisé liste + détail)
// ============================================================================

export const DISCOUNT_STATUS_BADGE_CONFIG: Record<
	DiscountStatus,
	{ label: string; variant: "default" | "secondary" | "outline" | "success" }
> = {
	active: { label: "Actif", variant: "success" },
	inactive: { label: "Inactif", variant: "secondary" },
	scheduled: { label: "Planifié", variant: "outline" },
	expired: { label: "Expiré", variant: "secondary" },
	exhausted: { label: "Épuisé", variant: "secondary" },
};

// ============================================================================
// VALUE FORMATTERS (mutualisés liste + détail)
// ============================================================================

export function formatDiscountValue(type: DiscountType, value: number): string {
	if (type === DiscountType.PERCENTAGE) return `${value}%`;
	return formatEuro(value);
}

export function formatDiscountUsage(usageCount: number, maxUsageCount: number | null): string {
	if (maxUsageCount === null) return `${usageCount} / ∞`;
	return `${usageCount} / ${maxUsageCount}`;
}

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const DISCOUNT_ERROR_MESSAGES = {
	NOT_FOUND: "Code promo introuvable",
	NOT_ACTIVE: "Ce code promo n'est plus actif",
	NOT_YET_ACTIVE: "Ce code promo n'est pas encore actif",
	EXPIRED: "Ce code promo a expiré",
	MAX_USAGE_REACHED: "Ce code promo a atteint sa limite d'utilisation",
	USER_MAX_USAGE_REACHED: "Vous avez déjà utilisé ce code promo",
	MIN_ORDER_NOT_MET: "Commande minimum de {amount}€ requise",
	ALREADY_EXISTS: "Un code promo avec ce code existe déjà",
	CREATE_FAILED: "Erreur lors de la création du code promo",
	UPDATE_FAILED: "Erreur lors de la modification du code promo",
	DELETE_FAILED: "Erreur lors de la suppression du code promo",
	HAS_USAGES: "Ce code promo a déjà été utilisé et ne peut pas être supprimé",
	NOT_DELETED: "Ce code promo n'est pas supprimé",
	RESTORE_FAILED: "Erreur lors de la restauration du code promo",
	BULK_GENERATE_FAILED: "Erreur lors de la génération des codes promo",
	BULK_GENERATE_NO_CODES: "Aucun code n'a pu être généré (collisions persistantes)",
	EXTEND_FAILED: "Erreur lors de la prolongation du code promo",
	EXTEND_NO_END_DATE: "Ce code promo n'a pas de date de fin à prolonger",
	RESET_COUNTER_FAILED: "Erreur lors de la réinitialisation du compteur",
	EXPORT_USAGES_FAILED: "Erreur lors de l'export des utilisations",
	NO_USAGES_TO_EXPORT: "Ce code promo n'a aucune utilisation à exporter",
} as const;
