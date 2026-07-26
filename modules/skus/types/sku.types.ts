import { type Prisma } from "@/app/generated/prisma/client";
import { type GET_PRODUCT_SKU_SELECT } from "../constants/sku.constants";

// ============================================================================
// FUNCTION TYPES
// ============================================================================

type GetProductSkuReturn = Prisma.ProductSkuGetPayload<{
	select: typeof GET_PRODUCT_SKU_SELECT;
}>;

// ============================================================================
// SKU WITH IMAGES (for edit forms)
// ============================================================================

import type { MediaType } from "@/app/generated/prisma/client";

/**
 * Type pour SKU avec images (pour édition)
 * Inclut toutes les données nécessaires au formulaire de modification
 */
export type SkuWithImages = GetProductSkuReturn & {
	images: Array<{
		id: string;
		url: string;
		thumbnailUrl: string | null;
		blurDataUrl: string | null;
		altText: string | null;
		mediaType: MediaType;
		isPrimary: boolean;
	}>;
	compareAtPrice: number | null;
};

// ============================================================================
// PARSED MEDIA TYPES
// ============================================================================

/**
 * Media parsé depuis FormData
 */
export interface ParsedMedia {
	url: string;
	thumbnailUrl?: string | null;
	blurDataUrl?: string | null;
	altText?: string | null;
	mediaType?: "IMAGE" | "VIDEO";
	/** Dimensions intrinseques lues a l'upload (absentes sur un media legacy) */
	width?: number | null;
	height?: number | null;
}

// ============================================================================
// CACHE INVALIDATION TYPES
// ============================================================================

/**
 * Type pour les données SKU nécessaires à l'invalidation bulk
 */
export interface SkuDataForInvalidation {
	id: string;
	sku: string;
	productId: string;
	product: { slug: string };
}

// ============================================================================
// VARIANT MATCHING TYPES
// ============================================================================

/**
 * Sélecteurs de variantes pour le matching
 */
export interface VariantSelectors {
	colorId?: string;
	colorSlug?: string;
	colorHex?: string;
	/**
	 * Clé canonique d'une combinaison M2M (slugs triés alphabétiquement, séparés
	 * par "__"). Si présente, prime sur `colorSlug` et impose un set égalité strict
	 * sur les couleurs du SKU — permet de cibler une variante bicolore via URL.
	 */
	colorCombo?: string;
	material?: string;
	materialSlug?: string;
	size?: string;
}

// ============================================================================
// VARIANT VALIDATION TYPES
// ============================================================================

/**
 * Sélection de variantes courante
 */
export interface VariantSelection {
	color: string | null;
	material: string | null;
	size: string | null;
}

/**
 * Retour du hook useVariantValidation
 */
export interface UseVariantValidationReturn {
	validationErrors: string[];
	isValid: boolean;
	requiresColor: boolean;
	requiresMaterial: boolean;
	requiresSize: boolean;
}
