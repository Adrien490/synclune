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

		const orderBy: Prisma.ProductOrderByWithRelationInput[] =
			params.sortBy.startsWith("best-selling")
				? [{ createdAt: direction }, { id: "asc" }]
				: params.sortBy.startsWith("title-")
					? [{ title: direction }, { id: "asc" }]
					: params.sortBy.startsWith("price-")
						? [{ createdAt: direction }, { id: "asc" }]
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

		// Special handling for price sorting
		// Note: Le tri par prix nécessite de charger tous les produits en mémoire
		// car le prix minimum est calculé à partir des SKUs.
		// Quick fix: Limite à 500 produits pour éviter les problèmes de mémoire.
		// TODO: Implémenter une colonne dénormalisée minPriceInclTax pour un tri SQL natif.
		if (params.sortBy.startsWith("price-")) {
			const MAX_PRODUCTS_FOR_PRICE_SORT = 500;

			const allProducts = await prisma.product.findMany({
				where,
				select: GET_PRODUCTS_SELECT,
				orderBy: [{ id: "asc" }],
				take: MAX_PRODUCTS_FOR_PRICE_SORT,
			});

			if (allProducts.length >= MAX_PRODUCTS_FOR_PRICE_SORT) {
				console.warn(
					`[getProducts] Price sort: ${allProducts.length} products loaded (limit reached). Consider implementing denormalized minPrice column.`
				);
			}

			const sortedProducts = allProducts.sort((a, b) => {
				const getPriceMin = (product: typeof a) => {
					if (!product.skus || product.skus.length === 0) return 0;
					return Math.min(...product.skus.map((sku) => sku.priceInclTax));
				};
				const priceA = getPriceMin(a);
				const priceB = getPriceMin(b);
				return direction === "asc" ? priceA - priceB : priceB - priceA;
			});

			let paginatedProducts: typeof sortedProducts;

			if (!params.cursor) {
				paginatedProducts = sortedProducts.slice(0, take + 1);
			} else {
				const cursorIndex = sortedProducts.findIndex(
					(p) => p.id === params.cursor
				);

				if (cursorIndex === -1) {
					paginatedProducts = [];
				} else if (params.direction === "backward") {
					const endIndex = cursorIndex;
					const startIndex = Math.max(0, endIndex - (take + 1));
					paginatedProducts = sortedProducts.slice(startIndex, endIndex);
				} else {
					const startIndex = cursorIndex + 1;
					paginatedProducts = sortedProducts.slice(
						startIndex,
						startIndex + take + 1
					);
				}
			}

			const { items, pagination } = processCursorResults(
				paginatedProducts,
				take,
				params.direction,
				params.cursor
			);

			return { products: items, pagination };
		}

		const products = await prisma.product.findMany({
			where,
			select: GET_PRODUCTS_SELECT,
			orderBy,
			...cursorConfig,
		});

		let filteredProducts = products;
		if (
			params.filters?.priceMin !== undefined &&
			params.filters?.priceMax !== undefined
		) {
			filteredProducts = products.filter((product) => {
				if (!product.skus || product.skus.length === 0) return false;
				const activePrices = product.skus
					.filter((sku) => sku.isActive)
					.map((sku) => sku.priceInclTax);
				if (activePrices.length === 0) return false;
				const minPrice = Math.min(...activePrices);
				return (
					minPrice >= params.filters!.priceMin! &&
					minPrice <= params.filters!.priceMax!
				);
			});
		}

		const { items, pagination } = processCursorResults(
			filteredProducts,
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
