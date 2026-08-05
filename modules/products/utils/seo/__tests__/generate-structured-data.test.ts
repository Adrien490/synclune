import { describe, it, expect, vi } from "vitest";

vi.mock("@/shared/constants/seo-config", () => ({
	SITE_URL: "https://synclune.fr",
}));

import { generateStructuredData } from "../generate-structured-data";

// ============================================================================
// HELPERS
// ============================================================================

// La date vient de `getPriceValidUntil()` (dérivée de l'horloge, donc injectée) —
// ici une valeur fixe suffit, on vérifie juste le passthrough dans les offres.
const PRICE_VALID_UNTIL = "2026-11-03";

function makeProduct(overrides: Record<string, unknown> = {}) {
	return {
		title: "Bracelet Lune",
		slug: "bracelet-lune",
		description: "Un bracelet artisanal",
		type: { label: "Bracelet", slug: "bracelets" },
		collections: [],
		skus: [
			{
				sku: "BRC-LUNE-OR-M",
				isActive: true,
				priceInclTax: 4999,
				inventory: 5,
				images: [
					{ url: "https://cdn.example.com/img1.jpg", isPrimary: true, altText: "Vue face" },
					{ url: "https://cdn.example.com/img2.jpg", isPrimary: false, altText: null },
				],
				colors: [{ colorId: "color-1", position: 0, color: { name: "Or" } }],
				materials: [{ materialId: "mat-1", position: 0, material: { name: "Argent 925" } }],
				size: "M",
			},
		],
		...overrides,
	} as never;
}

function makeSku(overrides: Record<string, unknown> = {}) {
	return {
		sku: "BRC-LUNE-OR-M",
		isActive: true,
		priceInclTax: 4999,
		inventory: 5,
		images: [{ url: "https://cdn.example.com/img1.jpg", isPrimary: true, altText: "Vue face" }],
		colors: [{ colorId: "color-1", position: 0, color: { name: "Or" } }],
		materials: [{ materialId: "mat-1", position: 0, material: { name: "Argent 925" } }],
		size: "M",
		...overrides,
	} as never;
}

function graph(result: ReturnType<typeof generateStructuredData>): any[] {
	return result["@graph"];
}

// ============================================================================
// TESTS
// ============================================================================

