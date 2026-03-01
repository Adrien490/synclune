import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetValidImageUrl } = vi.hoisted(() => ({
	mockGetValidImageUrl: vi.fn(),
}));

vi.mock("@/shared/lib/media-validation", () => ({
	getValidImageUrl: mockGetValidImageUrl,
}));

vi.mock("@/shared/constants/currency", () => ({
	DEFAULT_CURRENCY: "eur",
}));

import { buildStripeLineItems } from "../checkout-line-items.service";

function makeCartItem(overrides = {}) {
	return {
		skuId: "sku_1",
		quantity: 1,
		priceAtAdd: 2990,
		...overrides,
	};
}

function makeSkuResult(overrides: Record<string, unknown> = {}) {
	const sku = {
		id: "sku_1",
		priceInclTax: 2990,
		size: null,
		material: null,
		images: [{ url: "https://cdn.example.com/bracelet.jpg" }],
		product: {
			id: "prod_1",
			title: "Bracelet Lune",
		},
		...((overrides.sku as Record<string, unknown>) ?? {}),
	};

	return {
		success: true,
		data: { sku },
		...overrides,
		...(overrides.sku ? { data: { sku } } : {}),
	};
}

describe("buildStripeLineItems", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetValidImageUrl.mockImplementation((url: string | null | undefined) => url ?? undefined);
	});

	it("should create a line item with correct price and quantity", () => {
		const result = buildStripeLineItems([makeCartItem({ quantity: 2 })], [makeSkuResult()]);

		expect(result.lineItems).toHaveLength(1);
		expect(result.lineItems[0]!.price_data?.unit_amount).toBe(2990);
		expect(result.lineItems[0]!.quantity).toBe(2);
		expect(result.lineItems[0]!.price_data?.currency).toBe("eur");
	});

	it("should compute subtotal correctly for multiple items", () => {
		const result = buildStripeLineItems(
			[
				makeCartItem({ skuId: "sku_1", quantity: 2 }),
				makeCartItem({ skuId: "sku_2", quantity: 1 }),
			],
			[
				makeSkuResult({
					data: {
						sku: {
							id: "sku_1",
							priceInclTax: 2990,
							size: null,
							material: null,
							images: [],
							product: { id: "prod_1", title: "Bracelet" },
						},
					},
				}),
				makeSkuResult({
					data: {
						sku: {
							id: "sku_2",
							priceInclTax: 4990,
							size: null,
							material: null,
							images: [],
							product: { id: "prod_2", title: "Collier" },
						},
					},
				}),
			],
		);

		expect(result.subtotal).toBe(2990 * 2 + 4990 * 1);
		expect(result.lineItems).toHaveLength(2);
	});

	it("should include size and material in product name", () => {
		const result = buildStripeLineItems(
			[makeCartItem()],
			[
				makeSkuResult({
					data: {
						sku: {
							id: "sku_1",
							priceInclTax: 2990,
							size: "M",
							material: "Argent 925",
							images: [],
							product: { id: "prod_1", title: "Bracelet Lune" },
						},
					},
				}),
			],
		);

		expect(result.lineItems[0]!.price_data?.product_data?.name).toBe(
			"Bracelet Lune - Taille: M - Argent 925",
		);
	});

	it("should include image URL when valid", () => {
		mockGetValidImageUrl.mockReturnValue("https://cdn.example.com/img.jpg");

		const result = buildStripeLineItems([makeCartItem()], [makeSkuResult()]);

		expect(result.lineItems[0]!.price_data?.product_data?.images).toEqual([
			"https://cdn.example.com/img.jpg",
		]);
	});

	it("should omit images when URL is invalid", () => {
		mockGetValidImageUrl.mockReturnValue(undefined);

		const result = buildStripeLineItems(
			[makeCartItem()],
			[
				makeSkuResult({
					data: {
						sku: {
							id: "sku_1",
							priceInclTax: 2990,
							size: null,
							material: null,
							images: [{ url: "invalid" }],
							product: { id: "prod_1", title: "Bracelet" },
						},
					},
				}),
			],
		);

		expect(result.lineItems[0]!.price_data?.product_data?.images).toBeUndefined();
	});

	it("should include metadata with skuId and productId", () => {
		const result = buildStripeLineItems([makeCartItem()], [makeSkuResult()]);

		expect(result.lineItems[0]!.price_data?.product_data?.metadata).toEqual({
			skuId: "sku_1",
			productId: "prod_1",
		});
	});

	it("should skip items with failed SKU lookups", () => {
		const result = buildStripeLineItems(
			[makeCartItem({ skuId: "sku_1" }), makeCartItem({ skuId: "sku_missing" })],
			[makeSkuResult(), { success: false }],
		);

		expect(result.lineItems).toHaveLength(1);
		expect(result.lineItems[0]!.price_data?.product_data?.metadata?.skuId).toBe("sku_1");
	});

	it("should return empty line items for empty cart", () => {
		const result = buildStripeLineItems([], []);

		expect(result.lineItems).toHaveLength(0);
		expect(result.subtotal).toBe(0);
	});

	it("should handle SKU with no images", () => {
		mockGetValidImageUrl.mockReturnValue(undefined);

		const result = buildStripeLineItems(
			[makeCartItem()],
			[
				makeSkuResult({
					data: {
						sku: {
							id: "sku_1",
							priceInclTax: 2990,
							size: null,
							material: null,
							images: null,
							product: { id: "prod_1", title: "Bracelet" },
						},
					},
				}),
			],
		);

		expect(result.lineItems).toHaveLength(1);
		expect(result.lineItems[0]!.price_data?.product_data?.images).toBeUndefined();
	});

	it("should only include size when material is absent", () => {
		const result = buildStripeLineItems(
			[makeCartItem()],
			[
				makeSkuResult({
					data: {
						sku: {
							id: "sku_1",
							priceInclTax: 2990,
							size: "L",
							material: null,
							images: [],
							product: { id: "prod_1", title: "Bracelet" },
						},
					},
				}),
			],
		);

		expect(result.lineItems[0]!.price_data?.product_data?.name).toBe("Bracelet - Taille: L");
	});
});
