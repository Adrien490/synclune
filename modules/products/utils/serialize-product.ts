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
 * Serialise un produit pour les Client Components (Decimal → number)
 *
 * Prisma type averageRating comme Decimal, mais les Client Components
 * ont besoin d'un number serialisable.
 *
 * Générique sur la forme du produit (Product ou ProductCarouselItem) pour
 * rester utilisable depuis toutes les data functions.
 */
export function serializeProduct<T extends ProductWithReviewStats>(product: T): T {
	if (!product.reviewStats) return product;

	return {
		...product,
		reviewStats: {
			...product.reviewStats,
			averageRating: decimalToNumber(product.reviewStats.averageRating) as unknown as Decimal,
		},
	};
}

/**
 * Serialise un tableau de produits pour les Client Components
 */
export function serializeProducts<T extends ProductWithReviewStats>(products: T[]): T[] {
	return products.map(serializeProduct);
}
