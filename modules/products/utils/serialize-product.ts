import type { Product } from "../types/product.types";

/**
 * Serialise un produit pour les Client Components (Decimal → number)
 *
 * Le cast est necessaire car Prisma type averageRating comme Decimal,
 * mais apres conversion c'est un number serialisable.
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
			averageRating: (
				typeof product.reviewStats.averageRating === "number"
					? product.reviewStats.averageRating
					: product.reviewStats.averageRating.toNumber()
			) as unknown as typeof product.reviewStats.averageRating,
		},
	};
}

/**
 * Serialise un tableau de produits pour les Client Components
 */
export function serializeProducts(products: Product[]): Product[] {
	return products.map(serializeProduct);
}
