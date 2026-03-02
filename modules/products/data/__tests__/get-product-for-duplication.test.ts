import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockFindFirst, mockCacheProductDetail } = vi.hoisted(() => ({
	mockFindFirst: vi.fn(),
	mockCacheProductDetail: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		product: { findFirst: mockFindFirst },
	},
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/products/utils/cache.utils", () => ({
	cacheProductDetail: mockCacheProductDetail,
}));

import { getProductForDuplication } from "../get-product-for-duplication";

// ============================================================================
// HELPERS
// ============================================================================

function makeProductForDuplication(overrides: Record<string, unknown> = {}) {
	return {
		id: "prod-1",
		title: "Bracelet Lune",
		slug: "bracelet-lune",
		description: "Un beau bracelet",
		typeId: "type-1",
		collections: [
			{
				collectionId: "col-1",
				collection: { slug: "printemps" },
			},
		],
		skus: [
			{
				sku: "BL-001",
				priceInclTax: 39.9,
				compareAtPrice: null,
				inventory: 10,
				isActive: true,
				isDefault: true,
				colorId: "color-1",
				materialId: "mat-1",
				size: null,
				images: [
					{
						url: "https://example.com/image.jpg",
						thumbnailUrl: "https://example.com/thumb.jpg",
						altText: "Bracelet Lune",
						mediaType: "IMAGE",
						isPrimary: true,
						position: 0,
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

describe("getProductForDuplication", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockFindFirst.mockResolvedValue(makeProductForDuplication());
	});

	// ─── Data fetching ───────────────────────────────────────────────────────

	it("returns product with all select fields", async () => {
		const product = makeProductForDuplication();
		mockFindFirst.mockResolvedValue(product);

		const result = await getProductForDuplication("prod-1");

		expect(result).toEqual(product);
	});

	it("queries by productId with notDeleted filter", async () => {
		await getProductForDuplication("prod-1");

		expect(mockFindFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: "prod-1",
					deletedAt: null,
				}),
			}),
		);
	});

	it("selects collections with collectionId and collection slug", async () => {
		await getProductForDuplication("prod-1");

		expect(mockFindFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				select: expect.objectContaining({
					collections: expect.objectContaining({
						select: expect.objectContaining({
							collectionId: true,
						}),
					}),
				}),
			}),
		);
	});

	it("selects skus with images", async () => {
		await getProductForDuplication("prod-1");

		expect(mockFindFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				select: expect.objectContaining({
					skus: expect.objectContaining({
						select: expect.objectContaining({
							images: expect.any(Object),
						}),
					}),
				}),
			}),
		);
	});

	// ─── Not found ───────────────────────────────────────────────────────────

	it("returns null when product is not found", async () => {
		mockFindFirst.mockResolvedValue(null);

		const result = await getProductForDuplication("nonexistent");

		expect(result).toBeNull();
	});

	// ─── Cache ───────────────────────────────────────────────────────────────

	it("caches by product ID", async () => {
		await getProductForDuplication("prod-42");

		expect(mockCacheProductDetail).toHaveBeenCalledWith("product-id-prod-42");
	});

	it("uses a distinct cache key per product ID", async () => {
		await getProductForDuplication("prod-1");
		await getProductForDuplication("prod-2");

		expect(mockCacheProductDetail).toHaveBeenNthCalledWith(1, "product-id-prod-1");
		expect(mockCacheProductDetail).toHaveBeenNthCalledWith(2, "product-id-prod-2");
	});
});
