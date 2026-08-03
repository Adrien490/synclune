import { type Prisma, type DiscountType } from "@/app/generated/prisma/client";
import { type z } from "zod";
import { type PaginationInfo } from "@/shared/lib/pagination";
import {
	type GET_DISCOUNT_SELECT,
	type GET_DISCOUNTS_SELECT,
	type GET_DISCOUNT_VALIDATION_SELECT,
} from "../constants/discount.constants";
import {
	type getDiscountByCodeSchema,
	type getDiscountSchema,
	type getDiscountsSchema,
} from "../schemas/discount.schemas";

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
export type GetDiscountByCodeReturn = Prisma.DiscountGetPayload<{
	select: typeof GET_DISCOUNT_VALIDATION_SELECT;
}> | null;

// ============================================================================
// FUNCTION TYPES - LIST
// ============================================================================

export type GetDiscountsParams = Omit<z.infer<typeof getDiscountsSchema>, "direction"> & {
	direction?: "forward" | "backward";
};

export type GetDiscountsReturn = {
	discounts: Array<Prisma.DiscountGetPayload<{ select: typeof GET_DISCOUNTS_SELECT }>>;
	pagination: PaginationInfo;
	totalCount: number;
};

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export type ValidateDiscountCodeReturn = {
	valid: boolean;
	discount?: {
		id: string;
		code: string;
		type: DiscountType;
		value: number;
		discountAmount: number; // Montant calculé en centimes
		excludeSaleItems: boolean; // Si true, les articles soldés sont exclus du calcul
	};
	error?: string;
};

// ============================================================================
// DISCOUNT APPLICATION CONTEXT
// ============================================================================

/**
 * Contexte pour l'application d'un code promo
 * Utilisé lors du checkout pour valider et calculer la réduction
 */
export type DiscountApplicationContext = {
	subtotal: number; // Montant du panier en centimes (hors frais de port)
	customerEmail?: string; // Email de commande — seule identité pour maxUsagePerUser (parcours invité)
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
