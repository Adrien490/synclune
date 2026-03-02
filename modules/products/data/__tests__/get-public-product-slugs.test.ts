import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockFindMany, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockFindMany: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
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

vi.mock("../constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: {
		LIST: "products-list",
	},
}));

import { getPublicProductSlugs } from "../get-public-product-slugs";

// ============================================================================
// TESTS
// ============================================================================

describe("getPublicProductSlugs", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockFindMany.mockResolvedValue([]);
	});

	// ─── Data fetching ───────────────────────────────────────────────────────

	it("returns slugs of public products", async () => {
		mockFindMany.mockResolvedValue([{ slug: "bracelet-lune" }, { slug: "collier-etoile" }]);

		const result = await getPublicProductSlugs();

		expect(result).toEqual([{ slug: "bracelet-lune" }, { slug: "collier-etoile" }]);
	});

	it("returns empty array when no public products exist", async () => {
		mockFindMany.mockResolvedValue([]);

		const result = await getPublicProductSlugs();

		expect(result).toEqual([]);
	});

	it("filters by PUBLIC status", async () => {
		mockFindMany.mockResolvedValue([]);

		await getPublicProductSlugs();

		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ status: "PUBLIC" }),
			}),
		);
	});

	it("applies notDeleted filter", async () => {
		mockFindMany.mockResolvedValue([]);

		await getPublicProductSlugs();

		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ deletedAt: null }),
			}),
		);
	});

	it("selects only the slug field", async () => {
		mockFindMany.mockResolvedValue([]);

		await getPublicProductSlugs();

		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { slug: true },
			}),
		);
	});

	// ─── Cache ───────────────────────────────────────────────────────────────

	it("calls cacheLife with products profile", async () => {
		await getPublicProductSlugs();

		expect(mockCacheLife).toHaveBeenCalledWith("products");
	});

	it("calls cacheTag with products-list tag", async () => {
		await getPublicProductSlugs();

		expect(mockCacheTag).toHaveBeenCalledWith("products-list");
	});
});
