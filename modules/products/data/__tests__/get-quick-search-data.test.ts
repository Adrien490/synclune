import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockGetRecentSearches, mockGetCollections, mockGetProductTypes, mockGetRecentProducts } =
	vi.hoisted(() => ({
		mockGetRecentSearches: vi.fn(),
		mockGetCollections: vi.fn(),
		mockGetProductTypes: vi.fn(),
		mockGetRecentProducts: vi.fn(),
	}));

vi.mock("server-only", () => ({}));

vi.mock("../get-recent-searches", () => ({
	getRecentSearches: mockGetRecentSearches,
}));

vi.mock("@/modules/collections/data/get-collections", () => ({
	getCollections: mockGetCollections,
}));

vi.mock("@/modules/product-types/data/get-product-types", () => ({
	getProductTypes: mockGetProductTypes,
}));

vi.mock("../get-recent-products", () => ({
	getRecentProducts: mockGetRecentProducts,
}));

vi.mock("@/app/generated/prisma/client", () => ({
	CollectionStatus: { PUBLIC: "PUBLIC" },
}));

import { getQuickSearchData } from "../get-quick-search-data";

// ============================================================================
// HELPERS
// ============================================================================

function makeImage(overrides: Record<string, unknown> = {}) {
	return {
		url: "https://example.com/image.jpg",
		blurDataUrl: "data:image/jpeg;base64,blur",
		...overrides,
	};
}

function makeSku(overrides: Record<string, unknown> = {}) {
	return {
		isDefault: false,
		priceInclTax: 4900,
		images: [],
		...overrides,
	};
}

function makeCollectionProduct(overrides: Record<string, unknown> = {}) {
	return {
		product: {
			skus: [],
			...(overrides.product as Record<string, unknown>),
		},
		...overrides,
	};
}

function makeCollection(slug: string, overrides: Record<string, unknown> = {}) {
	return {
		slug,
		name: `Collection ${slug}`,
		products: [],
		_count: { products: 0 },
		...overrides,
	};
}

