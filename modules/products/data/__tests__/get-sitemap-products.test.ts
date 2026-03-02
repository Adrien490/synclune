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

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		SITEMAP_IMAGES: "sitemap-images",
	},
}));

import { getSitemapProducts } from "../get-sitemap-products";

// ============================================================================
// HELPERS
// ============================================================================

function makeSitemapProduct(overrides: Record<string, unknown> = {}) {
	return {
		slug: "bracelet-lune",
		title: "Bracelet Lune",
		type: { label: "Bracelet" },
		skus: [
			{
				images: [
					{
						url: "https://example.com/image.jpg",
						altText: "Bracelet Lune",
						isPrimary: true,
					},
				],
			},
		],
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("getSitemapProducts", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockFindMany.mockResolvedValue([]);
	});

	// ─── Data fetching ───────────────────────────────────────────────────────

	it("returns products with slugs, titles, type labels, and SKU images", async () => {
		const product = makeSitemapProduct();
		mockFindMany.mockResolvedValue([product]);

		const result = await getSitemapProducts();

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			slug: "bracelet-lune",
			title: "Bracelet Lune",
			type: { label: "Bracelet" },
		});
	});

	it("returns empty array when no public products exist", async () => {
		mockFindMany.mockResolvedValue([]);

		const result = await getSitemapProducts();

		expect(result).toEqual([]);
	});

	it("returns multiple products", async () => {
		mockFindMany.mockResolvedValue([
			makeSitemapProduct({ slug: "bracelet-lune", title: "Bracelet Lune" }),
			makeSitemapProduct({ slug: "collier-etoile", title: "Collier Etoile" }),
		]);

		const result = await getSitemapProducts();

		expect(result).toHaveLength(2);
	});

	// ─── Query filters ───────────────────────────────────────────────────────

	it("filters by PUBLIC status", async () => {
		await getSitemapProducts();

		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ status: "PUBLIC" }),
			}),
		);
	});

	it("applies notDeleted filter", async () => {
		await getSitemapProducts();

		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ deletedAt: null }),
			}),
		);
	});

	it("selects only active SKUs with IMAGE media type", async () => {
		await getSitemapProducts();

		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: expect.objectContaining({
					skus: expect.objectContaining({
						where: expect.objectContaining({
							isActive: true,
							deletedAt: null,
						}),
						select: expect.objectContaining({
							images: expect.objectContaining({
								where: expect.objectContaining({ mediaType: "IMAGE" }),
							}),
						}),
					}),
				}),
			}),
		);
	});

	it("selects slug, title and type label", async () => {
		await getSitemapProducts();

		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: expect.objectContaining({
					slug: true,
					title: true,
					type: expect.objectContaining({
						select: expect.objectContaining({ label: true }),
					}),
				}),
			}),
		);
	});

	// ─── Cache ───────────────────────────────────────────────────────────────

	it("calls cacheLife with collections profile", async () => {
		await getSitemapProducts();

		expect(mockCacheLife).toHaveBeenCalledWith("collections");
	});

	it("calls cacheTag with sitemap-images tag", async () => {
		await getSitemapProducts();

		expect(mockCacheTag).toHaveBeenCalledWith("sitemap-images");
	});
});
