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

// Re-export pour compatibilité
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
 * Action serveur pour récupérer les produits avec gestion des droits
 * Intègre la recherche fuzzy avec pg_trgm pour la tolérance aux fautes
 */
export async function getProducts(
	params: GetProductsParams,
	options?: { isAdmin?: boolean }
): Promise<GetProductsReturn> {
	try {
		// Validation des paramètres d'entrée
		const validation = getProductsSchema.safeParse(params);

		if (!validation.success) {
			throw new Error(
				"Invalid parameters: " + JSON.stringify(validation.error.issues)
			);
		}

		let validatedParams = validation.data as GetProductsParams;
		const admin = options?.isAdmin ?? (await isAdmin());

		// Admin: utiliser le tri par défaut admin si aucun tri explicite fourni
		if (admin && !hasSortByInput(validatedParams?.sortBy)) {
			validatedParams = { ...validatedParams, sortBy: GET_PRODUCTS_ADMIN_FALLBACK_SORT_BY };
		}

		// Executer la recherche fuzzy AVANT le cache
		// Cela permet de cacher les resultats bases sur les IDs trouves
		let searchResult: SearchResult | undefined;
		let rateLimited = false;

		if (validatedParams.search) {
			// Rate limiting: protege contre le scraping et les abus
			let useExactOnly = false;
			try {
				const rateLimitId = await getRateLimitId();
				const isAuthenticated = rateLimitId.startsWith("user:");
				const limits = isAuthenticated
					? SEARCH_RATE_LIMITS.authenticated
					: SEARCH_RATE_LIMITS.guest;

				const rateLimitResult = await checkRateLimit(`search:${rateLimitId}`, limits);
				if (!rateLimitResult.success) {
					// Fallback: utilise recherche exacte seulement
					console.warn("[search] Rate limit exceeded:", {
						identifier: rateLimitId,
						retryAfter: rateLimitResult.retryAfter,
					});
					useExactOnly = true;
					rateLimited = true;
				}
			} catch {
				// En cas d'erreur rate limit, continuer sans bloquer
			}

			searchResult = useExactOnly
				? buildExactSearchConditions(validatedParams.search)
				: await buildSearchConditions(validatedParams.search, { status: validatedParams.status });
		}

		// Récupérer les produits
		const result = await fetchProducts(validatedParams, searchResult);

		// Proposer une suggestion si peu ou pas de résultats avec une recherche active
		// Ne pas suggérer pour les admins (ils recherchent souvent des SKU/ID)
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
 * Récupère la liste des produits avec pagination, tri et filtrage
 * Approche simplifiée : tri en JS pour supporter le tri par prix sans champ dénormalisé
 *
 * @param params - Paramètres de recherche
 * @param searchResult - Résultat de la recherche fuzzy (optionnel)
 */
async function fetchProducts(
	params: GetProductsParams,
	searchResult?: SearchResult
): Promise<GetProductsReturn> {
	"use cache";
	cacheProducts();

	try {
		const where = buildProductWhereClause(params, searchResult);

		// NOTE: Tous les produits sont chargés puis triés/paginés en JS car:
		// - Le tri par prix nécessite MIN() sur les SKUs (impossible en Prisma)
		// - Le tri fuzzy préserve l'ordre de pertinence des IDs pré-calculés
		// - Les bestsellers/popular utilisent des IDs pré-calculés
		// Pour un catalogue >10,000 produits, envisager la dénormalisation de minPrice.
		const allProducts = await prisma.product.findMany({
			where,
			select: GET_PRODUCTS_SELECT,
		});

		// Trier les produits :
		// - Si recherche fuzzy active avec résultats → tri par pertinence (défaut)
		// - Sinon → tri selon le critère demandé
		const fuzzyIds = searchResult?.fuzzyIds;
		const hasFuzzyResults = fuzzyIds && fuzzyIds.length > 0;

		let sortedProducts: Product[];
		if (hasFuzzyResults && params.sortBy === GET_PRODUCTS_DEFAULT_SORT_BY) {
			// Tri par pertinence (préserve l'ordre de la recherche fuzzy)
			sortedProducts = orderByIds(allProducts, fuzzyIds);
		} else {
			// Tri selon le critère demandé par l'utilisateur
			sortedProducts = sortProducts(allProducts, params.sortBy);
		}

		// Pagination manuelle
		const perPage = Math.min(
			Math.max(1, params.perPage || GET_PRODUCTS_DEFAULT_PER_PAGE),
			GET_PRODUCTS_MAX_RESULTS_PER_PAGE
		);

		// Trouver l'index de départ basé sur le curseur
		let startIndex = 0;
		if (params.cursor) {
			const cursorIndex = sortedProducts.findIndex((p) => p.id === params.cursor);
			if (cursorIndex !== -1) {
				startIndex = params.direction === "backward"
					? Math.max(0, cursorIndex - perPage)
					: cursorIndex + 1;
			}
		}

		// Extraire la page de résultats
		const pageProducts = sortedProducts.slice(startIndex, startIndex + perPage);

		// Calculer la pagination
		// Convention alignée sur processCursorResults (Relay spec) :
		// - nextCursor = dernier élément de la page (pour aller forward)
		// - prevCursor = premier élément de la page (pour aller backward)
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
		if (process.env.NODE_ENV === "development") {
			console.error("[fetchProducts] Error:", error);
		}
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
