import { type Prisma } from "@/app/generated/prisma/client";
import { type z } from "zod";
import { type PaginationInfo } from "@/shared/lib/pagination";
import {
	type GET_PRODUCT_SELECT,
	type GET_PRODUCTS_SELECT,
	type GET_PRODUCTS_SORT_FIELDS,
	type PRODUCT_CAROUSEL_SELECT,
} from "../constants/product.constants";
import {
	type getProductSchema,
	type getProductsSchema,
	type productFiltersSchema,
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

// Re-export depuis shared (évite la dépendance circulaire avec skus)
// ============================================================================
// TYPES - PRODUCT LIST (Liste avec pagination)
// ============================================================================

export type ProductFilters = z.infer<typeof productFiltersSchema>;

export type SortField = (typeof GET_PRODUCTS_SORT_FIELDS)[number];

export type GetProductsParams = Omit<z.infer<typeof getProductsSchema>, "direction" | "status"> & {
	direction?: "forward" | "backward";
	status?: z.infer<typeof getProductsSchema>["status"];
};

export type GetProductsReturn = {
	products: Array<Prisma.ProductGetPayload<{ select: typeof GET_PRODUCTS_SELECT }>>;
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
 * Payload allégé pour carousels et grilles légères (related / recent / cross-sell).
 * Sous-ensemble structurel de Product : un Product peut être passé partout où
 * ProductCarouselItem est attendu (typage structurel).
 */
export type ProductCarouselItem = Prisma.ProductGetPayload<{
	select: typeof PRODUCT_CAROUSEL_SELECT;
}>;

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
	/** Image principale du produit (`alt` toujours renseigné par le service) */
	primaryImage: {
		id: string;
		url: string;
		alt: string;
		mediaType: "IMAGE";
		blurDataUrl?: string;
	};
	/** Image secondaire pour le hover (null si aucune disponible) */
	secondaryImage: {
		id: string;
		url: string;
		alt: string;
		mediaType: "IMAGE";
		blurDataUrl?: string;
	} | null;
	/** Couleurs disponibles pour les swatches */
	colors: ColorSwatch[];
	/**
	 * Matériau principal du SKU affiché (position 0, priorité saisie admin).
	 * null si le SKU n'a aucun matériau ou si aucun SKU actif.
	 */
	material: string | null;
	/**
	 * Indique si le produit a un SKU actif valide.
	 * false signifie que le produit ne devrait pas être affiché
	 * ou qu'un warning devrait être montré à l'admin.
	 */
	hasValidSku: boolean;
}
