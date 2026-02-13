import { describe, expect, it, vi } from "vitest"
import { Prisma } from "@/app/generated/prisma/client"

// Mock fuzzy search to avoid DB dependency
vi.mock("../data/fuzzy-search", () => ({
	fuzzySearchProductIds: vi.fn(),
}))

import {
	buildSearchConditions,
	buildExactSearchConditions,
	buildProductWhereClause,
	buildProductFilterConditions,
} from "./product-query-builder"
import { fuzzySearchProductIds } from "../data/fuzzy-search"
import type { SearchResult } from "../types/product-services.types"
import type { GetProductsParams } from "../types/product.types"

const mockFuzzy = vi.mocked(fuzzySearchProductIds)

// ─── buildExactSearchConditions ──────────────────────────────────

describe("buildExactSearchConditions", () => {
	it("returns empty result for empty string", () => {
		const result = buildExactSearchConditions("")
		expect(result).toEqual({ fuzzyIds: null, exactConditions: [] })
	})

	it("returns empty result for whitespace-only string", () => {
		const result = buildExactSearchConditions("   ")
		expect(result).toEqual({ fuzzyIds: null, exactConditions: [] })
	})

	it("always returns fuzzyIds as null", () => {
		const result = buildExactSearchConditions("collier argent")
		expect(result.fuzzyIds).toBeNull()
	})

	it("returns one AND condition per word", () => {
		const result = buildExactSearchConditions("collier argent")
		expect(result.exactConditions).toHaveLength(2)
	})

	it("each condition has OR across all fields (title, description, skus, collections)", () => {
		const result = buildExactSearchConditions("or")
		expect(result.exactConditions).toHaveLength(1)

		const condition = result.exactConditions[0] as { OR: unknown[] }
		expect(condition.OR).toBeDefined()
		// title + description + skus (sku/color/material) + collections
		expect(condition.OR.length).toBeGreaterThanOrEqual(4)
	})

	it("uses case-insensitive contains for text matching", () => {
		const result = buildExactSearchConditions("bague")
		const condition = result.exactConditions[0] as { OR: Array<Record<string, unknown>> }
		const titleCondition = condition.OR[0] as { title: { contains: string; mode: string } }
		expect(titleCondition.title.contains).toBe("bague")
		expect(titleCondition.title.mode).toBe(Prisma.QueryMode.insensitive)
	})
})

// ─── buildSearchConditions ──────────────────────────────────

describe("buildSearchConditions", () => {
	it("returns empty result for empty string", async () => {
		const result = await buildSearchConditions("")
		expect(result).toEqual({ fuzzyIds: null, exactConditions: [] })
	})

	it("returns empty result for whitespace-only string", async () => {
		const result = await buildSearchConditions("   ")
		expect(result).toEqual({ fuzzyIds: null, exactConditions: [] })
	})

	it("uses exact-only search for short terms (< 3 chars)", async () => {
		const result = await buildSearchConditions("or")
		expect(result.fuzzyIds).toBeNull()
		expect(result.exactConditions.length).toBeGreaterThan(0)
		expect(mockFuzzy).not.toHaveBeenCalled()
	})

	it("short search includes title and description in conditions", async () => {
		const result = await buildSearchConditions("ab")
		const condition = result.exactConditions[0] as { OR: Array<Record<string, unknown>> }
		const hasTitle = condition.OR.some((c: Record<string, unknown>) => "title" in c)
		const hasDescription = condition.OR.some((c: Record<string, unknown>) => "description" in c)
		expect(hasTitle).toBe(true)
		expect(hasDescription).toBe(true)
	})

	it("calls fuzzy search for terms >= 3 chars", async () => {
		mockFuzzy.mockResolvedValue({ ids: ["id-1", "id-2"], totalCount: 2 })
		const result = await buildSearchConditions("collier")
		expect(mockFuzzy).toHaveBeenCalledWith("collier", { status: undefined })
		expect(result.fuzzyIds).toEqual(["id-1", "id-2"])
	})

	it("passes status option to fuzzy search", async () => {
		mockFuzzy.mockResolvedValue({ ids: ["id-1"], totalCount: 1 })
		await buildSearchConditions("collier", { status: "PUBLIC" })
		expect(mockFuzzy).toHaveBeenCalledWith("collier", { status: "PUBLIC" })
	})

	it("returns related-field-only exact conditions when fuzzy is active", async () => {
		mockFuzzy.mockResolvedValue({ ids: ["id-1"], totalCount: 1 })
		const result = await buildSearchConditions("collier")

		// When fuzzy is active, exact conditions should NOT include title/description
		// (those are handled by fuzzy). They should only cover related fields.
		for (const condition of result.exactConditions) {
			const cond = condition as { OR: Array<Record<string, unknown>> }
			const hasTitle = cond.OR?.some((c: Record<string, unknown>) => "title" in c)
			const hasDescription = cond.OR?.some((c: Record<string, unknown>) => "description" in c)
			expect(hasTitle).toBeFalsy()
			expect(hasDescription).toBeFalsy()
		}
	})

	it("returns empty fuzzyIds when fuzzy search finds nothing", async () => {
		mockFuzzy.mockResolvedValue({ ids: [], totalCount: 0 })
		const result = await buildSearchConditions("xyzabc")
		expect(result.fuzzyIds).toEqual([])
	})
})

