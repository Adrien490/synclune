import type { Decimal } from "@/app/generated/prisma/internal/prismaNamespace";
import type { Product } from "../types/product.types";

/**
 * Convert a Prisma Decimal (or already-converted number) to a plain number.
 * Handles both Decimal objects (.toNumber()) and primitive numbers.
 */
function decimalToNumber(value: Decimal | number): number {
	return typeof value === "number" ? value : value.toNumber();
}

/**
 * Serialise un produit pour les Client Components (Decimal → number)
 *
 * Prisma type averageRating comme Decimal, mais les Client Components
 * ont besoin d'un number serialisable.
 *
 * @param product - Produit avec potentiellement un Decimal
 * @returns Produit avec reviewStats.averageRating converti en number
 */
export function serializeProduct(product: Product): Product {
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
export function serializeProducts(products: Product[]): Product[] {
	return products.map(serializeProduct);
}
