import { describe, it, expect } from "vitest";
import { extractCollectionImages, extractPriceRange } from "../collection-images.utils";

// ============================================================================
// Helpers
// ============================================================================

function makeCollectionProduct(
	skuImages: { url: string; blurDataUrl?: string | null; altText?: string | null }[] = [],
	priceInclTax?: number,
) {
	return {
		product: {
			skus:
				skuImages.length > 0 || priceInclTax !== undefined
					? [
							{
								images: skuImages,
								priceInclTax: priceInclTax ?? 2500,
							},
						]
					: [],
		},
	} as never;
}

// ============================================================================
// extractCollectionImages
// ============================================================================

describe("extractCollectionImages", () => {
	it("returns empty array for empty products", () => {
		expect(extractCollectionImages([])).toEqual([]);
	});

	it("returns empty array when no products have SKU images", () => {
		const products = [
			{ product: { skus: [] } } as never,
			{ product: { skus: [{ images: [] }] } } as never,
		];
		expect(extractCollectionImages(products)).toEqual([]);
	});

	it("extracts first image of first SKU per product", () => {
		const products = [
			makeCollectionProduct([
				{ url: "https://utfs.io/f/a.jpg", blurDataUrl: "blur-a", altText: "Image A" },
				{ url: "https://utfs.io/f/b.jpg", blurDataUrl: null, altText: null },
			]),
		];
		const result = extractCollectionImages(products);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			url: "https://utfs.io/f/a.jpg",
			blurDataUrl: "blur-a",
			alt: "Image A",
		});
	});

	it("skips products without SKU images", () => {
		const products = [
			makeCollectionProduct([{ url: "https://utfs.io/f/a.jpg", altText: "A" }]),
			{ product: { skus: [] } } as never,
			makeCollectionProduct([{ url: "https://utfs.io/f/c.jpg", altText: "C" }]),
		];
		const result = extractCollectionImages(products);

		expect(result).toHaveLength(2);
	});

	it("maps altText to alt", () => {
		const products = [
			makeCollectionProduct([{ url: "https://utfs.io/f/a.jpg", altText: "My alt text" }]),
		];
		const result = extractCollectionImages(products);
		expect(result[0]!.alt).toBe("My alt text");
	});
});

// ============================================================================
// extractPriceRange
// ============================================================================

describe("extractPriceRange", () => {
	it("returns undefined for empty products", () => {
		expect(extractPriceRange([])).toBeUndefined();
	});

	it("returns undefined when no SKUs have prices", () => {
		const products = [{ product: { skus: [] } } as never];
		expect(extractPriceRange(products)).toBeUndefined();
	});

	it("returns same min/max for single product", () => {
		const products = [makeCollectionProduct([], 3500)];
		const result = extractPriceRange(products);

		expect(result).toEqual({ min: 3500, max: 3500 });
	});

	it("returns correct min/max across multiple products", () => {
		const products = [
			makeCollectionProduct([], 2500),
			makeCollectionProduct([], 5000),
			makeCollectionProduct([], 1500),
		];
		const result = extractPriceRange(products);

		expect(result).toEqual({ min: 1500, max: 5000 });
	});

	it("skips products without SKU prices", () => {
		const products = [
			makeCollectionProduct([], 3000),
			{ product: { skus: [] } } as never, // no SKU
			makeCollectionProduct([], 1000),
		];
		const result = extractPriceRange(products);

		expect(result).toEqual({ min: 1000, max: 3000 });
	});
});
