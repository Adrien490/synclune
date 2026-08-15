import { z } from "zod";

import { isAdmin } from "@/modules/admin-auth/lib/require-admin";
import { logger } from "@/shared/lib/logger";
import { isPrerenderInterrupt } from "@/shared/lib/prerender-interrupt";
import { prisma } from "@/shared/lib/prisma";
import { getProductsSchema } from "../schemas/product.schemas";

import {
	GET_PRODUCTS_ADMIN_FALLBACK_SORT_BY,
	GET_PRODUCTS_DEFAULT_PER_PAGE,
	GET_PRODUCTS_DEFAULT_SORT_BY,
	GET_PRODUCTS_MAX_RESULTS_PER_PAGE,
	GET_PRODUCTS_SELECT,
} from "../constants/product.constants";
import type { GetProductsParams, GetProductsReturn, Product } from "../types/product.types";
import { resolveTaxonomyFilterSlugs } from "./resolve-filter-slugs";
import {
	buildProductWhereClause,
	buildSearchConditions,
	type SearchResult,
} from "../services/product-query-builder";
import { getSpellSuggestion, SUGGESTION_THRESHOLD_RESULTS } from "./spell-suggestion";
import { sortProducts, orderByIds } from "../services/product-list-sorting.service";
import { cacheProducts } from "../utils/cache.utils";

// Re-exports for compatibility
export { GET_PRODUCTS_DEFAULT_PER_PAGE } from "../constants/product.constants";
export { productFiltersSchema } from "../schemas/product.schemas";
export type { GetProductsReturn, Product, ProductFilters, SortField } from "../types/product.types";

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
	// `isAdmin?: false` — littéral, pas `boolean` : ce paramètre ne peut que BAISSER
	// le privilège. Il existe pour l'appelant qui exécute déjà dans un scope
	// `"use cache"` (`getNavbarMenuData`), où `isAdmin()` est interdit puisqu'il lit
	// `headers()`. En `boolean`, il offrait aussi le chemin inverse : passer `true`
	// aurait contourné la garde re-vérifiée en DB et écrit des produits DRAFT dans
	// une entrée de cache PARTAGÉE sous `products-list`. Le type ferme la porte à la
	// compilation, sans coût runtime.
	options?: { isAdmin?: false },
): Promise<GetProductsReturn> {
	try {
		// Validate input parameters
		const validation = getProductsSchema.safeParse(params);

		if (!validation.success) {
			throw new Error("Invalid parameters: " + JSON.stringify(validation.error.issues));
		}

		let validatedParams = validation.data as GetProductsParams;
		const admin = options?.isAdmin ?? (await isAdmin());

		// Security: only admins can see non-active products.
		// status/filters.status are client-controlled (e.g. loadMoreProducts action):
		// force "active" here so no caller can leak drafts into the public cache.
		if (!admin) {
			validatedParams = {
				...validatedParams,
				status: "active",
				filters: { ...validatedParams.filters, status: "active" },
			};
		}

		// Admin: use admin default sort if no explicit sort provided
		if (admin && !hasSortByInput(validatedParams.sortBy)) {
			validatedParams = { ...validatedParams, sortBy: GET_PRODUCTS_ADMIN_FALLBACK_SORT_BY };
		}

		// Run fuzzy search BEFORE the cache
		// This allows caching results based on found IDs
		let searchResult: SearchResult | undefined;

		if (validatedParams.search) {
			// Rate limiting retiré (migration lean) : la recherche fuzzy passe
			// toujours, l'exact-only n'est plus qu'un repli d'erreur interne.
			searchResult = await buildSearchConditions(validatedParams.search, {
				activeOnly: validatedParams.status === "active",
			});
		}

		// Fetch products.
		// Le repli « page vide » vit ICI, HORS du scope `"use cache"` de
		// `fetchProducts`. À l'intérieur, il retournait normalement, donc Next mettait
		// un catalogue VIDE en cache pour toute la fenêtre du profil `catalog`
		// (5 min revalidate / 15 min stale / 6 h expire) — et rien, ni côté vitrine ni
		// côté admin, ne distinguait cette page vide d'un catalogue réellement vide.
		// Même motif que `variants/data/fetch-variants.ts`.
		let result: GetProductsReturn;
		try {
			result = await fetchProducts(validatedParams, searchResult);
		} catch (fetchError) {
			// Lecture avortée à la clôture d'un prerender (build) : signal de contrôle
			// Next, le rendu est jeté — repli silencieux, pas un incident à logger.
			if (!isPrerenderInterrupt(fetchError)) {
				logger.warn("Failed to fetch products", { service: "getProducts" });
			}
			return {
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
						? fetchError instanceof Error
							? fetchError.message
							: "Unknown error"
						: "Failed to fetch products",
			} as GetProductsReturn & { error: string };
		}

		// Suggest a correction if few or no results with an active search
		// Skip suggestions for admins (they often search by VARIANT/ID)
		if (validatedParams.search && !admin && result.totalCount <= SUGGESTION_THRESHOLD_RESULTS) {
			const suggestion = await getSpellSuggestion(validatedParams.search, {
				activeOnly: validatedParams.status === "active",
			});
			if (suggestion) {
				return { ...result, suggestion: suggestion.term };
			}
		}

		return result;
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
	searchResult?: SearchResult,
): Promise<GetProductsReturn> {
	"use cache";
	cacheProducts();

	// ⚠️ AUCUN try/catch dans ce scope : le repli appartient à `getProducts`
	// ci-dessus, hors du cache (sinon une page vide de panne est mise en cache).
	{
		// Les filtres couleur/matériau arrivent en NOMS SLUGIFIÉS (identité URL) —
		// résolution vers les noms en base avant le query builder (cf.
		// resolve-filter-slugs.ts, bug « 0 pièce » sur les couleurs multi-mots).
		const filters = (await resolveTaxonomyFilterSlugs(params.filters)) ?? params.filters;
		const where = buildProductWhereClause({ ...params, filters }, searchResult);

		// NOTE: All products are loaded then sorted/paginated in JS because:
		// - Price sorting requires MIN() on VARIANTs (not possible in Prisma)
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
			GET_PRODUCTS_MAX_RESULTS_PER_PAGE,
		);

		// Find start index based on cursor
		let startIndex = 0;
		if (params.cursor) {
			const cursorIndex = sortedProducts.findIndex((p) => p.id === params.cursor);
			if (cursorIndex !== -1) {
				startIndex =
					params.direction === "backward" ? Math.max(0, cursorIndex - perPage) : cursorIndex + 1;
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
		const nextCursor = hasNextPage ? (pageProducts[pageProducts.length - 1]?.id ?? null) : null;
		const prevCursor = hasPreviousPage ? (pageProducts[0]?.id ?? null) : null;

		return {
			products: pageProducts,
			pagination: {
				nextCursor,
				prevCursor,
				hasNextPage,
				hasPreviousPage,
			},
			totalCount: sortedProducts.length,
		};
	}
}
