import { describe, it, expect, vi, beforeEach } from "vitest"

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockFindMany,
	mockCacheLife,
	mockCacheTag,
	mockIsAdmin,
	mockGetRateLimitId,
	mockCheckRateLimit,
	mockGetProductsSchema,
	mockBuildSearchConditions,
	mockBuildExactSearchConditions,
	mockBuildProductWhereClause,
	mockGetSpellSuggestion,
	mockSortProducts,
	mockOrderByIds,
	mockCacheProducts,
	mockSerializeProduct,
} = vi.hoisted(() => ({
	mockFindMany: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockIsAdmin: vi.fn(),
	mockGetRateLimitId: vi.fn(),
	mockCheckRateLimit: vi.fn(),
	mockGetProductsSchema: { safeParse: vi.fn() },
	mockBuildSearchConditions: vi.fn(),
	mockBuildExactSearchConditions: vi.fn(),
	mockBuildProductWhereClause: vi.fn(),
	mockGetSpellSuggestion: vi.fn(),
	mockSortProducts: vi.fn(),
	mockOrderByIds: vi.fn(),
	mockCacheProducts: vi.fn(),
	mockSerializeProduct: vi.fn(),
}))

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		product: { findMany: mockFindMany },
	},
}))

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}))

vi.mock("@/modules/auth/utils/guards", () => ({
	isAdmin: mockIsAdmin,
}))

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	getRateLimitId: mockGetRateLimitId,
}))

vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
}))

vi.mock("../../schemas/product.schemas", () => ({
	getProductsSchema: mockGetProductsSchema,
}))

vi.mock("../../services/product-query-builder", () => ({
	buildSearchConditions: mockBuildSearchConditions,
	buildExactSearchConditions: mockBuildExactSearchConditions,
	buildProductWhereClause: mockBuildProductWhereClause,
}))

vi.mock("../spell-suggestion", () => ({
	getSpellSuggestion: mockGetSpellSuggestion,
	SUGGESTION_THRESHOLD_RESULTS: 3,
}))

vi.mock("../../services/product-list-sorting.service", () => ({
	sortProducts: mockSortProducts,
	orderByIds: mockOrderByIds,
}))

vi.mock("../../utils/cache.utils", () => ({
	cacheProducts: mockCacheProducts,
}))

vi.mock("../../utils/serialize-product", () => ({
	serializeProduct: mockSerializeProduct,
}))

vi.mock("../../constants/product.constants", () => ({
	GET_PRODUCTS_SELECT: { id: true, slug: true, title: true },
	GET_PRODUCTS_DEFAULT_PER_PAGE: 20,
	GET_PRODUCTS_DEFAULT_SORT_BY: "created-descending",
	GET_PRODUCTS_ADMIN_FALLBACK_SORT_BY: "created-descending",
	GET_PRODUCTS_MAX_RESULTS_PER_PAGE: 200,
}))

vi.mock("../../constants/search.constants", () => ({
	SEARCH_RATE_LIMITS: {
		authenticated: { limit: 30, windowMs: 60_000 },
		guest: { limit: 15, windowMs: 60_000 },
	},
}))

import { getProducts } from "../get-products"

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
		updatedAt: new Date("2024-01-01"),
		skus: [],
		collections: [],
		reviewStats: null,
		...overrides,
	}
}

const DEFAULT_PARAMS = {
	cursor: undefined,
	direction: undefined,
	perPage: 20,
	sortBy: "created-descending",
	filters: {},
	status: "PUBLIC" as const,
}

const EMPTY_PAGINATION = {
	nextCursor: null,
	prevCursor: null,
	hasNextPage: false,
	hasPreviousPage: false,
}

function setupValidParams(overrides: Record<string, unknown> = {}) {
	const data = { ...DEFAULT_PARAMS, ...overrides }
	mockGetProductsSchema.safeParse.mockReturnValue({ success: true, data })
	return data
}

// ============================================================================
// TESTS
// ============================================================================

