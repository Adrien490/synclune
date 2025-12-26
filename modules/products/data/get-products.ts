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

	return fetchProducts(params, searchResult);
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

		if (sortBy.startsWith("created-") || sortBy.startsWith("best-selling")) {
			const dateA = new Date(a.createdAt).getTime();
			const dateB = new Date(b.createdAt).getTime();
			return multiplier * (dateA - dateB);
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
 */
async function fetchProducts(
	params: GetProductsParams,
	searchResult?: SearchResult
): Promise<GetProductsReturn> {
	"use cache";
	cacheProducts();

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
		// - Sinon → tri selon le critère demandé
		const fuzzyIds = searchResult?.fuzzyIds;
		const hasFuzzyResults = fuzzyIds && fuzzyIds.length > 0;

		let sortedProducts: Product[];
		if (hasFuzzyResults && params.sortBy === GET_PRODUCTS_DEFAULT_SORT_BY) {
			// Tri par pertinence (préserve l'ordre de la recherche fuzzy)
			sortedProducts = orderByIds(allProducts as Product[], fuzzyIds);
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
			products: pageProducts,
			pagination: {
				nextCursor,
				prevCursor,
				hasNextPage,
				hasPreviousPage,
			},
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
