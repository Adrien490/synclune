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

		// Admin sort fields (without -ascending/-descending suffix)
		if (sortBy === "updatedAt") {
			return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
		}
		if (sortBy === "title") {
			return a.title.localeCompare(b.title, "fr");
		}
		if (sortBy === "type") {
			const typeA = a.type?.label ?? "";
			const typeB = b.type?.label ?? "";
			return typeA.localeCompare(typeB, "fr");
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
 *
 * @param items - Liste des items à trier
 * @param orderedIds - Liste des IDs dans l'ordre souhaité
 * @param fallbackSort - Fonction de tri pour les items non présents dans orderedIds
 */
export function orderByIds<T extends { id: string }>(
	items: T[],
	orderedIds: string[],
	fallbackSort?: (a: T, b: T) => number
): T[] {
	const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
	return [...items].sort((a, b) => {
		const orderA = orderMap.get(a.id) ?? Infinity;
		const orderB = orderMap.get(b.id) ?? Infinity;

		// Si au moins un est dans la liste ordonnée, utiliser l'ordre
		if (orderA !== Infinity || orderB !== Infinity) {
			return orderA - orderB;
		}

		// Si les deux sont hors liste, utiliser le tri fallback
		if (fallbackSort) {
			return fallbackSort(a, b);
		}
		return 0;
	});
}

/**
 * Tri par date de création décroissante (plus récent en premier)
 * Utilisé comme fallback pour les produits sans données de tri
 */
export function sortByCreatedAtDesc<T extends { createdAt: Date | string }>(
	a: T,
	b: T
): number {
	return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}