describe("getProducts", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		// Default: valid params, not admin, no search
		setupValidParams()
		mockIsAdmin.mockResolvedValue(false)
		mockGetRateLimitId.mockResolvedValue({
			identifier: "ip:1.2.3.4",
			ipAddress: "1.2.3.4",
		})
		mockCheckRateLimit.mockResolvedValue({ success: true })
		mockBuildProductWhereClause.mockReturnValue({ deletedAt: null, status: "PUBLIC" })
		mockBuildSearchConditions.mockResolvedValue({ fuzzyIds: null, exactConditions: [] })
		mockBuildExactSearchConditions.mockReturnValue({ fuzzyIds: null, exactConditions: [] })
		mockGetSpellSuggestion.mockResolvedValue(null)

		// Sorting returns products unchanged by default
		mockSortProducts.mockImplementation((products: unknown[]) => products)
		mockOrderByIds.mockImplementation((products: unknown[]) => products)

		// Serialization is transparent by default
		mockSerializeProduct.mockImplementation((p: unknown) => p)

		mockFindMany.mockResolvedValue([])
	})

	// ─── Validation ─────────────────────────────────────────────────────────

	it("throws when schema validation fails", async () => {
		mockGetProductsSchema.safeParse.mockReturnValue({
			success: false,
			error: {
				issues: [{ message: "Invalid params" }],
			},
		})

		await expect(getProducts(DEFAULT_PARAMS)).rejects.toThrow("Invalid parameters")
	})

	it("calls safeParse with the provided params", async () => {
		await getProducts(DEFAULT_PARAMS)

		expect(mockGetProductsSchema.safeParse).toHaveBeenCalledWith(DEFAULT_PARAMS)
	})

	// ─── Admin logic ─────────────────────────────────────────────────────────

	it("calls isAdmin() when no options.isAdmin provided", async () => {
		await getProducts(DEFAULT_PARAMS)

		expect(mockIsAdmin).toHaveBeenCalled()
	})

	it("skips isAdmin() call when options.isAdmin is provided", async () => {
		await getProducts(DEFAULT_PARAMS, { isAdmin: true })

		expect(mockIsAdmin).not.toHaveBeenCalled()
	})

	it("uses admin fallback sort when admin has no explicit sortBy", async () => {
		mockIsAdmin.mockResolvedValue(true)
		setupValidParams({ sortBy: "created-descending" })

		await getProducts({ ...DEFAULT_PARAMS, sortBy: undefined as unknown as string })

		// Admin path should have proceeded without error
		expect(mockBuildProductWhereClause).toHaveBeenCalled()
	})

	// ─── Search / fuzzy ──────────────────────────────────────────────────────

	it("does not call buildSearchConditions when no search term", async () => {
		setupValidParams({ search: undefined })

		await getProducts(DEFAULT_PARAMS)

		expect(mockBuildSearchConditions).not.toHaveBeenCalled()
		expect(mockBuildExactSearchConditions).not.toHaveBeenCalled()
	})

	it("calls buildSearchConditions with the search term when present", async () => {
		setupValidParams({ search: "bracelet" })

		await getProducts({ ...DEFAULT_PARAMS, search: "bracelet" })

		expect(mockBuildSearchConditions).toHaveBeenCalledWith(
			"bracelet",
			expect.objectContaining({ status: "PUBLIC" })
		)
	})

	it("uses buildExactSearchConditions when rate limit is exceeded", async () => {
		setupValidParams({ search: "collier" })
		mockGetRateLimitId.mockResolvedValue({
			identifier: "ip:1.2.3.4",
			ipAddress: "1.2.3.4",
		})
		mockCheckRateLimit.mockResolvedValue({ success: false, retryAfter: 30 })
		mockBuildExactSearchConditions.mockReturnValue({ fuzzyIds: null, exactConditions: [] })

		const result = await getProducts({ ...DEFAULT_PARAMS, search: "collier" })

		expect(mockBuildExactSearchConditions).toHaveBeenCalledWith("collier")
		expect(mockBuildSearchConditions).not.toHaveBeenCalled()
		expect(result.rateLimited).toBe(true)
	})

	it("continues with fuzzy search when rate limit check throws", async () => {
		setupValidParams({ search: "collier" })
		mockGetRateLimitId.mockRejectedValue(new Error("Rate limit service unavailable"))

		await getProducts({ ...DEFAULT_PARAMS, search: "collier" })

		// Falls back to fuzzy search (no exact-only flag)
		expect(mockBuildSearchConditions).toHaveBeenCalled()
	})

	// ─── Cache ───────────────────────────────────────────────────────────────

	it("calls cacheProducts() inside fetchProducts", async () => {
		await getProducts(DEFAULT_PARAMS)

		expect(mockCacheProducts).toHaveBeenCalled()
	})

	// ─── Sorting ─────────────────────────────────────────────────────────────

	it("sorts by relevance when fuzzy search returns IDs and sortBy is default", async () => {
		setupValidParams({ search: "collier", sortBy: "created-descending" })
		mockBuildSearchConditions.mockResolvedValue({
			fuzzyIds: ["id-1", "id-2"],
			exactConditions: [],
		})
		const products = [makeProduct("id-1"), makeProduct("id-2")]
		mockFindMany.mockResolvedValue(products)

		await getProducts({ ...DEFAULT_PARAMS, search: "collier" })

		expect(mockOrderByIds).toHaveBeenCalledWith(products, ["id-1", "id-2"])
		expect(mockSortProducts).not.toHaveBeenCalled()
	})

	it("sorts by user criterion when sortBy is not default", async () => {
		setupValidParams({ search: "collier", sortBy: "price-ascending" })
		mockBuildSearchConditions.mockResolvedValue({
			fuzzyIds: ["id-1", "id-2"],
			exactConditions: [],
		})
		const products = [makeProduct("id-1"), makeProduct("id-2")]
		mockFindMany.mockResolvedValue(products)

		await getProducts({ ...DEFAULT_PARAMS, search: "collier", sortBy: "price-ascending" })

		expect(mockSortProducts).toHaveBeenCalledWith(products, "price-ascending")
		expect(mockOrderByIds).not.toHaveBeenCalled()
	})

	it("sorts by criterion when fuzzy search returns empty IDs", async () => {
		setupValidParams({ search: "collier", sortBy: "created-descending" })
		mockBuildSearchConditions.mockResolvedValue({
			fuzzyIds: [],
			exactConditions: [],
		})
		const products = [makeProduct("id-1")]
		mockFindMany.mockResolvedValue(products)

		await getProducts({ ...DEFAULT_PARAMS, search: "collier" })

		expect(mockSortProducts).toHaveBeenCalled()
		expect(mockOrderByIds).not.toHaveBeenCalled()
	})

	// ─── Spell suggestion ─────────────────────────────────────────────────────

	it("returns spell suggestion when results <= threshold and not admin", async () => {
		setupValidParams({ search: "coliier", sortBy: "created-descending" })
		mockBuildSearchConditions.mockResolvedValue({ fuzzyIds: [], exactConditions: [] })
		mockFindMany.mockResolvedValue([makeProduct("id-1")])
		mockSortProducts.mockImplementation((products: unknown[]) => products)
		mockGetSpellSuggestion.mockResolvedValue({ term: "collier", similarity: 0.8, source: "product" })

		const result = await getProducts({ ...DEFAULT_PARAMS, search: "coliier" })

		expect(mockGetSpellSuggestion).toHaveBeenCalledWith("coliier", expect.any(Object))
		expect(result.suggestion).toBe("collier")
	})

	it("does not request spell suggestion when admin is true", async () => {
		setupValidParams({ search: "coliier" })
		mockIsAdmin.mockResolvedValue(true)
		mockBuildSearchConditions.mockResolvedValue({ fuzzyIds: [], exactConditions: [] })
		mockFindMany.mockResolvedValue([])
		mockSortProducts.mockReturnValue([])

		await getProducts({ ...DEFAULT_PARAMS, search: "coliier" }, { isAdmin: true })

		expect(mockGetSpellSuggestion).not.toHaveBeenCalled()
	})

	it("does not return suggestion when totalCount exceeds threshold", async () => {
		setupValidParams({ search: "collier" })
		mockBuildSearchConditions.mockResolvedValue({ fuzzyIds: ["1", "2", "3", "4"], exactConditions: [] })
		const products = [makeProduct("1"), makeProduct("2"), makeProduct("3"), makeProduct("4")]
		mockFindMany.mockResolvedValue(products)
		mockSortProducts.mockReturnValue(products)

		const result = await getProducts({ ...DEFAULT_PARAMS, search: "collier" })

		expect(mockGetSpellSuggestion).not.toHaveBeenCalled()
		expect(result.suggestion).toBeUndefined()
	})

	// ─── Pagination ──────────────────────────────────────────────────────────

	it("returns empty pagination when no products found", async () => {
		mockFindMany.mockResolvedValue([])
		mockSortProducts.mockReturnValue([])

		const result = await getProducts(DEFAULT_PARAMS)

		expect(result.products).toEqual([])
		expect(result.pagination).toEqual(EMPTY_PAGINATION)
		expect(result.totalCount).toBe(0)
	})

	it("returns hasNextPage true when more products exist beyond perPage", async () => {
		const products = Array.from({ length: 21 }, (_, i) => makeProduct(`id-${i}`))
		mockFindMany.mockResolvedValue(products)
		mockSortProducts.mockReturnValue(products)
		mockSerializeProduct.mockImplementation((p: unknown) => p)
		setupValidParams({ perPage: 20 })

		const result = await getProducts({ ...DEFAULT_PARAMS, perPage: 20 })

		expect(result.pagination.hasNextPage).toBe(true)
		expect(result.products).toHaveLength(20)
	})

	it("returns hasPreviousPage false on first page", async () => {
		const products = [makeProduct("id-1"), makeProduct("id-2")]
		mockFindMany.mockResolvedValue(products)
		mockSortProducts.mockReturnValue(products)

		const result = await getProducts(DEFAULT_PARAMS)

		expect(result.pagination.hasPreviousPage).toBe(false)
	})

	it("serializes all returned products", async () => {
		const products = [makeProduct("id-1"), makeProduct("id-2")]
		mockFindMany.mockResolvedValue(products)
		mockSortProducts.mockReturnValue(products)
		mockSerializeProduct.mockImplementation((p: { id: string }) => ({ ...p, serialized: true }))

		const result = await getProducts(DEFAULT_PARAMS)

		expect(mockSerializeProduct).toHaveBeenCalledTimes(2)
		expect(result.products[0]).toMatchObject({ serialized: true })
	})

	// ─── Error handling ──────────────────────────────────────────────────────

	it("returns empty result with error field when prisma throws", async () => {
		mockFindMany.mockRejectedValue(new Error("DB timeout"))

		const result = await getProducts(DEFAULT_PARAMS)

		expect(result.products).toEqual([])
		expect(result.pagination).toEqual(EMPTY_PAGINATION)
		expect(result.totalCount).toBe(0)
	})

	it("returns empty result when sorting service throws", async () => {
		const products = [makeProduct("id-1")]
		mockFindMany.mockResolvedValue(products)
		mockSortProducts.mockImplementation(() => {
			throw new Error("Sorting failed")
		})

		const result = await getProducts(DEFAULT_PARAMS)

		expect(result.products).toEqual([])
		expect(result.totalCount).toBe(0)
	})

	it("propagates unexpected non-schema errors from getProducts wrapper", async () => {
		// prisma failure is caught inside fetchProducts, not re-thrown
		// but a thrown error from schema validation IS re-thrown
		mockGetProductsSchema.safeParse.mockReturnValue({
			success: false,
			error: { issues: [{ message: "bad" }] },
		})

		await expect(getProducts(DEFAULT_PARAMS)).rejects.toThrow()
	})

	// ─── Return shape ────────────────────────────────────────────────────────

	it("returns a valid GetProductsReturn shape on success", async () => {
		const products = [makeProduct("id-1")]
		mockFindMany.mockResolvedValue(products)
		mockSortProducts.mockReturnValue(products)

		const result = await getProducts(DEFAULT_PARAMS)

		expect(result).toHaveProperty("products")
		expect(result).toHaveProperty("pagination")
		expect(result).toHaveProperty("totalCount")
		expect(result.pagination).toHaveProperty("nextCursor")
		expect(result.pagination).toHaveProperty("prevCursor")
		expect(result.pagination).toHaveProperty("hasNextPage")
		expect(result.pagination).toHaveProperty("hasPreviousPage")
	})

	it("includes rateLimited: true in result when rate limited", async () => {
		setupValidParams({ search: "collier" })
		mockGetRateLimitId.mockResolvedValue({ identifier: "ip:1.2.3.4", ipAddress: "1.2.3.4" })
		mockCheckRateLimit.mockResolvedValue({ success: false, retryAfter: 30 })
		mockBuildExactSearchConditions.mockReturnValue({ fuzzyIds: null, exactConditions: [] })
		mockFindMany.mockResolvedValue([])
		mockSortProducts.mockReturnValue([])

		const result = await getProducts({ ...DEFAULT_PARAMS, search: "collier" })

		expect(result.rateLimited).toBe(true)
	})

	it("does not include rateLimited in result when not rate limited", async () => {
		const result = await getProducts(DEFAULT_PARAMS)

		expect(result.rateLimited).toBeUndefined()
	})
})
