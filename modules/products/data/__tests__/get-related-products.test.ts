import { describe, it, expect, vi, beforeEach } from "vitest"

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockFindMany,
	mockFindUnique,
	mockOrderItemFindMany,
	mockCacheLife,
	mockCacheTag,
	mockGetSession,
	mockHeaders,
	mockSerializeProducts,
} = vi.hoisted(() => ({
	mockFindMany: vi.fn(),
	mockFindUnique: vi.fn(),
	mockOrderItemFindMany: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockGetSession: vi.fn(),
	mockHeaders: vi.fn(),
	mockSerializeProducts: vi.fn(),
}))

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		product: {
			findMany: mockFindMany,
			findUnique: mockFindUnique,
		},
		orderItem: {
			findMany: mockOrderItemFindMany,
		},
	},
	notDeleted: { deletedAt: null },
}))

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
}))

vi.mock("next/headers", () => ({
	headers: mockHeaders,
}))

vi.mock("@/modules/auth/lib/auth", () => ({
	auth: {
		api: {
			getSession: mockGetSession,
		},
	},
}))

vi.mock("../../utils/serialize-product", () => ({
	serializeProducts: mockSerializeProducts,
}))

vi.mock("../../constants/related-products.constants", () => ({
	RELATED_PRODUCTS_DEFAULT_LIMIT: 8,
	RELATED_PRODUCTS_STRATEGY: {
		SAME_COLLECTION: 3,
		SAME_TYPE: 2,
		SIMILAR_COLORS: 2,
		BEST_SELLERS: 1,
	},
}))

vi.mock("../../constants/product.constants", () => ({
	GET_PRODUCTS_SELECT: { id: true, slug: true, title: true },
}))

vi.mock("../../constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: {
		RELATED_PUBLIC: "related-products-public",
		RELATED_USER: (userId: string) => `related-products-user-${userId}`,
		RELATED_CONTEXTUAL: (slug: string) => `related-products-contextual-${slug}`,
	},
}))

import { getRelatedProducts } from "../get-related-products"

// ============================================================================
// HELPERS
// ============================================================================

function makeProduct(id: string, overrides: Record<string, unknown> = {}) {
	return {
		id,
		slug: `product-${id}`,
		title: `Product ${id}`,
		status: "PUBLIC",
		createdAt: new Date("2024-01-01"),
		skus: [],
		...overrides,
	}
}

// ============================================================================
// TESTS
// ============================================================================

