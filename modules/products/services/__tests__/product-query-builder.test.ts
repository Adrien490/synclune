import { describe, it, expect, vi, beforeEach } from "vitest"

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockFuzzySearchProductIds } = vi.hoisted(() => ({
	mockFuzzySearchProductIds: vi.fn(),
}))

vi.mock("@/shared/lib/prisma", () => ({
	notDeleted: { deletedAt: null },
}))

vi.mock("../../data/fuzzy-search", () => ({
	fuzzySearchProductIds: mockFuzzySearchProductIds,
}))

vi.mock("../../constants/search.constants", () => ({
	FUZZY_MIN_LENGTH: 3,
}))

vi.mock("../../constants/search-synonyms", () => ({
	SEARCH_SYNONYMS: new Map([
		["bague", ["anneau", "alliance"]],
		["anneau", ["bague", "alliance"]],
	]),
}))

vi.mock("../../utils/search-helpers", () => ({
	splitSearchTerms: vi.fn((term: string) => {
		const trimmed = term.trim()
		if (!trimmed || trimmed.length > 100) return []
		return trimmed
			.split(/\s+/)
			.filter(Boolean)
			.filter(
				(word: string, i: number, arr: string[]) =>
					arr.findIndex((w: string) => w.toLowerCase() === word.toLowerCase()) === i
			)
			.slice(0, 5)
	}),
}))

import {
	buildProductWhereClause,
	buildProductFilterConditions,
	buildSearchConditions,
	buildExactSearchConditions,
} from "../product-query-builder"
import type { GetProductsParams } from "../../types/product.types"

// ============================================================================
// HELPERS
// ============================================================================

const DEFAULT_PARAMS: GetProductsParams = {
	perPage: 20,
	sortBy: "created-descending",
	filters: {},
	status: "PUBLIC",
}

// ============================================================================
// buildProductFilterConditions
// ============================================================================

