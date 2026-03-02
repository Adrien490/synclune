import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockGetRecentProductSlugs,
	mockFindMany,
	mockCacheLife,
	mockCacheTag,
	mockSerializeProducts,
} = vi.hoisted(() => ({
	mockGetRecentProductSlugs: vi.fn(),
	mockFindMany: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockSerializeProducts: vi.fn(),
}));

vi.mock("../get-recent-product-slugs", () => ({
	getRecentProductSlugs: mockGetRecentProductSlugs,
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		product: { findMany: mockFindMany },
	},
	notDeleted: { deletedAt: null },
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
}));

vi.mock("../../utils/serialize-product", () => ({
	serializeProducts: mockSerializeProducts,
}));

vi.mock("../constants/product.constants", () => ({
	GET_PRODUCTS_SELECT: { id: true, slug: true, title: true },
}));

vi.mock("../constants/recent-products", () => ({
	RECENT_PRODUCTS_DISPLAY_LIMIT: 8,
}));

vi.mock("../constants/cache", () => ({
	RECENT_PRODUCTS_CACHE_TAGS: {
		LIST: "recent-products-list",
	},
}));

import { getRecentProducts } from "../get-recent-products";

// ============================================================================
// HELPERS
// ============================================================================

function makeProduct(slug: string, overrides: Record<string, unknown> = {}) {
	return {
		id: `id-${slug}`,
		slug,
		title: `Product ${slug}`,
		status: "PUBLIC",
		skus: [],
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("getRecentProducts", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockSerializeProducts.mockImplementation((products: unknown[]) => products);
	});

	// ─── No slugs ────────────────────────────────────────────────────────────

	it("returns empty array when no recent slugs exist", async () => {
		mockGetRecentProductSlugs.mockResolvedValue([]);

		const result = await getRecentProducts();

		expect(result).toEqual([]);
		expect(mockFindMany).not.toHaveBeenCalled();
	});

	// ─── Filtering ───────────────────────────────────────────────────────────

	it("excludes current product slug from results", async () => {
		mockGetRecentProductSlugs.mockResolvedValue([
			"bracelet-lune",
			"collier-etoile",
			"bague-soleil",
		]);
		mockFindMany.mockResolvedValue([makeProduct("collier-etoile"), makeProduct("bague-soleil")]);

		await getRecentProducts({ excludeSlug: "bracelet-lune" });

		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					slug: { in: ["collier-etoile", "bague-soleil"] },
				}),
			}),
		);
	});

	it("returns empty array when excluded slug is the only slug", async () => {
		mockGetRecentProductSlugs.mockResolvedValue(["bracelet-lune"]);

		const result = await getRecentProducts({ excludeSlug: "bracelet-lune" });

		expect(result).toEqual([]);
		expect(mockFindMany).not.toHaveBeenCalled();
	});

	// ─── Limit ───────────────────────────────────────────────────────────────

	it("limits results to the default display limit (8)", async () => {
		const slugs = Array.from({ length: 10 }, (_, i) => `product-${i}`);
		mockGetRecentProductSlugs.mockResolvedValue(slugs);
		mockFindMany.mockResolvedValue([]);

		await getRecentProducts();

		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					slug: { in: slugs.slice(0, 8) },
				}),
			}),
		);
	});

	it("respects a custom limit option", async () => {
		const slugs = ["p-1", "p-2", "p-3", "p-4", "p-5"];
		mockGetRecentProductSlugs.mockResolvedValue(slugs);
		mockFindMany.mockResolvedValue([]);

		await getRecentProducts({ limit: 3 });

		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					slug: { in: ["p-1", "p-2", "p-3"] },
				}),
			}),
		);
	});

	// ─── Ordering ────────────────────────────────────────────────────────────

	it("orders products by slug order from cookies (most recent first)", async () => {
		const slugs = ["bague-soleil", "collier-etoile", "bracelet-lune"];
		mockGetRecentProductSlugs.mockResolvedValue(slugs);

		// DB returns in different order
		mockFindMany.mockResolvedValue([
			makeProduct("bracelet-lune"),
			makeProduct("bague-soleil"),
			makeProduct("collier-etoile"),
		]);

		const result = await getRecentProducts();

		expect(result.map((p: { slug: string }) => p.slug)).toEqual([
			"bague-soleil",
			"collier-etoile",
			"bracelet-lune",
		]);
	});

	it("omits products returned by DB that are not in slug list", async () => {
		mockGetRecentProductSlugs.mockResolvedValue(["bracelet-lune"]);
		// DB might return unexpected slugs due to race conditions – filter them out
		mockFindMany.mockResolvedValue([makeProduct("bracelet-lune")]);

		const result = await getRecentProducts();

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ slug: "bracelet-lune" });
	});

	// ─── Cache ───────────────────────────────────────────────────────────────

	it("calls cacheLife with relatedProducts profile", async () => {
		mockGetRecentProductSlugs.mockResolvedValue(["bracelet-lune"]);
		mockFindMany.mockResolvedValue([]);

		await getRecentProducts();

		expect(mockCacheLife).toHaveBeenCalledWith("relatedProducts");
	});

	it("calls cacheTag with recent-products-list tag", async () => {
		mockGetRecentProductSlugs.mockResolvedValue(["bracelet-lune"]);
		mockFindMany.mockResolvedValue([]);

		await getRecentProducts();

		expect(mockCacheTag).toHaveBeenCalledWith("recent-products-list");
	});

	// ─── Error handling ──────────────────────────────────────────────────────

	it("returns empty array on DB error", async () => {
		mockGetRecentProductSlugs.mockResolvedValue(["bracelet-lune"]);
		mockFindMany.mockRejectedValue(new Error("DB error"));

		const result = await getRecentProducts();

		expect(result).toEqual([]);
	});

	// ─── Serialization ───────────────────────────────────────────────────────

	it("serializes returned products", async () => {
		const products = [makeProduct("bracelet-lune")];
		mockGetRecentProductSlugs.mockResolvedValue(["bracelet-lune"]);
		mockFindMany.mockResolvedValue(products);
		mockSerializeProducts.mockReturnValue([{ ...products[0], serialized: true }]);

		const result = await getRecentProducts();

		expect(mockSerializeProducts).toHaveBeenCalled();
		expect(result[0]).toHaveProperty("serialized", true);
	});
});
