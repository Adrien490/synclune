import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";
import { PaginationInfo } from "@/shared/components/cursor-pagination/pagination";
import {
	GET_PRODUCT_SELECT,
	GET_PRODUCTS_SELECT,
	GET_PRODUCTS_SORT_FIELDS,
	PRODUCT_LIST_SELECT,
} from "../constants/product.constants";
import {
	getProductSchema,
	getProductsSchema,
	productFiltersSchema,
	createProductSchema,
	updateProductSchema,
	deleteProductSchema,
	duplicateProductSchema,
	toggleProductStatusSchema,
	bulkDeleteProductsSchema,
	bulkArchiveProductsSchema,
	bulkChangeProductStatusSchema,
} from "../schemas/product.schemas";

// ============================================================================
// INFERRED TYPES FROM SCHEMAS
// ============================================================================

export type GetProductParams = z.infer<typeof getProductSchema>;

// ============================================================================
// TYPES - SINGLE PRODUCT (Détail)
// ============================================================================

export type GetProductReturn = Prisma.ProductGetPayload<{
	select: typeof GET_PRODUCT_SELECT;
}>;

export type ProductSku = GetProductReturn["skus"][0];
export type ProductType = GetProductReturn["type"];
export type ProductCollections = GetProductReturn["collections"];
export type ProductCollectionItem = ProductCollections[number];
export type ProductCollection = ProductCollectionItem["collection"];

export type ProductVariantInfo = {
	availableColors: Array<{
		id: string;
		slug?: string;
		hex?: string;
		name: string;
		availableSkus: number;
	}>;
	availableMaterials: Array<{
		name: string;
		availableSkus: number;
	}>;
	availableSizes: Array<{
		size: string;
		availableSkus: number;
	}>;
	priceRange: {
		min: number;
		max: number;
	};
	totalStock: number;
};

// ============================================================================
// TYPES - PRODUCT LIST (Liste avec pagination)
// ============================================================================

export type ProductFilters = z.infer<typeof productFiltersSchema>;

export type SortField = (typeof GET_PRODUCTS_SORT_FIELDS)[number];

export type GetProductsParams = Omit<
	z.infer<typeof getProductsSchema>,
	"direction" | "status"
> & {
	direction?: "forward" | "backward";
	status?: z.infer<typeof getProductsSchema>["status"];
	includeDeleted?: boolean; // ⚠️ AUDIT FIX: Option pour inclure les produits soft-deleted (admin)
};

export type GetProductsReturn = {
	products: Array<
		Prisma.ProductGetPayload<{ select: typeof GET_PRODUCTS_SELECT }>
	>;
	pagination: PaginationInfo;
};

export type Product = Prisma.ProductGetPayload<{
	select: typeof GET_PRODUCTS_SELECT;
}>;

/**
 * Type minimal pour les listings produits (grids, carousels)
 * Utiliser avec PRODUCT_LIST_SELECT
 */
export type ProductListItem = Prisma.ProductGetPayload<{
	select: typeof PRODUCT_LIST_SELECT;
}>;

// ============================================================================
// MUTATION TYPES
// ============================================================================

export type CreateProductFormData = z.infer<typeof createProductSchema>;
export type UpdateProductFormData = z.infer<typeof updateProductSchema>;
export type DeleteProductInput = z.infer<typeof deleteProductSchema>;
export type DuplicateProductInput = z.infer<typeof duplicateProductSchema>;
export type ToggleProductStatusInput = z.infer<typeof toggleProductStatusSchema>;
export type BulkDeleteProductsInput = z.infer<typeof bulkDeleteProductsSchema>;
export type BulkArchiveProductsInput = z.infer<typeof bulkArchiveProductsSchema>;
export type BulkChangeProductStatusInput = z.infer<typeof bulkChangeProductStatusSchema>;
