import { cacheTag } from "next/cache";

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
import type { GetProductsParams, GetProductsReturn, Product } from "../types/product.types";
import {
	buildProductWhereClause,
	buildSearchConditions,
	type SearchResult,
} from "../services/product-query-builder";
import { getBestsellerIds } from "../services/bestseller-query";
import { cacheProducts, PRODUCTS_CACHE_TAGS } from "../constants/cache";
import { serializeProduct } from "../utils/serialize-product";

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

	// Exécuter la recherche fuzzy AVANT le cache
	// Cela permet de cacher les résultats basés sur les IDs trouvés
	let searchResult: SearchResult | undefined;
	if (params.search) {
		searchResult = await buildSearchConditions(params.search, {
			status: params.status,
		});
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

	return fetchProducts(params, searchResult, bestsellerIds);
}

/**
 * Calcule le prix minimum d'un produit à partir de ses SKUs actifs
 */
function getMinPrice(product: Product): number {
	const activePrices = product.skus
		.filter((sku) => sku.isActive)
		.map((sku) => sku.priceInclTax);

	return activePrices.length > 0 ? Math.min(...activePrices) : Infinity;
}

/**
 * Récupère la note moyenne d'un produit
 */
function getAverageRating(product: Product): number {
	if (!product.reviewStats) return 0;
	const rating = product.reviewStats.averageRating;
	return typeof rating === "number" ? rating : Number(rating);
}


/**
 * Trie les produits selon le critère demandé
 */
function sortProducts(products: Product[], sortBy: string): Product[] {
	const direction = getSortDirection(sortBy);
	const multiplier = direction === "asc" ? 1 : -1;

	return [...products].sort((a, b) => {
		if (sortBy.startsWith("title-")) {
			return multiplier * a.title.localeCompare(b.title, "fr");
		}

		if (sortBy.startsWith("price-")) {
			const priceA = getMinPrice(a);
			const priceB = getMinPrice(b);
			return multiplier * (priceA - priceB);
		}

		if (sortBy.startsWith("created-")) {
			const dateA = new Date(a.createdAt).getTime();
			const dateB = new Date(b.createdAt).getTime();
			return multiplier * (dateA - dateB);
		}

		if (sortBy.startsWith("rating-")) {
			const ratingA = getAverageRating(a);
			const ratingB = getAverageRating(b);
			// Tri secondaire par nombre d'avis pour départager les égalités
			if (ratingA === ratingB) {
				const countA = a.reviewStats?.totalCount ?? 0;
				const countB = b.reviewStats?.totalCount ?? 0;
				return multiplier * (countA - countB);
			}
			return multiplier * (ratingA - ratingB);
		}

		// Par défaut : plus récents en premier
		return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
	});
}

/**
 * Préserve l'ordre des produits selon une liste d'IDs ordonnés
 * Utilisé pour maintenir l'ordre de pertinence de la recherche fuzzy
 */
function orderByIds<T extends { id: string }>(
	items: T[],
	orderedIds: string[]
): T[] {
	const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
	return [...items].sort((a, b) => {
		const orderA = orderMap.get(a.id) ?? Infinity;
		const orderB = orderMap.get(b.id) ?? Infinity;
		return orderA - orderB;
	});
}

/**
 * Récupère la liste des produits avec pagination, tri et filtrage
 * Approche simplifiée : tri en JS pour supporter le tri par prix sans champ dénormalisé
 *
 * @param params - Paramètres de recherche
 * @param searchResult - Résultat de la recherche fuzzy (optionnel)
 * @param bestsellerIds - IDs des produits triés par ventes (optionnel)
 */
async function fetchProducts(
	params: GetProductsParams,
	searchResult?: SearchResult,
	bestsellerIds?: string[]
): Promise<GetProductsReturn> {
	"use cache";
	cacheProducts();

	// Tag spécifique pour les bestsellers (invalidé après paiement)
	if (bestsellerIds !== undefined) {
		cacheTag(PRODUCTS_CACHE_TAGS.BESTSELLERS);
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
		// - Sinon → tri selon le critère demandé
		const fuzzyIds = searchResult?.fuzzyIds;
		const hasFuzzyResults = fuzzyIds && fuzzyIds.length > 0;
		const hasBestsellerResults = bestsellerIds && bestsellerIds.length > 0;

		let sortedProducts: Product[];
		if (hasFuzzyResults && params.sortBy === GET_PRODUCTS_DEFAULT_SORT_BY) {
			// Tri par pertinence (préserve l'ordre de la recherche fuzzy)
			sortedProducts = orderByIds(allProducts as Product[], fuzzyIds);
		} else if (params.sortBy === "best-selling" && hasBestsellerResults) {
			// Tri par meilleures ventes (préserve l'ordre des ventes)
			sortedProducts = orderByIds(allProducts as Product[], bestsellerIds);
		} else {
			// Tri selon le critère demandé par l'utilisateur
			sortedProducts = sortProducts(allProducts as Product[], params.sortBy);
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