// ─── buildProductWhereClause ──────────────────────────────────

describe("buildProductWhereClause", () => {
	const baseParams: GetProductsParams = {}

	it("excludes soft-deleted products by default", () => {
		const where = buildProductWhereClause(baseParams)
		expect(where.AND).toBeDefined()
		const conditions = where.AND as Prisma.ProductWhereInput[]
		const hasDeletedAtNull = conditions.some(
			(c) => "deletedAt" in c && c.deletedAt === null
		)
		expect(hasDeletedAtNull).toBe(true)
	})

	it("does not exclude soft-deleted when includeDeleted is true", () => {
		const where = buildProductWhereClause({ includeDeleted: true })
		const conditions = (where.AND ?? []) as Prisma.ProductWhereInput[]
		const hasDeletedAtNull = conditions.some(
			(c) => "deletedAt" in c && c.deletedAt === null
		)
		expect(hasDeletedAtNull).toBe(false)
	})

	it("filters by status when provided", () => {
		const where = buildProductWhereClause({ status: "PUBLIC" })
		const conditions = where.AND as Prisma.ProductWhereInput[]
		const hasStatus = conditions.some(
			(c) => "status" in c && c.status === "PUBLIC"
		)
		expect(hasStatus).toBe(true)
	})

	it("does not add status filter when not provided", () => {
		const where = buildProductWhereClause(baseParams)
		const conditions = where.AND as Prisma.ProductWhereInput[]
		const hasStatus = conditions.some(
			(c) => "status" in c && typeof c.status === "string"
		)
		expect(hasStatus).toBe(false)
	})

	it("adds fuzzy IDs as id IN condition when fuzzy results exist", () => {
		const searchResult: SearchResult = {
			fuzzyIds: ["id-1", "id-2"],
			exactConditions: [],
		}
		const where = buildProductWhereClause(baseParams, searchResult)
		const conditions = where.AND as Prisma.ProductWhereInput[]
		const hasIdIn = conditions.some(
			(c) => "id" in c && (c.id as { in: string[] }).in?.length === 2
		)
		expect(hasIdIn).toBe(true)
	})

	it("combines fuzzy IDs and exact conditions with OR", () => {
		const searchResult: SearchResult = {
			fuzzyIds: ["id-1"],
			exactConditions: [
				{ OR: [{ skus: { some: { sku: { contains: "test", mode: "insensitive" } } } }] },
			],
		}
		const where = buildProductWhereClause(baseParams, searchResult)
		const conditions = where.AND as Prisma.ProductWhereInput[]
		const hasOr = conditions.some((c) => "OR" in c)
		expect(hasOr).toBe(true)
	})

	it("uses only exact conditions when fuzzy returns empty IDs", () => {
		const searchResult: SearchResult = {
			fuzzyIds: [],
			exactConditions: [
				{ OR: [{ skus: { some: { sku: { contains: "test", mode: "insensitive" } } } }] },
			],
		}
		const where = buildProductWhereClause(baseParams, searchResult)
		const conditions = where.AND as Prisma.ProductWhereInput[]
		// Should push exactConditions directly, not wrap in OR
		const hasOr = conditions.some((c) => "OR" in c)
		expect(hasOr).toBe(true) // The exact conditions themselves have OR
	})

	it("uses only exact conditions when fuzzyIds is null", () => {
		const searchResult: SearchResult = {
			fuzzyIds: null,
			exactConditions: [
				{
					OR: [
						{ title: { contains: "ab", mode: "insensitive" } },
						{ description: { contains: "ab", mode: "insensitive" } },
					],
				},
			],
		}
		const where = buildProductWhereClause(baseParams, searchResult)
		const conditions = where.AND as Prisma.ProductWhereInput[]
		// No id: { in: [...] } condition
		const hasIdIn = conditions.some((c) => "id" in c)
		expect(hasIdIn).toBe(false)
	})

	it("handles no search result (no search applied)", () => {
		const where = buildProductWhereClause(baseParams)
		const conditions = where.AND as Prisma.ProductWhereInput[]
		// Only the notDeleted condition
		expect(conditions).toHaveLength(1)
	})

	it("returns empty AND when no conditions at all", () => {
		const where = buildProductWhereClause({ includeDeleted: true })
		expect(where.AND).toBeUndefined()
	})
})