describe("buildProductFilterConditions", () => {
	it("returns empty array for empty filters", () => {
		const result = buildProductFilterConditions({})

		expect(result).toEqual([])
	})

	it("handles single status filter", () => {
		const result = buildProductFilterConditions({ status: "PUBLIC" as never })

		expect(result).toContainEqual({ status: "PUBLIC" })
	})

	it("handles array of statuses", () => {
		const result = buildProductFilterConditions({
			status: ["PUBLIC", "DRAFT"] as never,
		})

		expect(result).toContainEqual({ status: { in: ["PUBLIC", "DRAFT"] } })
	})

	it("handles single type filter", () => {
		const result = buildProductFilterConditions({ type: "bague" })

		expect(result).toContainEqual({ type: { slug: "bague" } })
	})

	it("handles array of types", () => {
		const result = buildProductFilterConditions({
			type: ["bague", "collier"],
		})

		expect(result).toContainEqual({
			type: { slug: { in: ["bague", "collier"] } },
		})
	})

	it("handles single color filter", () => {
		const result = buildProductFilterConditions({ color: "or" })

		expect(result).toContainEqual({
			skus: { some: { isActive: true, color: { slug: "or" } } },
		})
	})

	it("handles array of colors", () => {
		const result = buildProductFilterConditions({
			color: ["or", "argent"],
		})

		expect(result).toContainEqual({
			skus: {
				some: { isActive: true, color: { slug: { in: ["or", "argent"] } } },
			},
		})
	})

	it("handles single material filter", () => {
		const result = buildProductFilterConditions({ material: "or-18k" })

		expect(result).toContainEqual({
			skus: {
				some: { isActive: true, material: { slug: "or-18k" } },
			},
		})
	})

	it("handles collectionId filter", () => {
		const result = buildProductFilterConditions({
			collectionId: "col-1",
		})

		expect(result).toContainEqual({
			collections: { some: { collectionId: "col-1" } },
		})
	})

	it("handles collectionSlug filter", () => {
		const result = buildProductFilterConditions({
			collectionSlug: "ete-2024",
		})

		expect(result).toContainEqual({
			collections: { some: { collection: { slug: "ete-2024" } } },
		})
	})

	it("handles slugs filter", () => {
		const result = buildProductFilterConditions({
			slugs: ["product-a", "product-b"],
		})

		expect(result).toContainEqual({
			slug: { in: ["product-a", "product-b"] },
		})
	})

	it("handles priceMin filter", () => {
		const result = buildProductFilterConditions({ priceMin: 1000 })

		expect(result).toContainEqual({
			skus: {
				some: { isActive: true, priceInclTax: { gte: 1000 } },
			},
		})
	})

	it("handles priceMax filter", () => {
		const result = buildProductFilterConditions({ priceMax: 5000 })

		expect(result).toContainEqual({
			skus: {
				some: { isActive: true, priceInclTax: { lte: 5000 } },
			},
		})
	})

	it("combines priceMin and priceMax into a single condition", () => {
		const result = buildProductFilterConditions({
			priceMin: 1000,
			priceMax: 5000,
		})

		expect(result).toContainEqual({
			skus: {
				some: {
					isActive: true,
					priceInclTax: { gte: 1000, lte: 5000 },
				},
			},
		})
	})

	it("ignores negative price values", () => {
		const result = buildProductFilterConditions({
			priceMin: -100,
			priceMax: -50,
		})

		// Should not add price conditions for negative values
		const hasPriceCondition = result.some(
			(c) => "skus" in c && JSON.stringify(c).includes("priceInclTax")
		)
		expect(hasPriceCondition).toBe(false)
	})

	it("handles onSale filter", () => {
		const result = buildProductFilterConditions({ onSale: true })

		expect(result).toContainEqual({
			skus: {
				some: {
					isActive: true,
					compareAtPrice: { not: null },
				},
			},
		})
	})

	it("handles in_stock stockStatus filter", () => {
		const result = buildProductFilterConditions({
			stockStatus: "in_stock",
		})

		expect(result).toContainEqual({
			skus: {
				some: {
					isActive: true,
					inventory: { gt: 0 },
				},
			},
		})
	})

	it("handles out_of_stock stockStatus filter", () => {
		const result = buildProductFilterConditions({
			stockStatus: "out_of_stock",
		})

		expect(result).toContainEqual({
			NOT: {
				skus: {
					some: {
						isActive: true,
						inventory: { gt: 0 },
					},
				},
			},
		})
	})

	it("handles ratingMin filter", () => {
		const result = buildProductFilterConditions({ ratingMin: 4 })

		expect(result).toContainEqual({
			reviewStats: {
				averageRating: { gte: 4 },
			},
		})
	})

	it("ignores invalid ratingMin values", () => {
		const resultNegative = buildProductFilterConditions({ ratingMin: -1 })
		const resultTooHigh = buildProductFilterConditions({ ratingMin: 6 })

		expect(resultNegative).toEqual([])
		expect(resultTooHigh).toEqual([])
	})

	it("handles date filters", () => {
		const date = new Date("2024-06-01")
		const result = buildProductFilterConditions({
			createdAfter: date,
		})

		expect(result).toContainEqual({
			createdAt: { gte: date },
		})
	})
})

// ============================================================================
// buildProductWhereClause
// ============================================================================

describe("buildProductWhereClause", () => {
	it("includes notDeleted by default", () => {
		const result = buildProductWhereClause(DEFAULT_PARAMS)

		expect(result.AND).toContainEqual({ deletedAt: null })
	})

	it("skips notDeleted when includeDeleted is true", () => {
		const result = buildProductWhereClause({
			...DEFAULT_PARAMS,
			includeDeleted: true,
		})

		const hasDeletedCondition = (result.AND as Array<Record<string, unknown>>)?.some(
			(c) => "deletedAt" in c
		)
		expect(hasDeletedCondition).toBeFalsy()
	})

	it("includes status filter when provided", () => {
		const result = buildProductWhereClause({
			...DEFAULT_PARAMS,
			status: "PUBLIC",
		})

		expect(result.AND).toContainEqual({ status: "PUBLIC" })
	})

	it("does not include status filter when undefined", () => {
		const result = buildProductWhereClause({
			...DEFAULT_PARAMS,
			status: undefined,
		})

		const hasStatusCondition = (result.AND as Array<Record<string, unknown>>)?.some(
			(c) => "status" in c
		)
		expect(hasStatusCondition).toBeFalsy()
	})

	it("includes fuzzy IDs in WHERE when search result has them", () => {
		const result = buildProductWhereClause(DEFAULT_PARAMS, {
			fuzzyIds: ["id-1", "id-2"],
			exactConditions: [],
		})

		const andConditions = result.AND as Array<Record<string, unknown>>
		const hasIdCondition = andConditions.some(
			(c) => "id" in c
		)
		expect(hasIdCondition).toBe(true)
	})

	it("combines fuzzy IDs and exact conditions with OR", () => {
		const exactCond = { title: { contains: "test" } }
		const result = buildProductWhereClause(DEFAULT_PARAMS, {
			fuzzyIds: ["id-1"],
			exactConditions: [exactCond],
		})

		const andConditions = result.AND as Array<Record<string, unknown>>
		const orCondition = andConditions.find((c) => "OR" in c)
		expect(orCondition).toBeDefined()
	})

	it("uses only exact conditions when no fuzzy IDs", () => {
		const exactCond = { title: { contains: "test" } }
		const result = buildProductWhereClause(DEFAULT_PARAMS, {
			fuzzyIds: null,
			exactConditions: [exactCond],
		})

		expect(result.AND).toContainEqual(exactCond)
	})

	it("applies filter conditions", () => {
		const result = buildProductWhereClause({
			...DEFAULT_PARAMS,
			filters: { color: "or" },
		})

		const andConditions = result.AND as Array<Record<string, unknown>>
		const hasColorCondition = andConditions.some(
			(c) => JSON.stringify(c).includes("or")
		)
		expect(hasColorCondition).toBe(true)
	})

	it("returns empty AND when no conditions", () => {
		const result = buildProductWhereClause({
			perPage: 20,
			sortBy: "created-descending",
			filters: {},
			includeDeleted: true,
		})

		// Only empty AND or no AND
		const andConditions = result.AND as Array<Record<string, unknown>> | undefined
		if (andConditions) {
			expect(andConditions.length).toBe(0)
		} else {
			expect(result.AND).toBeUndefined()
		}
	})
})

