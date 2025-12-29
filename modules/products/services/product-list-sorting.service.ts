import { getSortDirection } from "@/shared/utils/sort-direction";
import type { Product } from "../types/product.types";

// ============================================================================
// PRODUCT LIST SORTING SERVICE
// Pure functions for sorting and ordering product lists
// ============================================================================

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
export function sortProducts(products: Product[], sortBy: string): Product[] {
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
export function orderByIds<T extends { id: string }>(
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
