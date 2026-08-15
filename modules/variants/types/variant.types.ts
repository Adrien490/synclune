import { type Prisma } from "@/app/generated/prisma/client";
import { type GET_PRODUCT_VARIANT_SELECT } from "../constants/variant.constants";

// ============================================================================
// FUNCTION TYPES
// ============================================================================

type GetProductVariantReturn = Prisma.ProductVariantGetPayload<{
	select: typeof GET_PRODUCT_VARIANT_SELECT;
}>;

// ============================================================================
// VARIANT DETAIL (for edit forms) — schéma lean : le média vit sur le produit
// ============================================================================

export type VariantDetail = GetProductVariantReturn & {
	/** Vrai si cette variante est la première du produit (représentant). */
	isRepresentative: boolean;
};

// ============================================================================
// VARIANT MATCHING TYPES
// ============================================================================

/** Sélecteurs de variantes pour le matching (identité couleur = nom slugifié) */
export interface VariantSelectors {
	colorId?: string;
	colorSlug?: string;
	colorHex?: string;
	material?: string;
	materialSlug?: string;
	size?: string;
}

// ============================================================================
// VARIANT VALIDATION TYPES
// ============================================================================

/** Sélection de variantes courante */
export interface VariantSelection {
	color: string | null;
	material: string | null;
	size: string | null;
}

/** Retour du hook useVariantValidation */
export interface UseVariantValidationReturn {
	validationErrors: string[];
	isValid: boolean;
	requiresColor: boolean;
	requiresMaterial: boolean;
	requiresSize: boolean;
}