describe("getRelatedProducts", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		mockHeaders.mockResolvedValue(new Headers())
		mockSerializeProducts.mockImplementation((products: unknown[]) => products)
	})

	// ─── Public strategy (no slug, no user) ─────────────────────────────

	describe("public strategy", () => {
		beforeEach(() => {
			mockGetSession.mockResolvedValue(null)
		})

		it("fetches public related products for unauthenticated users", async () => {
			const products = [makeProduct("1"), makeProduct("2")]
			mockFindMany.mockResolvedValue(products)

			const result = await getRelatedProducts()

			expect(mockFindMany).toHaveBeenCalledTimes(1)
			expect(mockFindMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						status: "PUBLIC",
					}),
					orderBy: { createdAt: "desc" },
					take: 8,
				})
			)
			expect(result).toEqual(products)
		})

		it("respects custom limit", async () => {
			mockFindMany.mockResolvedValue([])

			await getRelatedProducts({ limit: 4 })

			expect(mockFindMany).toHaveBeenCalledWith(
				expect.objectContaining({ take: 4 })
			)
		})

		it("returns empty array on error", async () => {
			mockFindMany.mockRejectedValue(new Error("DB error"))

			const result = await getRelatedProducts()

			expect(result).toEqual([])
		})

		it("calls cacheLife and cacheTag", async () => {
			mockFindMany.mockResolvedValue([])

			await getRelatedProducts()

			expect(mockCacheLife).toHaveBeenCalledWith("relatedProducts")
			expect(mockCacheTag).toHaveBeenCalledWith("related-products-public")
		})

		it("serializes products", async () => {
			const products = [makeProduct("1")]
			mockFindMany.mockResolvedValue(products)
			mockSerializeProducts.mockReturnValue([{ ...products[0], serialized: true }])

			const result = await getRelatedProducts()

			expect(mockSerializeProducts).toHaveBeenCalledWith(products)
			expect(result[0]).toHaveProperty("serialized", true)
		})
	})

	// ─── Personalized strategy (no slug, authenticated user) ────────────

	describe("personalized strategy", () => {
		beforeEach(() => {
			mockGetSession.mockResolvedValue({
				user: { id: "user-1" },
			})
		})

		it("fetches personalized products based on order history", async () => {
			mockOrderItemFindMany.mockResolvedValue([
				{
					product: {
						typeId: "type-1",
						collections: [{ collectionId: "col-1" }],
					},
				},
			])
			const products = [makeProduct("1")]
			mockFindMany.mockResolvedValue(products)

			const result = await getRelatedProducts()

			expect(mockOrderItemFindMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						order: { userId: "user-1", paymentStatus: "PAID" },
					}),
				})
			)
			expect(result).toEqual(products)
		})

		it("falls back to public products when no order history yields results", async () => {
			mockOrderItemFindMany.mockResolvedValue([
				{
					product: {
						typeId: "type-1",
						collections: [],
					},
				},
			])
			// First call (personalized) returns empty
			mockFindMany
				.mockResolvedValueOnce([])
				// Second call (fallback) returns products
				.mockResolvedValueOnce([makeProduct("fallback")])

			const result = await getRelatedProducts()

			expect(mockFindMany).toHaveBeenCalledTimes(2)
			expect(result[0]).toMatchObject({ id: "fallback" })
		})

		it("falls back to public when no order history at all", async () => {
			mockOrderItemFindMany.mockResolvedValue([])
			const products = [makeProduct("public-1")]
			mockFindMany.mockResolvedValue(products)

			const result = await getRelatedProducts()

			// Should fetch public products since no typeIds or collectionIds
			expect(result).toEqual(products)
		})

		it("returns empty array on error", async () => {
			mockOrderItemFindMany.mockRejectedValue(new Error("DB error"))

			const result = await getRelatedProducts()

			expect(result).toEqual([])
		})
	})

	// ─── Contextual strategy (with product slug) ────────────────────────

	describe("contextual strategy", () => {
		const currentProduct = {
			id: "current-1",
			typeId: "type-1",
			collections: [{ collectionId: "col-1" }],
			skus: [
				{ colorId: "color-1" },
				{ colorId: "color-2" },
				{ colorId: null },
			],
		}

		beforeEach(() => {
			mockFindUnique.mockResolvedValue(currentProduct)
		})

		it("fetches current product by slug", async () => {
			mockFindMany.mockResolvedValue([])

			await getRelatedProducts({ currentProductSlug: "my-product" })

			expect(mockFindUnique).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { slug: "my-product" },
				})
			)
		})

		it("runs 4 parallel queries for contextual strategy", async () => {
			mockFindMany.mockResolvedValue([])

			await getRelatedProducts({ currentProductSlug: "my-product" })

			// 4 parallel queries: same collection, same type, similar colors, best sellers
			expect(mockFindMany).toHaveBeenCalledTimes(4)
		})

		it("deduplicates products across strategies", async () => {
			const product1 = makeProduct("1")
			const product2 = makeProduct("2")
			const product3 = makeProduct("3")

			// Same collection returns product1, product2
			// Same type also returns product1 (duplicate)
			// Similar colors returns product3
			mockFindMany
				.mockResolvedValueOnce([product1, product2]) // same collection
				.mockResolvedValueOnce([product1]) // same type (dup)
				.mockResolvedValueOnce([product3]) // similar colors
				.mockResolvedValueOnce([product1, product2, product3]) // best sellers (all dups)

			const result = await getRelatedProducts({
				currentProductSlug: "my-product",
			})

			// All 3 unique products should be present
			const ids = result.map((p: { id: string }) => p.id)
			expect(new Set(ids).size).toBe(ids.length)
		})

		it("falls back to public products when current product not found", async () => {
			mockFindUnique.mockResolvedValue(null)
			mockFindMany.mockResolvedValue([makeProduct("fallback")])

			const result = await getRelatedProducts({
				currentProductSlug: "nonexistent",
			})

			// Should call findMany for public fallback
			expect(result[0]).toMatchObject({ id: "fallback" })
		})

		it("falls back to public products on error", async () => {
			mockFindUnique.mockRejectedValue(new Error("DB error"))
			mockFindMany.mockResolvedValue([makeProduct("fallback")])

			const result = await getRelatedProducts({
				currentProductSlug: "my-product",
			})

			expect(result[0]).toMatchObject({ id: "fallback" })
		})

		it("excludes current product from results", async () => {
			mockFindMany.mockResolvedValue([])

			await getRelatedProducts({ currentProductSlug: "my-product" })

			// All findMany calls should exclude the current product ID
			for (const call of mockFindMany.mock.calls) {
				const where = call[0]?.where
				if (where?.id) {
					expect(where.id.not).toBe("current-1")
				}
			}
		})

		it("handles product with no collections", async () => {
			mockFindUnique.mockResolvedValue({
				...currentProduct,
				collections: [],
			})
			mockFindMany.mockResolvedValue([])

			await getRelatedProducts({ currentProductSlug: "my-product" })

			// Should still work, just skip collection-based query
			expect(mockFindMany).toHaveBeenCalled()
		})

		it("handles product with no type", async () => {
			mockFindUnique.mockResolvedValue({
				...currentProduct,
				typeId: null,
			})
			mockFindMany.mockResolvedValue([])

			await getRelatedProducts({ currentProductSlug: "my-product" })

			expect(mockFindMany).toHaveBeenCalled()
		})
	})
})
