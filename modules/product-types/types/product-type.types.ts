import { type Prisma } from "@/app/generated/prisma/client";
import { type z } from "zod";
import { type PaginationInfo } from "@/shared/lib/pagination";
import {
	type GET_PRODUCT_TYPES_MENU_SELECT,
	type GET_PRODUCT_TYPES_SELECT,
	type GET_PRODUCT_TYPE_SELECT,
} from "../constants/product-type.constants";
import {
	type getProductTypesSchema,
	type getProductTypeSchema,
	type productTypeFiltersSchema,
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
	productTypes: Array<Prisma.ProductTypeGetPayload<{ select: typeof GET_PRODUCT_TYPES_SELECT }>>;
	pagination: PaginationInfo;
	totalCount: number;
};

// ============================================================================
// FUNCTION TYPES - SINGLE
// ============================================================================

export type GetProductTypeParams = z.infer<typeof getProductTypeSchema>;

export type GetProductTypeReturn = Prisma.ProductTypeGetPayload<{
	select: typeof GET_PRODUCT_TYPE_SELECT;
}>;

/** Ligne du select menu (`getProductTypesForMenu`) : compte + produit-vignette. */
export type MenuProductType = Prisma.ProductTypeGetPayload<{
	select: typeof GET_PRODUCT_TYPES_MENU_SELECT;
}>;

// ============================================================================
// ENTITY TYPES
// ============================================================================

export type ProductType = Prisma.ProductTypeGetPayload<{
	select: typeof GET_PRODUCT_TYPES_SELECT;
}>;

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
