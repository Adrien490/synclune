import { describe, it, expect } from "vitest";
import { extractCollectionImages } from "../collection-images.utils";

// ============================================================================
// Helpers
// ============================================================================

let __pid = 0;
function makeCollectionProduct(
	skuImages: { url: string; blurDataUrl?: string | null; altText?: string | null }[] = [],
	priceInclTax?: number,
	productId?: string,
) {
	return {
		product: {
			id: productId ?? `prod-${++__pid}`,
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
			{ product: { id: "p1", skus: [] } } as never,
			{ product: { id: "p2", skus: [{ images: [] }] } } as never,
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
			{ product: { id: "p-empty", skus: [] } } as never,
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

	it("deduplicates by productId, keeping diverse images even if URLs collide", () => {
		// Same image URL across two distinct products → BOTH appear (dedup is by productId now)
		const products = [
			makeCollectionProduct(
				[{ url: "https://utfs.io/f/shared.jpg", altText: "A" }],
				undefined,
				"prod-1",
			),
			makeCollectionProduct(
				[{ url: "https://utfs.io/f/shared.jpg", altText: "B" }],
				undefined,
				"prod-2",
			),
		];
		const result = extractCollectionImages(products);
		expect(result).toHaveLength(2);
	});

	it("deduplicates duplicate productId entries (defense-in-depth)", () => {
		const products = [
			makeCollectionProduct([{ url: "https://utfs.io/f/a.jpg", altText: "A" }], undefined, "p1"),
			makeCollectionProduct([{ url: "https://utfs.io/f/b.jpg", altText: "B" }], undefined, "p1"),
		];
		const result = extractCollectionImages(products);
		expect(result).toHaveLength(1);
		expect(result[0]!.url).toBe("https://utfs.io/f/a.jpg");
	});
});

// La suite `extractPriceRange` a été retirée avec la fonction (audit CollectionCard
// 2026-08-04) : elle vérifiait fidèlement un calcul dont la SOURCE était fausse — le
// min de 4 produits sur leur SKU par défaut, présenté comme le prix d'entrée de la
// collection. Le remplaçant est `modules/collections/data/get-collection-price-ranges.ts`,
// qui agrège en base ; il se teste en intégration, pas sur un payload de liste.
