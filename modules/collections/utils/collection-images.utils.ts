import type { Collection, CollectionImage } from "../types/collection.types";

export function extractCollectionImages(products: Collection["products"]): CollectionImage[] {
	return products
		.map((p) => p.product?.skus?.[0]?.images?.[0])
		.filter((img): img is NonNullable<typeof img> => Boolean(img))
		.map((img) => ({
			url: img.url,
			blurDataUrl: img.blurDataUrl,
			alt: img.altText,
		}));
}

/** Extract min/max price range from collection products (in cents) */
export function extractPriceRange(
	products: Collection["products"]
): { min: number; max: number } | undefined {
	const prices = products
		.map((p) => p.product?.skus?.[0]?.priceInclTax)
		.filter((price): price is number => typeof price === "number");

	if (prices.length === 0) return undefined;

	return {
		min: Math.min(...prices),
		max: Math.max(...prices),
	};
}
