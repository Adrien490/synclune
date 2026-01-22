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
