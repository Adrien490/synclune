import type { Decimal } from "@/app/generated/prisma/internal/prismaNamespace";

/**
 * Convert a Prisma Decimal (or already-converted number) to a plain number.
 * Handles both Decimal objects (.toNumber()) and primitive numbers.
 */
function decimalToNumber(value: Decimal | number): number {
	return typeof value === "number" ? value : value.toNumber();
}

type ProductWithReviewStats = {
	reviewStats: {
		averageRating: Decimal | number;
		totalCount: number;
	} | null;
};

/**
 * Serialise un produit pour les Client Components (Decimal → number).
 *
 * Prisma type averageRating comme Decimal, mais les Client Components ont
 * besoin d'un number serialisable. Le runtime renvoie un `number` ; côté
 * types, on conserve la forme d'entrée `T` (alignée sur GET_PRODUCTS_SELECT
 * Prisma) — c'est un compromis intentionnel pour éviter d'avoir à propager
 * un type sérialisé sur toutes les data functions et leurs consumers.
 *
 * Si un consumer doit faire de l'arithmétique sur `averageRating`, il doit
 * traiter la valeur comme un `number` (ce qu'elle est réellement) — typage
 * Decimal est conservé uniquement pour la stabilité de la chaîne de types
 * Prisma → data → component.
 */
export function serializeProduct<T extends ProductWithReviewStats>(product: T): T {
	if (!product.reviewStats) return product;

	const serialized: T = {
		...product,
		reviewStats: {
			...product.reviewStats,
			averageRating: decimalToNumber(product.reviewStats.averageRating),
		},
	} as T;
	return serialized;
}

/**
 * Serialise un tableau de produits pour les Client Components
 */
export function serializeProducts<T extends ProductWithReviewStats>(products: T[]): T[] {
	return products.map(serializeProduct);
}
