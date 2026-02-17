import { Prisma, DiscountType } from "@/app/generated/prisma/client";
import { z } from "zod";
import { PaginationInfo } from "@/shared/lib/pagination";
import {
	GET_DISCOUNT_SELECT,
	GET_DISCOUNTS_SELECT,
	GET_DISCOUNT_VALIDATION_SELECT,
} from "../constants/discount.constants";
import {
	discountFiltersSchema,
	getDiscountSchema,
	getDiscountByCodeSchema,
	getDiscountsSchema,
	validateDiscountCodeSchema,
	createDiscountSchema,
	updateDiscountSchema,
	deleteDiscountSchema,
	bulkDeleteDiscountsSchema,
	toggleDiscountStatusSchema,
} from "../schemas/discount.schemas";

// ============================================================================
// INFERRED TYPES FROM SCHEMAS
// ============================================================================

export type DiscountFilters = z.infer<typeof discountFiltersSchema>;

// ============================================================================
// SERVICE TYPES (from services/)
// ============================================================================

/**
 * Statut possible d'un code promo
 */
export type DiscountStatus = "active" | "inactive" | "exhausted" | "scheduled" | "expired";

// ============================================================================
// ENTITY TYPES
// ============================================================================

export type Discount = Prisma.DiscountGetPayload<{
	select: typeof GET_DISCOUNTS_SELECT;
}>;

export type DiscountDetail = Prisma.DiscountGetPayload<{
	select: typeof GET_DISCOUNT_SELECT;
}>;

export type DiscountValidation = Prisma.DiscountGetPayload<{
	select: typeof GET_DISCOUNT_VALIDATION_SELECT;
}>;

// ============================================================================
// FUNCTION TYPES - SINGLE
// ============================================================================

export type GetDiscountParams = z.infer<typeof getDiscountSchema>;
export type GetDiscountReturn = Prisma.DiscountGetPayload<{
	select: typeof GET_DISCOUNT_SELECT;
}> | null;

export type GetDiscountByCodeParams = z.infer<typeof getDiscountByCodeSchema>;
export type GetDiscountByCodeReturn = DiscountValidation | null;

// ============================================================================
// FUNCTION TYPES - LIST
// ============================================================================

export type GetDiscountsParams = Omit<
	z.infer<typeof getDiscountsSchema>,
	"direction"
> & {
	direction?: "forward" | "backward";
};

export type GetDiscountsReturn = {
	discounts: Array<
		Prisma.DiscountGetPayload<{ select: typeof GET_DISCOUNTS_SELECT }>
	>;
	pagination: PaginationInfo;
};

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export type ValidateDiscountCodeParams = z.infer<
	typeof validateDiscountCodeSchema
>;

export type ValidateDiscountCodeReturn = {
	valid: boolean;
	discount?: {
		id: string;
		code: string;
		type: DiscountType;
		value: number;
		discountAmount: number; // Montant calculé en centimes
	};
	error?: string;
};

// ============================================================================
// MUTATION TYPES
// ============================================================================

export type CreateDiscountInput = z.infer<typeof createDiscountSchema>;
export type UpdateDiscountInput = z.infer<typeof updateDiscountSchema>;
export type DeleteDiscountInput = z.infer<typeof deleteDiscountSchema>;
export type BulkDeleteDiscountsInput = z.infer<typeof bulkDeleteDiscountsSchema>;
export type ToggleDiscountStatusInput = z.infer<typeof toggleDiscountStatusSchema>;

// ============================================================================
// DISCOUNT APPLICATION CONTEXT
// ============================================================================

/**
 * Contexte pour l'application d'un code promo
 * Utilisé lors du checkout pour valider et calculer la réduction
 */
export type DiscountApplicationContext = {
	subtotal: number; // Montant du panier en centimes (hors frais de port)
	userId?: string; // ID utilisateur connecté
	customerEmail?: string; // Email pour guest checkout
	excludeSaleItems?: boolean; // Exclure les articles soldés du calcul
};

/**
 * Résultat de l'application d'un code promo
 */
export type AppliedDiscount = {
	id: string;
	code: string;
	type: DiscountType;
	value: number;
	discountAmount: number; // Montant de la réduction en centimes
};

// ============================================================================
// ELIGIBILITY CHECK TYPES
// ============================================================================

/**
 * Résultat de vérification d'éligibilité
 */
export type EligibilityCheckResult = {
	eligible: boolean;
	error?: string;
};

// ============================================================================
// CALCULATION TYPES
// ============================================================================

/**
 * Paramètres pour calculer le montant de réduction
 */
export type CalculateDiscountParams = {
	type: DiscountType;
	value: number;
	subtotal: number; // En centimes (hors frais de port)
};

/**
 * Item du panier pour le calcul de réduction avec exclusion articles soldés
 */
export type CartItemForDiscount = {
	priceInclTax: number; // Prix unitaire en centimes
	quantity: number;
	compareAtPrice: number | null; // Si non-null, l'article est soldé
};

/**
 * Paramètres pour calculer la réduction avec exclusion des articles soldés
 */
export type CalculateDiscountWithExclusionParams = {
	type: DiscountType;
	value: number;
	cartItems: CartItemForDiscount[];
	excludeSaleItems: boolean;
};