describe("generateStructuredData", () => {
	it("returns a valid @graph with Product and BreadcrumbList", () => {
		const result = generateStructuredData({
			priceValidUntil: PRICE_VALID_UNTIL,
			product: makeProduct(),
			selectedSku: makeSku(),
		});

		expect(result["@context"]).toBe("https://schema.org");
		expect(result["@graph"]).toHaveLength(2);
		expect(graph(result)[0]["@type"]).toBe("Product");
		expect(graph(result)[1]["@type"]).toBe("BreadcrumbList");
	});

	it("uses single Offer when all prices are equal", () => {
		const result = generateStructuredData({
			priceValidUntil: PRICE_VALID_UNTIL,
			product: makeProduct({
				skus: [
					{
						sku: "SKU-1",
						isActive: true,
						priceInclTax: 4999,
						inventory: 3,
						images: [],
						colors: [],
						materials: [],
					},
					{
						sku: "SKU-2",
						isActive: true,
						priceInclTax: 4999,
						inventory: 5,
						images: [],
						colors: [],
						materials: [],
					},
				],
			}),
			selectedSku: makeSku({ priceInclTax: 4999 }),
		});

		const productData = graph(result)[0];
		expect(productData.offers["@type"]).toBe("Offer");
		expect(productData.offers.price).toBe("49.99");
	});

	it("uses AggregateOffer for products with multiple prices", () => {
		const result = generateStructuredData({
			priceValidUntil: PRICE_VALID_UNTIL,
			product: makeProduct({
				skus: [
					{
						sku: "SKU-1",
						isActive: true,
						priceInclTax: 3999,
						inventory: 3,
						images: [],
						colors: [],
						materials: [],
					},
					{
						sku: "SKU-2",
						isActive: true,
						priceInclTax: 5999,
						inventory: 5,
						images: [],
						colors: [],
						materials: [],
					},
				],
			}),
			selectedSku: makeSku({ priceInclTax: 3999 }),
		});

		const productData = graph(result)[0];
		expect(productData.offers["@type"]).toBe("AggregateOffer");
		expect(productData.offers.lowPrice).toBe("39.99");
		expect(productData.offers.highPrice).toBe("59.99");
		expect(productData.offers.offerCount).toBe(2);
	});

	it("sets availability based on SKU inventory", () => {
		const inStock = generateStructuredData({
			priceValidUntil: PRICE_VALID_UNTIL,
			product: makeProduct(),
			selectedSku: makeSku({ inventory: 5 }),
		});
		expect(graph(inStock)[0].offers.availability).toBe("https://schema.org/InStock");

		const outOfStock = generateStructuredData({
			priceValidUntil: PRICE_VALID_UNTIL,
			product: makeProduct(),
			selectedSku: makeSku({ inventory: 0 }),
		});
		expect(graph(outOfStock)[0].offers.availability).toBe("https://schema.org/OutOfStock");
	});

	it("includes breadcrumb with product type when available", () => {
		const result = generateStructuredData({
			priceValidUntil: PRICE_VALID_UNTIL,
			product: makeProduct({ type: { label: "Bracelet", slug: "bracelets" } }),
			selectedSku: makeSku(),
		});

		const breadcrumb = graph(result)[1];
		expect(breadcrumb.itemListElement).toHaveLength(4);
		expect(breadcrumb.itemListElement[2].name).toBe("Bracelet");
	});

	it("includes breadcrumb without product type when not available", () => {
		const result = generateStructuredData({
			priceValidUntil: PRICE_VALID_UNTIL,
			product: makeProduct({ type: null }),
			selectedSku: makeSku(),
		});

		const breadcrumb = graph(result)[1];
		expect(breadcrumb.itemListElement).toHaveLength(3);
		expect(breadcrumb.itemListElement[2].name).toBe("Bracelet Lune");
	});

	it("includes merchant return policy and shipping details in offers", () => {
		const result = generateStructuredData({
			priceValidUntil: PRICE_VALID_UNTIL,
			product: makeProduct(),
			selectedSku: makeSku(),
		});

		const offers = graph(result)[0].offers;
		expect(offers.priceValidUntil).toBe(PRICE_VALID_UNTIL);
		expect(offers.hasMerchantReturnPolicy).toBeDefined();
		expect(offers.hasMerchantReturnPolicy.merchantReturnDays).toBe(14);
		expect(offers.shippingDetails).toBeDefined();
		expect(offers.shippingDetails.shippingRate.currency).toBe("EUR");
	});

	it("includes material and color from selected SKU", () => {
		const result = generateStructuredData({
			priceValidUntil: PRICE_VALID_UNTIL,
			product: makeProduct(),
			selectedSku: makeSku({
				materials: [{ materialId: "mat-1", position: 0, material: { name: "Argent 925" } }],
				colors: [{ colorId: "color-1", position: 0, color: { name: "Or" } }],
			}),
		});

		const productData = graph(result)[0];
		expect(productData.material).toBe("Argent 925");
		expect(productData.color).toBe("Or");
	});

	it("includes stock level in additionalProperty", () => {
		const unique = generateStructuredData({
			priceValidUntil: PRICE_VALID_UNTIL,
			product: makeProduct(),
			selectedSku: makeSku({ inventory: 1 }),
		});
		const stockProp = graph(unique)[0].additionalProperty.find(
			(p: Record<string, string>) => p.name === "Stock",
		);
		expect(stockProp.value).toBe("Pièce unique");

		const low = generateStructuredData({
			priceValidUntil: PRICE_VALID_UNTIL,
			product: makeProduct(),
			selectedSku: makeSku({ inventory: 3 }),
		});
		const lowStockProp = graph(low)[0].additionalProperty.find(
			(p: Record<string, string>) => p.name === "Stock",
		);
		expect(lowStockProp.value).toBe("Stock limité");

		const normal = generateStructuredData({
			priceValidUntil: PRICE_VALID_UNTIL,
			product: makeProduct(),
			selectedSku: makeSku({ inventory: 10 }),
		});
		const normalStockProp = graph(normal)[0].additionalProperty.find(
			(p: Record<string, string>) => p.name === "Stock",
		);
		expect(normalStockProp.value).toBe("En stock");
	});

	it("includes image objects with dimensions", () => {
		const result = generateStructuredData({
			priceValidUntil: PRICE_VALID_UNTIL,
			product: makeProduct(),
			selectedSku: makeSku(),
		});

		const images = graph(result)[0].image;
		expect(images.length).toBeGreaterThan(0);
		expect(images[0]["@type"]).toBe("ImageObject");
		expect(images[0].width).toBe(1200);
		expect(images[0].height).toBe(1200);
	});

	it("does NOT include MPN (would duplicate SKU — handmade products have no manufacturer part number)", () => {
		const result = generateStructuredData({
			priceValidUntil: PRICE_VALID_UNTIL,
			product: makeProduct(),
			selectedSku: makeSku({ sku: "BRC-CUSTOM-001" }),
		});

		expect(graph(result)[0].mpn).toBeUndefined();
		// SKU still present
		expect(graph(result)[0].sku).toBe("BRC-CUSTOM-001");
	});
});
