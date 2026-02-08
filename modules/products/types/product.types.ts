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

// Re-export depuis shared (évite la dépendance circulaire avec skus)
export type { ProductVariantInfo } from "@/shared/types/product-sku.types";

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
};

export type GetProductsReturn = {
	products: Array<
		Prisma.ProductGetPayload<{ select: typeof GET_PRODUCTS_SELECT }>
	>;
	pagination: PaginationInfo;
	/** Nombre total de produits correspondant aux filtres (avant pagination) */
	totalCount: number;
	/** Suggestion de correction orthographique quand peu/pas de résultats */
	suggestion?: string;
	/** Indique si le rate limit a été atteint (fallback vers recherche exacte) */
	rateLimited?: boolean;
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

// ============================================================================
// PRODUCT CARD DATA (centralisé ici comme source de vérité)
// ============================================================================

import type { ColorSwatch, SkuFromList } from "./product-list.types";
import type { ProductStockInfo } from "@/shared/types/product-sku.types";

/**
 * Données combinées pour ProductCard (optimisé O(n))
 *
 * Ce type est utilisé par getProductCardData() dans product-display.service.ts
 * et représente toutes les informations nécessaires pour afficher une carte produit.
 */
export interface ProductCardData {
	/** SKU principal sélectionné (peut être null si aucun SKU actif) */
	defaultSku: SkuFromList | null;
	/** Prix TTC en centimes */
	price: number;
	/** Prix barré (compareAtPrice) en centimes ou null */
	compareAtPrice: number | null;
	/** Informations de stock agrégées */
	stockInfo: ProductStockInfo;
	/** Image principale du produit */
	primaryImage: {
		id: string;
		url: string;
		alt?: string;
		mediaType: "IMAGE";
		blurDataUrl?: string;
	};
	/** Couleurs disponibles pour les swatches */
	colors: ColorSwatch[];
	/**
	 * Indique si le produit a un SKU actif valide.
	 * false signifie que le produit ne devrait pas être affiché
	 * ou qu'un warning devrait être montré à l'admin.
	 */
	hasValidSku: boolean;
}
