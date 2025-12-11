import { Prisma } from "@/app/generated/prisma/client";
import {
	buildCursorPagination,
	processCursorResults,
} from "@/shared/components/cursor-pagination/pagination";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import { getSortDirection } from "@/shared/utils/sort-direction";

import {
	GET_PRODUCTS_ADMIN_FALLBACK_SORT_BY,
	GET_PRODUCTS_DEFAULT_PER_PAGE,
	GET_PRODUCTS_DEFAULT_SORT_BY,
	GET_PRODUCTS_MAX_RESULTS_PER_PAGE,
	GET_PRODUCTS_SELECT,
} from "../constants/product.constants";
import type { GetProductsParams, GetProductsReturn } from "../types/product.types";
import { buildProductWhereClause } from "../services/product-query-builder";
import { cacheProducts } from "../constants/cache";

// Re-export pour compatibilité
export {
	GET_PRODUCTS_DEFAULT_PER_PAGE,
	GET_PRODUCTS_DEFAULT_SORT_BY,
	GET_PRODUCTS_MAX_RESULTS_PER_PAGE,
	GET_PRODUCTS_SORT_FIELDS,
	SORT_LABELS,
	SORT_OPTIONS,
} from "../constants/product.constants";
export { productFiltersSchema, productSortBySchema } from "../schemas/product.schemas";
export type {
	GetProductsParams,
	GetProductsReturn,
	Product,
	ProductFilters,
	SortField,
} from "../types/product.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

const hasSortByInput = (input: unknown): input is string =>
	typeof input === "string" && input.trim().length > 0;

/**
 * Action serveur pour récupérer les produits avec gestion des droits
 */
export async function getProducts(
	params: GetProductsParams,
	options?: { isAdmin?: boolean }
): Promise<GetProductsReturn> {
	const admin = options?.isAdmin ?? (await isAdmin());

	if (
		admin &&
		params.sortBy === GET_PRODUCTS_DEFAULT_SORT_BY &&
		!hasSortByInput(params?.sortBy)
	) {
		params = { ...params, sortBy: GET_PRODUCTS_ADMIN_FALLBACK_SORT_BY };
	}

	return fetchProducts(params);
}

/**
 * Récupère la liste des produits avec pagination, tri et filtrage
 */
async function fetchProducts(
	params: GetProductsParams
): Promise<GetProductsReturn> {
	"use cache";
	cacheProducts();

	try {
		const where = buildProductWhereClause(params);
		const direction = getSortDirection(params.sortBy);

		// Tri SQL natif - utilise minPriceInclTax dénormalisé pour le tri par prix
		const orderBy: Prisma.ProductOrderByWithRelationInput[] =
			params.sortBy.startsWith("best-selling")
				? [{ createdAt: direction }, { id: "asc" }]
				: params.sortBy.startsWith("title-")
					? [{ title: direction }, { id: "asc" }]
					: params.sortBy.startsWith("price-")
						? [{ minPriceInclTax: direction }, { id: "asc" }]
						: params.sortBy.startsWith("created-")
							? [{ createdAt: direction }, { id: "asc" }]
							: [{ createdAt: "desc" }, { id: "asc" }];

		const take = Math.min(
			Math.max(1, params.perPage || GET_PRODUCTS_DEFAULT_PER_PAGE),
			GET_PRODUCTS_MAX_RESULTS_PER_PAGE
		);

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		const products = await prisma.product.findMany({
			where,
			select: GET_PRODUCTS_SELECT,
			orderBy,
			...cursorConfig,
		});

		const { items, pagination } = processCursorResults(
			products,
			take,
			params.direction,
			params.cursor
		);

		return { products: items, pagination };
	} catch (error) {
		const baseReturn = {
			products: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
			error:
				process.env.NODE_ENV === "development"
					? error instanceof Error
						? error.message
						: "Unknown error"
					: "Failed to fetch products",
		};

		return baseReturn as GetProductsReturn & { error: string };
	}
}