function makeRecentProduct(slug: string, overrides: Record<string, unknown> = {}) {
	return {
		slug,
		title: `Product ${slug}`,
		skus: [],
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("getQuickSearchData", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockGetRecentSearches.mockResolvedValue([]);
		mockGetCollections.mockResolvedValue({ collections: [] });
		mockGetProductTypes.mockResolvedValue({ productTypes: [] });
		mockGetRecentProducts.mockResolvedValue([]);
	});

	// ─── Parallel fetching ───────────────────────────────────────────────────

	it("calls all 4 data functions in parallel", async () => {
		await getQuickSearchData();

		expect(mockGetRecentSearches).toHaveBeenCalledTimes(1);
		expect(mockGetCollections).toHaveBeenCalledTimes(1);
		expect(mockGetProductTypes).toHaveBeenCalledTimes(1);
		expect(mockGetRecentProducts).toHaveBeenCalledTimes(1);
	});

	it("calls getCollections with correct params", async () => {
		await getQuickSearchData();

		expect(mockGetCollections).toHaveBeenCalledWith({
			perPage: 4,
			sortBy: "products-descending",
			filters: { hasProducts: true, status: "PUBLIC" },
		});
	});

	it("calls getProductTypes with correct params", async () => {
		await getQuickSearchData();

		expect(mockGetProductTypes).toHaveBeenCalledWith({
			perPage: 12,
			sortBy: "label-ascending",
			filters: { isActive: true, hasProducts: true },
		});
	});

	it("calls getRecentProducts with limit 4", async () => {
		await getQuickSearchData();

		expect(mockGetRecentProducts).toHaveBeenCalledWith({ limit: 4 });
	});

	// ─── Collections mapping ─────────────────────────────────────────────────

	it("maps collection data correctly with image from first product's first SKU", async () => {
		const image = makeImage();
		mockGetCollections.mockResolvedValue({
			collections: [
				makeCollection("bracelets", {
					products: [
						makeCollectionProduct({
							product: { skus: [{ images: [image] }] },
						}),
					],
					_count: { products: 3 },
				}),
			],
		});

		const result = await getQuickSearchData();

		expect(result.collections).toEqual([
			{
				slug: "bracelets",
				name: "Collection bracelets",
				productCount: 3,
				image: { url: image.url, blurDataUrl: image.blurDataUrl },
			},
		]);
	});

	it("returns null image when collection has no products", async () => {
		mockGetCollections.mockResolvedValue({
			collections: [makeCollection("colliers", { products: [], _count: { products: 0 } })],
		});

		const result = await getQuickSearchData();

		expect(result.collections[0]?.image).toBeNull();
	});

	it("returns null image when first product has no SKUs", async () => {
		mockGetCollections.mockResolvedValue({
			collections: [
				makeCollection("bagues", {
					products: [makeCollectionProduct({ product: { skus: [] } })],
					_count: { products: 1 },
				}),
			],
		});

		const result = await getQuickSearchData();

		expect(result.collections[0]?.image).toBeNull();
	});

	it("returns null image when first SKU has no images", async () => {
		mockGetCollections.mockResolvedValue({
			collections: [
				makeCollection("bagues", {
					products: [
						makeCollectionProduct({
							product: { skus: [{ images: [] }] },
						}),
					],
					_count: { products: 1 },
				}),
			],
		});

		const result = await getQuickSearchData();

		expect(result.collections[0]?.image).toBeNull();
	});

	it("uses only slug, name, productCount and image from collection data", async () => {
		mockGetCollections.mockResolvedValue({
			collections: [
				{
					slug: "pendentifs",
					name: "Pendentifs",
					extraField: "should-be-ignored",
					products: [],
					_count: { products: 7 },
				},
			],
		});

		const result = await getQuickSearchData();

		expect(result.collections[0]).toEqual({
			slug: "pendentifs",
			name: "Pendentifs",
			productCount: 7,
			image: null,
		});
		expect(result.collections[0]).not.toHaveProperty("extraField");
	});

	// ─── Product types mapping ───────────────────────────────────────────────

	it("maps product types to slug and label only", async () => {
		mockGetProductTypes.mockResolvedValue({
			productTypes: [
				{ slug: "collier", label: "Collier", extraField: "ignored" },
				{ slug: "bague", label: "Bague", extraField: "ignored" },
			],
		});

		const result = await getQuickSearchData();

		expect(result.productTypes).toEqual([
			{ slug: "collier", label: "Collier" },
			{ slug: "bague", label: "Bague" },
		]);
		for (const pt of result.productTypes) {
			expect(pt).not.toHaveProperty("extraField");
		}
	});

	// ─── Recently viewed - SKU selection ────────────────────────────────────

	it("uses isDefault SKU when available", async () => {
		mockGetRecentProducts.mockResolvedValue([
			makeRecentProduct("bracelet-lune", {
				skus: [
					makeSku({ isDefault: false, priceInclTax: 1000, images: [] }),
					makeSku({ isDefault: true, priceInclTax: 5900, images: [] }),
				],
			}),
		]);

		const result = await getQuickSearchData();

		expect(result.recentlyViewed[0]?.price).toBe(5900);
	});

	it("falls back to first SKU when no SKU has isDefault", async () => {
		mockGetRecentProducts.mockResolvedValue([
			makeRecentProduct("collier-etoile", {
				skus: [
					makeSku({ isDefault: false, priceInclTax: 3200, images: [] }),
					makeSku({ isDefault: false, priceInclTax: 8800, images: [] }),
				],
			}),
		]);

		const result = await getQuickSearchData();

		expect(result.recentlyViewed[0]?.price).toBe(3200);
	});

	// ─── Recently viewed - image selection ──────────────────────────────────

	it("uses isPrimary image when available", async () => {
		const primaryImage = makeImage({ url: "https://example.com/primary.jpg", isPrimary: true });
		const otherImage = makeImage({ url: "https://example.com/other.jpg", isPrimary: false });

		mockGetRecentProducts.mockResolvedValue([
			makeRecentProduct("bague-soleil", {
				skus: [
					makeSku({
						isDefault: true,
						priceInclTax: 4200,
						images: [otherImage, primaryImage],
					}),
				],
			}),
		]);

		const result = await getQuickSearchData();

		expect(result.recentlyViewed[0]?.image?.url).toBe("https://example.com/primary.jpg");
	});

	it("falls back to first image when no image has isPrimary", async () => {
		const firstImage = makeImage({ url: "https://example.com/first.jpg", isPrimary: false });
		const secondImage = makeImage({ url: "https://example.com/second.jpg", isPrimary: false });

		mockGetRecentProducts.mockResolvedValue([
			makeRecentProduct("bague-soleil", {
				skus: [
					makeSku({
						isDefault: true,
						priceInclTax: 4200,
						images: [firstImage, secondImage],
					}),
				],
			}),
		]);

		const result = await getQuickSearchData();

		expect(result.recentlyViewed[0]?.image?.url).toBe("https://example.com/first.jpg");
	});

	it("returns price 0 and null image when product has no SKUs", async () => {
		mockGetRecentProducts.mockResolvedValue([makeRecentProduct("pendentif-lune", { skus: [] })]);

		const result = await getQuickSearchData();

		expect(result.recentlyViewed[0]).toEqual({
			slug: "pendentif-lune",
			title: "Product pendentif-lune",
			price: 0,
			image: null,
		});
	});

	it("returns null image when SKU has no images", async () => {
		mockGetRecentProducts.mockResolvedValue([
			makeRecentProduct("bracelet-lune", {
				skus: [makeSku({ isDefault: true, priceInclTax: 2500, images: [] })],
			}),
		]);

		const result = await getQuickSearchData();

		expect(result.recentlyViewed[0]?.image).toBeNull();
	});

	it("maps slug, title, price and image for recently viewed products", async () => {
		const image = makeImage({ isPrimary: true });

		mockGetRecentProducts.mockResolvedValue([
			makeRecentProduct("collier-perle", {
				title: "Collier Perle",
				skus: [makeSku({ isDefault: true, priceInclTax: 7800, images: [image] })],
			}),
		]);

		const result = await getQuickSearchData();

		expect(result.recentlyViewed[0]).toEqual({
			slug: "collier-perle",
			title: "Collier Perle",
			price: 7800,
			image: { url: image.url, blurDataUrl: image.blurDataUrl },
		});
	});

	// ─── Empty results ───────────────────────────────────────────────────────

	it("returns empty arrays when all data functions return empty", async () => {
		const result = await getQuickSearchData();

		expect(result).toEqual({
			recentSearches: [],
			collections: [],
			productTypes: [],
			recentlyViewed: [],
		});
	});

	// ─── Recent searches passthrough ────────────────────────────────────────

	it("passes recent searches through unchanged", async () => {
		const searches = ["bracelet", "collier argent", "bague or"];
		mockGetRecentSearches.mockResolvedValue(searches);

		const result = await getQuickSearchData();

		expect(result.recentSearches).toEqual(searches);
		expect(result.recentSearches).toBe(searches);
	});
});