// ============================================================================
// buildSearchConditions
// ============================================================================

describe("buildSearchConditions", () => {
	beforeEach(() => {
		vi.resetAllMocks()
	})

	it("returns empty result for empty search", async () => {
		const result = await buildSearchConditions("")

		expect(result).toEqual({ fuzzyIds: null, exactConditions: [] })
	})

	it("returns empty result for whitespace-only search", async () => {
		const result = await buildSearchConditions("   ")

		expect(result).toEqual({ fuzzyIds: null, exactConditions: [] })
	})

	it("uses exact-only search for short terms (< 3 chars)", async () => {
		const result = await buildSearchConditions("ab")

		expect(result.fuzzyIds).toBeNull()
		expect(result.exactConditions.length).toBeGreaterThan(0)
		expect(mockFuzzySearchProductIds).not.toHaveBeenCalled()
	})

	it("calls fuzzy search for terms >= 3 chars", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({
			ids: ["id-1", "id-2"],
			totalCount: 2,
		})

		const result = await buildSearchConditions("bague")

		expect(mockFuzzySearchProductIds).toHaveBeenCalledWith(
			"bague",
			expect.objectContaining({})
		)
		expect(result.fuzzyIds).toEqual(["id-1", "id-2"])
	})

	it("passes status option to fuzzy search", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({
			ids: [],
			totalCount: 0,
		})

		await buildSearchConditions("collier", { status: "PUBLIC" })

		expect(mockFuzzySearchProductIds).toHaveBeenCalledWith(
			"collier",
			expect.objectContaining({ status: "PUBLIC" })
		)
	})

	it("includes exact conditions for related fields alongside fuzzy IDs", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({
			ids: ["id-1"],
			totalCount: 1,
		})

		const result = await buildSearchConditions("bague")

		// Should have both fuzzyIds and exactConditions (for SKU, colors, etc.)
		expect(result.fuzzyIds).toEqual(["id-1"])
		expect(result.exactConditions).toBeDefined()
	})
})

// ============================================================================
// buildExactSearchConditions
// ============================================================================

describe("buildExactSearchConditions", () => {
	it("returns empty result for empty search", () => {
		const result = buildExactSearchConditions("")

		expect(result).toEqual({ fuzzyIds: null, exactConditions: [] })
	})

	it("returns conditions for valid search", () => {
		const result = buildExactSearchConditions("bague")

		expect(result.fuzzyIds).toBeNull()
		expect(result.exactConditions.length).toBeGreaterThan(0)
	})

	it("expands synonyms in exact search", () => {
		const result = buildExactSearchConditions("bague")

		// "bague" should also match "anneau" and "alliance" via synonyms
		const json = JSON.stringify(result.exactConditions)
		expect(json).toContain("anneau")
		expect(json).toContain("alliance")
	})

	it("handles multi-word search with AND logic", () => {
		const result = buildExactSearchConditions("bague or")

		// Each word should generate a separate condition (AND)
		expect(result.exactConditions.length).toBe(2)
	})
})
