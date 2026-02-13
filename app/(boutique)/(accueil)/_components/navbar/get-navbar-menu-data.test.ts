import { describe, expect, it } from "vitest";
import { extractCollectionImages } from "./get-navbar-menu-data";

// Minimal mock matching Collection["products"] shape from GET_COLLECTIONS_SELECT
function makeProduct(imageData?: { url: string; altText: string | null; blurDataUrl: string | null }) {
	return {
		isFeatured: false,
		product: imageData
			? {
					id: "prod-1",
					title: "Product",
					skus: [
						{
							priceInclTax: 29.99,
							images: [imageData],
						},
					],
				}
			: {
					id: "prod-1",
					title: "Product",
					skus: [],
				},
	};
}

describe("extractCollectionImages", () => {
	it("returns empty array for empty products", () => {
		const result = extractCollectionImages([]);
		expect(result).toEqual([]);
	});

	it("extracts image data from products with images", () => {
		const products = [
			makeProduct({ url: "https://img.com/1.jpg", altText: "Ring", blurDataUrl: "data:blur1" }),
			makeProduct({ url: "https://img.com/2.jpg", altText: "Bracelet", blurDataUrl: null }),
		];

		const result = extractCollectionImages(products as never);
		expect(result).toEqual([
			{ url: "https://img.com/1.jpg", alt: "Ring", blurDataUrl: "data:blur1" },
			{ url: "https://img.com/2.jpg", alt: "Bracelet", blurDataUrl: null },
		]);
	});

	it("filters out products without images (empty skus)", () => {
		const products = [
			makeProduct({ url: "https://img.com/1.jpg", altText: "Ring", blurDataUrl: null }),
			makeProduct(), // no image
			makeProduct({ url: "https://img.com/3.jpg", altText: null, blurDataUrl: null }),
		];

		const result = extractCollectionImages(products as never);
		expect(result).toHaveLength(2);
		expect(result[0]?.url).toBe("https://img.com/1.jpg");
		expect(result[1]?.url).toBe("https://img.com/3.jpg");
	});

	it("limits to 4 images maximum", () => {
		const products = Array.from({ length: 6 }, (_, i) =>
			makeProduct({ url: `https://img.com/${i}.jpg`, altText: `Image ${i}`, blurDataUrl: null })
		);

		const result = extractCollectionImages(products as never);
		expect(result).toHaveLength(4);
		expect(result[3]?.url).toBe("https://img.com/3.jpg");
	});

	it("handles products with null product reference", () => {
		const products = [
			{ isFeatured: false, product: null },
			makeProduct({ url: "https://img.com/1.jpg", altText: "Ring", blurDataUrl: null }),
		];

		const result = extractCollectionImages(products as never);
		expect(result).toHaveLength(1);
		expect(result[0]?.url).toBe("https://img.com/1.jpg");
	});

	it("preserves null alt text and blur data", () => {
		const products = [
			makeProduct({ url: "https://img.com/1.jpg", altText: null, blurDataUrl: null }),
		];

		const result = extractCollectionImages(products as never);
		expect(result[0]).toEqual({
			url: "https://img.com/1.jpg",
			alt: null,
			blurDataUrl: null,
		});
	});
});
