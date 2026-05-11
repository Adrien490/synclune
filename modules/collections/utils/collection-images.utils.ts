import type { Collection, CollectionImage } from "../types/collection.types";

export function extractCollectionImages(products: Collection["products"]): CollectionImage[] {
	if (!products.length) return [];

	// Dedup par productId (et non par image URL) pour preserver la diversite visuelle
	// quand plusieurs produits partagent le meme mockup. Affiche au plus une image
	// par produit dans la Bento Grid.
	const seenProducts = new Set<string>();

	return products
		.filter((p) => {
			if (seenProducts.has(p.product.id)) return false;
			if (!p.product.skus[0]?.images[0]) return false;
			seenProducts.add(p.product.id);
			return true;
		})
		.map((p) => {
			const img = p.product.skus[0]!.images[0]!;
			return {
				url: img.url,
				blurDataUrl: img.blurDataUrl,
				alt: img.altText,
			};
		});
}

/** Extract min/max price range from collection products (in cents) */
export function extractPriceRange(
	products: Collection["products"],
): { min: number; max: number } | undefined {
	if (!products.length) return undefined;
	const prices = products
		.map((p) => p.product.skus[0]?.priceInclTax)
		.filter((price): price is number => typeof price === "number");

	if (prices.length === 0) return undefined;

	return {
		min: Math.min(...prices),
		max: Math.max(...prices),
	};
}
