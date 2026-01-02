import { cacheTag } from "next/cache";

import { isAdmin } from "@/modules/auth/utils/guards";
import { getRateLimitId } from "@/modules/auth/lib/rate-limit-helpers";
import { prisma } from "@/shared/lib/prisma";
import { checkRateLimit } from "@/shared/lib/rate-limit";

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
import { getBestsellerIds } from "./bestseller-query";
import { getPopularProductIds } from "./popularity-query";
import {
	getSpellSuggestion,
	SUGGESTION_THRESHOLD_RESULTS,
} from "./spell-suggestion";
import { sortProducts, orderByIds } from "../services/product-list-sorting.service";
import { cacheProducts, PRODUCTS_CACHE_TAGS } from "../constants/cache";
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
	const admin = options?.isAdmin ?? (await isAdmin());

	// Admin: utiliser le tri par défaut admin si aucun tri explicite fourni
	if (admin && !hasSortByInput(params?.sortBy)) {
		params = { ...params, sortBy: GET_PRODUCTS_ADMIN_FALLBACK_SORT_BY };
	}

	// Executer la recherche fuzzy AVANT le cache
	// Cela permet de cacher les resultats bases sur les IDs trouves
	let searchResult: SearchResult | undefined;
	if (params.search) {
		// Rate limiting: protege contre le scraping et les abus
		let useExactOnly = false;
		try {
			const rateLimitId = await getRateLimitId();
			const isAuthenticated = rateLimitId.startsWith("user:");
			const limits = isAuthenticated
				? SEARCH_RATE_LIMITS.authenticated
				: SEARCH_RATE_LIMITS.guest;

			const rateLimitResult = checkRateLimit(`search:${rateLimitId}`, limits);
			if (!rateLimitResult.success) {
				// Fallback silencieux: utilise recherche exacte seulement
				console.warn("[search] Rate limit exceeded:", {
					identifier: rateLimitId,
					retryAfter: rateLimitResult.retryAfter,
				});
				useExactOnly = true;
			}
		} catch {
			// En cas d'erreur rate limit, continuer sans bloquer
		}

		searchResult = useExactOnly
			? buildExactSearchConditions(params.search)
			: await buildSearchConditions(params.search, { status: params.status });
	}

	// Récupérer les IDs des bestsellers si tri par meilleures ventes demandé
	// Exécuté AVANT le cache pour inclure les IDs dans la clé de cache
	// Limite optimisée selon perPage pour éviter de récupérer trop de données
	let bestsellerIds: string[] | undefined;
	if (params.sortBy === "best-selling") {
		const bestsellerLimit = Math.min(
			Math.max(params.perPage || GET_PRODUCTS_DEFAULT_PER_PAGE, 50),
			GET_PRODUCTS_MAX_RESULTS_PER_PAGE
		);
		bestsellerIds = await getBestsellerIds(bestsellerLimit);
	}

	// Récupérer les IDs des produits populaires si tri par popularité demandé
	let popularIds: string[] | undefined;
	if (params.sortBy === "popular") {
		const popularLimit = Math.min(
			Math.max(params.perPage || GET_PRODUCTS_DEFAULT_PER_PAGE, 50),
			GET_PRODUCTS_MAX_RESULTS_PER_PAGE
		);
		popularIds = await getPopularProductIds(popularLimit);
	}

	// Récupérer les produits
	const result = await fetchProducts(params, searchResult, bestsellerIds, popularIds);

	// Proposer une suggestion si peu ou pas de résultats avec une recherche active
	// Ne pas suggérer pour les admins (ils recherchent souvent des SKU/ID)
	if (
		params.search &&
		!admin &&
		result.totalCount <= SUGGESTION_THRESHOLD_RESULTS
	) {
		const suggestion = await getSpellSuggestion(params.search, {
			status: params.status,
		});
		if (suggestion) {
			return { ...result, suggestion: suggestion.term };
		}
	}

	return result;
}

/**
 * Récupère la liste des produits avec pagination, tri et filtrage
 * Approche simplifiée : tri en JS pour supporter le tri par prix sans champ dénormalisé
 *
 * @param params - Paramètres de recherche
 * @param searchResult - Résultat de la recherche fuzzy (optionnel)
 * @param bestsellerIds - IDs des produits triés par ventes (optionnel)
 * @param popularIds - IDs des produits triés par popularité (optionnel)
 */
async function fetchProducts(
	params: GetProductsParams,
	searchResult?: SearchResult,
	bestsellerIds?: string[],
	popularIds?: string[]
): Promise<GetProductsReturn> {
	"use cache";
	cacheProducts();

	// Tag spécifique pour les bestsellers (invalidé après paiement)
	if (bestsellerIds !== undefined) {
		cacheTag(PRODUCTS_CACHE_TAGS.BESTSELLERS);
	}

	// Tag spécifique pour la popularité (invalidé après paiement ou nouvel avis)
	if (popularIds !== undefined) {
		cacheTag(PRODUCTS_CACHE_TAGS.POPULAR);
	}

	try {
		const where = buildProductWhereClause(params, searchResult);

		// Récupérer tous les produits correspondant aux filtres
		// Le tri et la pagination sont faits en JS pour supporter le tri par prix
		const allProducts = await prisma.product.findMany({
			where,
			select: GET_PRODUCTS_SELECT,
		});

		// Trier les produits :
		// - Si recherche fuzzy active avec résultats → tri par pertinence (défaut)
		// - Si tri best-selling avec résultats → tri par ventes
		// - Si tri popular avec résultats → tri par popularité
		// - Sinon → tri selon le critère demandé
		const fuzzyIds = searchResult?.fuzzyIds;
		const hasFuzzyResults = fuzzyIds && fuzzyIds.length > 0;
		const hasBestsellerResults = bestsellerIds && bestsellerIds.length > 0;
		const hasPopularResults = popularIds && popularIds.length > 0;

		let sortedProducts: Product[];
		if (hasFuzzyResults && params.sortBy === GET_PRODUCTS_DEFAULT_SORT_BY) {
			// Tri par pertinence (préserve l'ordre de la recherche fuzzy)
			sortedProducts = orderByIds(allProducts as Product[], fuzzyIds);
		} else if (params.sortBy === "best-selling" && hasBestsellerResults) {
			// Tri par meilleures ventes (préserve l'ordre des ventes)
			sortedProducts = orderByIds(allProducts as Product[], bestsellerIds);
		} else if (params.sortBy === "popular" && hasPopularResults) {
			// Tri par popularité (ventes + avis combinés)
			sortedProducts = orderByIds(allProducts as Product[], popularIds);
		} else {
			// Tri selon le critère demandé par l'utilisateur
			sortedProducts = sortProducts(allProducts as Product[], params.sortBy);
		}

		// Filtrer les produits en promotion si demandé
		// Un produit est en promo si au moins un SKU actif a compareAtPrice > priceInclTax
		if (params.filters?.onSale === true) {
			sortedProducts = sortedProducts.filter((product) =>
				product.skus.some(
					(sku) =>
						sku.isActive &&
						sku.compareAtPrice !== null &&
						sku.compareAtPrice > sku.priceInclTax
				)
			);
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
		const hasNextPage = startIndex + perPage < sortedProducts.length;
		const hasPreviousPage = startIndex > 0;
		const nextCursor = hasNextPage ? pageProducts[pageProducts.length - 1]?.id ?? null : null;
		const prevCursor = hasPreviousPage ? sortedProducts[startIndex - 1]?.id ?? null : null;

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