// ─── buildProductFilterConditions ──────────────────────────────

describe("buildProductFilterConditions", () => {
	it("returns empty array for empty filters", () => {
		expect(buildProductFilterConditions({})).toEqual([])
	})

	it("returns empty array for undefined filters", () => {
		expect(buildProductFilterConditions(undefined as never)).toEqual([])
	})

	it("adds status filter for single status", () => {
		const conditions = buildProductFilterConditions({ status: "PUBLIC" })
		expect(conditions).toHaveLength(1)
		expect(conditions[0]).toEqual({ status: "PUBLIC" })
	})

	it("adds status IN filter for multiple statuses", () => {
		const conditions = buildProductFilterConditions({ status: ["PUBLIC", "DRAFT"] })
		expect(conditions).toHaveLength(1)
		expect(conditions[0]).toEqual({ status: { in: ["PUBLIC", "DRAFT"] } })
	})

	it("adds type filter by slug", () => {
		const conditions = buildProductFilterConditions({ type: "collier" })
		expect(conditions).toHaveLength(1)
		expect(conditions[0]).toEqual({ type: { slug: "collier" } })
	})

	it("adds color filter on active SKUs", () => {
		const conditions = buildProductFilterConditions({ color: "or-rose" })
		expect(conditions).toHaveLength(1)
		const cond = conditions[0] as { skus: { some: { isActive: boolean; color: { slug: string } } } }
		expect(cond.skus.some.isActive).toBe(true)
		expect(cond.skus.some.color.slug).toBe("or-rose")
	})

	it("adds material filter on active SKUs", () => {
		const conditions = buildProductFilterConditions({ material: "argent" })
		expect(conditions).toHaveLength(1)
		const cond = conditions[0] as { skus: { some: { isActive: boolean; material: { slug: string } } } }
		expect(cond.skus.some.isActive).toBe(true)
		expect(cond.skus.some.material.slug).toBe("argent")
	})

	it("adds collection filter by ID", () => {
		const conditions = buildProductFilterConditions({ collectionId: "col-1" })
		expect(conditions).toHaveLength(1)
		expect(conditions[0]).toEqual({
			collections: { some: { collectionId: "col-1" } },
		})
	})

	it("adds collection filter by slug", () => {
		const conditions = buildProductFilterConditions({ collectionSlug: "ete-2025" })
		expect(conditions).toHaveLength(1)
		expect(conditions[0]).toEqual({
			collections: { some: { collection: { slug: "ete-2025" } } },
		})
	})

	it("adds slugs filter", () => {
		const conditions = buildProductFilterConditions({ slugs: ["a", "b"] })
		expect(conditions).toHaveLength(1)
		expect(conditions[0]).toEqual({ slug: { in: ["a", "b"] } })
	})

	it("ignores empty slugs array", () => {
		const conditions = buildProductFilterConditions({ slugs: [] })
		expect(conditions).toHaveLength(0)
	})

	it("adds price min filter on active SKUs", () => {
		const conditions = buildProductFilterConditions({ priceMin: 1000 })
		expect(conditions).toHaveLength(1)
		const cond = conditions[0] as { skus: { some: { isActive: boolean; priceInclTax: { gte: number } } } }
		expect(cond.skus.some.priceInclTax.gte).toBe(1000)
	})

	it("adds price max filter on active SKUs", () => {
		const conditions = buildProductFilterConditions({ priceMax: 5000 })
		expect(conditions).toHaveLength(1)
		const cond = conditions[0] as { skus: { some: { isActive: boolean; priceInclTax: { lte: number } } } }
		expect(cond.skus.some.priceInclTax.lte).toBe(5000)
	})

	it("combines price min and max in single condition", () => {
		const conditions = buildProductFilterConditions({ priceMin: 1000, priceMax: 5000 })
		expect(conditions).toHaveLength(1)
		const cond = conditions[0] as { skus: { some: { priceInclTax: { gte: number; lte: number } } } }
		expect(cond.skus.some.priceInclTax.gte).toBe(1000)
		expect(cond.skus.some.priceInclTax.lte).toBe(5000)
	})

	it("ignores negative prices", () => {
		const conditions = buildProductFilterConditions({ priceMin: -100 })
		expect(conditions).toHaveLength(0)
	})

	it("adds onSale filter", () => {
		const conditions = buildProductFilterConditions({ onSale: true })
		expect(conditions).toHaveLength(1)
		const cond = conditions[0] as { skus: { some: { isActive: boolean; compareAtPrice: { not: null } } } }
		expect(cond.skus.some.isActive).toBe(true)
		expect(cond.skus.some.compareAtPrice).toEqual({ not: null })
	})

	it("adds in_stock filter", () => {
		const conditions = buildProductFilterConditions({ stockStatus: "in_stock" })
		expect(conditions).toHaveLength(1)
		const cond = conditions[0] as { skus: { some: { isActive: boolean; inventory: { gt: number } } } }
		expect(cond.skus.some.inventory.gt).toBe(0)
	})

	it("adds out_of_stock filter with NOT", () => {
		const conditions = buildProductFilterConditions({ stockStatus: "out_of_stock" })
		expect(conditions).toHaveLength(1)
		expect(conditions[0]).toHaveProperty("NOT")
	})

	it("adds ratingMin filter", () => {
		const conditions = buildProductFilterConditions({ ratingMin: 4 })
		expect(conditions).toHaveLength(1)
		expect(conditions[0]).toEqual({
			reviewStats: { averageRating: { gte: 4 } },
		})
	})

	it("ignores ratingMin out of bounds", () => {
		expect(buildProductFilterConditions({ ratingMin: -1 })).toHaveLength(0)
		expect(buildProductFilterConditions({ ratingMin: 6 })).toHaveLength(0)
	})

	it("adds date filters", () => {
		const date = new Date("2025-06-01")
		const conditions = buildProductFilterConditions({ createdAfter: date })
		expect(conditions).toHaveLength(1)
		expect(conditions[0]).toEqual({ createdAt: { gte: date } })
	})

	it("combines multiple filters", () => {
		const conditions = buildProductFilterConditions({
			status: "PUBLIC",
			type: "bague",
			priceMin: 1000,
			onSale: true,
		})
		expect(conditions).toHaveLength(4)
	})
})
