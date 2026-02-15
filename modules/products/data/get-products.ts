import { z } from "zod";

import { isAdmin } from "@/modules/auth/utils/guards";
import { getRateLimitId } from "@/modules/auth/lib/rate-limit-helpers";
import { prisma } from "@/shared/lib/prisma";
import { checkRateLimit } from "@/shared/lib/rate-limit";
import { getProductsSchema } from "../schemas/product.schemas";

import {
	GET_PRODUCTS_ADMIN_FALLBACK_SORT_BY,
	GET_PRODUCTS_DEFAULT_PER_PAGE,
	GET_PRODUCTS_DEFAULT_SORT_BY,
	GET_PRODUCTS_MAX_RESULTS_PER_PAGE,
	GET_PRODUCTS_SELECT,
} from "../constants/product.constants";
import { SEARCH_RATE_LIMITS } from "../constants/search.constants";
import type { GetProductsParams, GetProductsReturn, Product } from "../types/product.types";
import {
	buildProductWhereClause,
	buildSearchConditions,
	buildExactSearchConditions,
	type SearchResult,
} from "../services/product-query-builder";
import {
	getSpellSuggestion,
	SUGGESTION_THRESHOLD_RESULTS,
} from "./spell-suggestion";
import { sortProducts, orderByIds } from "../services/product-list-sorting.service";
import { cacheProducts } from "../utils/cache.utils";
import { serializeProduct } from "../utils/serialize-product";

// Re-exports for compatibility
export {
	GET_PRODUCTS_DEFAULT_PER_PAGE,
	GET_PRODUCTS_DEFAULT_SORT_BY,
	GET_PRODUCTS_MAX_RESULTS_PER_PAGE,
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
 * Server action to fetch products with access control.
 * Integrates fuzzy search with pg_trgm for typo tolerance.
 */
export async function getProducts(
	params: GetProductsParams,
	options?: { isAdmin?: boolean }
): Promise<GetProductsReturn> {
	try {
		// Validate input parameters
		const validation = getProductsSchema.safeParse(params);

		if (!validation.success) {
			throw new Error(
				"Invalid parameters: " + JSON.stringify(validation.error.issues)
			);
		}

		let validatedParams = validation.data as GetProductsParams;
		const admin = options?.isAdmin ?? (await isAdmin());

		// Admin: use admin default sort if no explicit sort provided
		if (admin && !hasSortByInput(validatedParams?.sortBy)) {
			validatedParams = { ...validatedParams, sortBy: GET_PRODUCTS_ADMIN_FALLBACK_SORT_BY };
		}

		// Run fuzzy search BEFORE the cache
		// This allows caching results based on found IDs
		let searchResult: SearchResult | undefined;
		let rateLimited = false;

		if (validatedParams.search) {
			// Rate limiting: protects against scraping and abuse
			let useExactOnly = false;
			try {
				const rateLimitId = await getRateLimitId();
				const isAuthenticated = rateLimitId.startsWith("user:");
				const limits = isAuthenticated
					? SEARCH_RATE_LIMITS.authenticated
					: SEARCH_RATE_LIMITS.guest;

				const rateLimitResult = await checkRateLimit(`search:${rateLimitId}`, limits);
				if (!rateLimitResult.success) {
					// Fallback: use exact search only
					console.warn("[search] Rate limit exceeded:", {
						identifier: rateLimitId,
						retryAfter: rateLimitResult.retryAfter,
					});
					useExactOnly = true;
					rateLimited = true;
				}
			} catch {
				// On rate limit error, continue without blocking
			}

			searchResult = useExactOnly
				? buildExactSearchConditions(validatedParams.search)
				: await buildSearchConditions(validatedParams.search, { status: validatedParams.status });
		}

		// Fetch products
		const result = await fetchProducts(validatedParams, searchResult);

		// Suggest a correction if few or no results with an active search
		// Skip suggestions for admins (they often search by SKU/ID)
		if (
			validatedParams.search &&
			!admin &&
			result.totalCount <= SUGGESTION_THRESHOLD_RESULTS
		) {
			const suggestion = await getSpellSuggestion(validatedParams.search, {
				status: validatedParams.status,
			});
			if (suggestion) {
				return { ...result, suggestion: suggestion.term, rateLimited };
			}
		}

		return rateLimited ? { ...result, rateLimited } : result;
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new Error("Invalid parameters");
		}

		throw error;
	}
}

/**
 * Fetch product list with pagination, sorting and filtering.
 * Simplified approach: sort in JS to support price sorting without a denormalized field.
 *
 * @param params - Search parameters
 * @param searchResult - Fuzzy search result (optional)
 */
async function fetchProducts(
	params: GetProductsParams,
	searchResult?: SearchResult
): Promise<GetProductsReturn> {
	"use cache";
	cacheProducts();

	try {
		const where = buildProductWhereClause(params, searchResult);

		// NOTE: All products are loaded then sorted/paginated in JS because:
		// - Price sorting requires MIN() on SKUs (not possible in Prisma)
		// - Fuzzy sorting preserves the relevance order of pre-computed IDs
		// - Bestsellers/popular use pre-computed IDs
		// For a catalog >10,000 products, consider denormalizing minPrice.
		const allProducts = await prisma.product.findMany({
			where,
			select: GET_PRODUCTS_SELECT,
		});

		// Sort products:
		// - If active fuzzy search with results -> sort by relevance (default)
		// - Otherwise -> sort by the requested criterion
		const fuzzyIds = searchResult?.fuzzyIds;
		const hasFuzzyResults = fuzzyIds && fuzzyIds.length > 0;

		let sortedProducts: Product[];
		if (hasFuzzyResults && params.sortBy === GET_PRODUCTS_DEFAULT_SORT_BY) {
			// Sort by relevance (preserves fuzzy search order)
			sortedProducts = orderByIds(allProducts, fuzzyIds);
		} else {
			// Sort by the user-requested criterion
			sortedProducts = sortProducts(allProducts, params.sortBy);
		}

		// Manual pagination
		const perPage = Math.min(
			Math.max(1, params.perPage || GET_PRODUCTS_DEFAULT_PER_PAGE),
			GET_PRODUCTS_MAX_RESULTS_PER_PAGE
		);

		// Find start index based on cursor
		let startIndex = 0;
		if (params.cursor) {
			const cursorIndex = sortedProducts.findIndex((p) => p.id === params.cursor);
			if (cursorIndex !== -1) {
				startIndex = params.direction === "backward"
					? Math.max(0, cursorIndex - perPage)
					: cursorIndex + 1;
			}
		}

		// Extract result page
		const pageProducts = sortedProducts.slice(startIndex, startIndex + perPage);

		// Compute pagination
		// Convention aligned with processCursorResults (Relay spec):
		// - nextCursor = last element of the page (for going forward)
		// - prevCursor = first element of the page (for going backward)
		const hasNextPage = startIndex + perPage < sortedProducts.length;
		const hasPreviousPage = startIndex > 0;
		const nextCursor = hasNextPage ? pageProducts[pageProducts.length - 1]?.id ?? null : null;
		const prevCursor = hasPreviousPage ? pageProducts[0]?.id ?? null : null;

		return {
			products: pageProducts.map(serializeProduct),
			pagination: {
				nextCursor,
				prevCursor,
				hasNextPage,
				hasPreviousPage,
			},
			totalCount: sortedProducts.length,
		};
	} catch (error) {
		console.warn("[fetchProducts] Error:", error instanceof Error ? error.message : error);
		const baseReturn = {
			products: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
			totalCount: 0,
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
