import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";
import { GET_PRODUCT_SKU_SELECT } from "../constants/sku.constants";
import {
	getProductSkuSchema,
	createProductSkuSchema,
	updateProductSkuSchema,
	deleteProductSkuSchema,
	updateProductSkuStatusSchema,
	bulkActivateSkusSchema,
	bulkDeactivateSkusSchema,
	bulkDeleteSkusSchema,
} from "../schemas/sku.schemas";

// ============================================================================
// FUNCTION TYPES
// ============================================================================

export type GetProductSkuParams = z.infer<typeof getProductSkuSchema>;

export type GetProductSkuReturn = Prisma.ProductSkuGetPayload<{
	select: typeof GET_PRODUCT_SKU_SELECT;
}>;

// ============================================================================
// MUTATION TYPES
// ============================================================================

export type CreateProductSkuFormData = z.infer<typeof createProductSkuSchema>;
export type UpdateProductSkuFormData = z.infer<typeof updateProductSkuSchema>;
export type DeleteProductSkuInput = z.infer<typeof deleteProductSkuSchema>;
export type UpdateProductSkuStatusInput = z.infer<typeof updateProductSkuStatusSchema>;
export type BulkActivateSkusInput = z.infer<typeof bulkActivateSkusSchema>;
export type BulkDeactivateSkusInput = z.infer<typeof bulkDeactivateSkusSchema>;
export type BulkDeleteSkusInput = z.infer<typeof bulkDeleteSkusSchema>;

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
	materialId: string | null;
};

// ============================================================================
// INVENTORY TYPES
// ============================================================================

import type { ProductSkuFilters } from "../schemas/sku-filters-schema";

/**
 * Paramètres pour la récupération de l'inventaire global
 */
export interface GetInventoryParams {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: number;
	sortBy?: string;
	search?: string;
	filters?: Partial<ProductSkuFilters>;
}

// ============================================================================
// PARSED MEDIA TYPES
// ============================================================================

/**
 * Media parsé depuis FormData
 */
export interface ParsedMedia {
	url: string;
	thumbnailUrl?: string | null;
	blurDataUrl?: string;
	altText?: string;
	mediaType?: "IMAGE" | "VIDEO";
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
