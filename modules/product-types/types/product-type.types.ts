import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";
import { PaginationInfo } from "@/shared/components/cursor-pagination/pagination";
import {
	GET_PRODUCT_TYPES_SELECT,
	GET_PRODUCT_TYPE_SELECT,
} from "../constants/product-type.constants";
import {
	getProductTypesSchema,
	getProductTypeSchema,
	productTypeFiltersSchema,
	createProductTypeSchema,
	updateProductTypeSchema,
	deleteProductTypeSchema,
	toggleProductTypeStatusSchema,
	bulkActivateProductTypesSchema,
	bulkDeactivateProductTypesSchema,
} from "../schemas/product-type.schemas";

// ============================================================================
// INFERRED TYPES FROM SCHEMAS
// ============================================================================

export type ProductTypeFilters = z.infer<typeof productTypeFiltersSchema>;

// ============================================================================
// FUNCTION TYPES - LIST
// ============================================================================

export type GetProductTypesParamsInput = z.input<typeof getProductTypesSchema>;

export type GetProductTypesParams = z.output<typeof getProductTypesSchema>;

export type GetProductTypesReturn = {
	productTypes: Array<
		Prisma.ProductTypeGetPayload<{ select: typeof GET_PRODUCT_TYPES_SELECT }>
	>;
	pagination: PaginationInfo;
};

// ============================================================================
// FUNCTION TYPES - SINGLE
// ============================================================================

export type GetProductTypeParams = z.infer<typeof getProductTypeSchema>;

export type GetProductTypeReturn = Prisma.ProductTypeGetPayload<{
	select: typeof GET_PRODUCT_TYPE_SELECT;
}>;

// ============================================================================
// ENTITY TYPES
// ============================================================================

export type ProductType = Prisma.ProductTypeGetPayload<{
	select: typeof GET_PRODUCT_TYPES_SELECT;
}>;

// ============================================================================
// MUTATION TYPES
// ============================================================================

export type CreateProductTypeInput = z.infer<typeof createProductTypeSchema>;
export type UpdateProductTypeInput = z.infer<typeof updateProductTypeSchema>;
export type DeleteProductTypeInput = z.infer<typeof deleteProductTypeSchema>;
export type ToggleProductTypeStatusInput = z.infer<typeof toggleProductTypeStatusSchema>;
export type BulkActivateProductTypesInput = z.infer<typeof bulkActivateProductTypesSchema>;
export type BulkDeactivateProductTypesInput = z.infer<typeof bulkDeactivateProductTypesSchema>;

// ============================================================================
// UI/FORM TYPES
// ============================================================================

/**
 * Type simplifié pour les selects et filtres
 */
export type ProductTypeOption = {
	id: string;
	label: string;
};

/**
 * Type pour les hooks de formulaire d'édition
 */
export type ProductTypeFormData = {
	id: string;
	label: string;
	description?: string | null;
	slug: string;
};
