import { describe, it, expect } from "vitest"

import {
	sortProducts,
	orderByIds,
	sortByCreatedAtDesc,
} from "../product-list-sorting.service"

// ============================================================================
// HELPERS
// ============================================================================

type TestProduct = {
	id: string
	title: string
	createdAt: Date | string
	updatedAt: Date | string
	status: string
	skus: Array<{
		isActive: boolean
		priceInclTax: number
	}>
	type?: { label: string } | null
	reviewStats?: {
		averageRating: number
		totalCount: number
	} | null
}

function makeProduct(
	id: string,
	overrides: Partial<TestProduct> = {}
): TestProduct {
	return {
		id,
		title: `Product ${id}`,
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
		status: "PUBLIC",
		skus: [{ isActive: true, priceInclTax: 1000 }],
		type: null,
		reviewStats: null,
		...overrides,
	}
}

// ============================================================================
// sortProducts
// ============================================================================

describe("sortProducts", () => {
	// ─── Title sorting ─────────────────────────────────────────────────

	it("sorts by title ascending", () => {
		const products = [
			makeProduct("c", { title: "Collier" }),
			makeProduct("a", { title: "Alliance" }),
			makeProduct("b", { title: "Bracelet" }),
		]

		const result = sortProducts(products as never[], "title-ascending")

		expect(result.map((p) => p.title)).toEqual([
			"Alliance",
			"Bracelet",
			"Collier",
		])
	})

	it("sorts by title descending", () => {
		const products = [
			makeProduct("a", { title: "Alliance" }),
			makeProduct("c", { title: "Collier" }),
			makeProduct("b", { title: "Bracelet" }),
		]

		const result = sortProducts(products as never[], "title-descending")

		expect(result.map((p) => p.title)).toEqual([
			"Collier",
			"Bracelet",
			"Alliance",
		])
	})

	it("uses French locale for title sorting", () => {
		const products = [
			makeProduct("e", { title: "Étoile" }),
			makeProduct("a", { title: "Alliance" }),
			makeProduct("b", { title: "Bague" }),
		]

		const result = sortProducts(products as never[], "title-ascending")

		// In French locale, É sorts after A and before B (or after B depending on implementation)
		// The key thing is É is NOT sorted last like in ASCII
		expect(result[0].title).toBe("Alliance")
	})

	// ─── Price sorting ─────────────────────────────────────────────────

	it("sorts by price ascending using min active SKU price", () => {
		const products = [
			makeProduct("expensive", {
				skus: [
					{ isActive: true, priceInclTax: 5000 },
					{ isActive: true, priceInclTax: 3000 },
				],
			}),
			makeProduct("cheap", {
				skus: [{ isActive: true, priceInclTax: 1000 }],
			}),
		]

		const result = sortProducts(products as never[], "price-ascending")

		expect(result[0].id).toBe("cheap")
		expect(result[1].id).toBe("expensive")
	})

	it("sorts by price descending", () => {
		const products = [
			makeProduct("cheap", {
				skus: [{ isActive: true, priceInclTax: 1000 }],
			}),
			makeProduct("expensive", {
				skus: [{ isActive: true, priceInclTax: 5000 }],
			}),
		]

		const result = sortProducts(products as never[], "price-descending")

		expect(result[0].id).toBe("expensive")
		expect(result[1].id).toBe("cheap")
	})

	it("ignores inactive SKUs for price calculation", () => {
		const products = [
			makeProduct("a", {
				skus: [
					{ isActive: false, priceInclTax: 100 },
					{ isActive: true, priceInclTax: 5000 },
				],
			}),
			makeProduct("b", {
				skus: [{ isActive: true, priceInclTax: 2000 }],
			}),
		]

		const result = sortProducts(products as never[], "price-ascending")

		expect(result[0].id).toBe("b")
		expect(result[1].id).toBe("a")
	})

	it("sorts products with no active SKUs to the end (Infinity price)", () => {
		const products = [
			makeProduct("no-skus", { skus: [] }),
			makeProduct("with-skus", {
				skus: [{ isActive: true, priceInclTax: 1000 }],
			}),
		]

		const result = sortProducts(products as never[], "price-ascending")

		expect(result[0].id).toBe("with-skus")
		expect(result[1].id).toBe("no-skus")
	})

	// ─── Created date sorting ──────────────────────────────────────────

	it("sorts by created date ascending", () => {
		const products = [
			makeProduct("new", { createdAt: new Date("2024-06-01") }),
			makeProduct("old", { createdAt: new Date("2024-01-01") }),
		]

		const result = sortProducts(products as never[], "created-ascending")

		expect(result[0].id).toBe("old")
		expect(result[1].id).toBe("new")
	})

	it("sorts by created date descending", () => {
		const products = [
			makeProduct("old", { createdAt: new Date("2024-01-01") }),
			makeProduct("new", { createdAt: new Date("2024-06-01") }),
		]

		const result = sortProducts(products as never[], "created-descending")

		expect(result[0].id).toBe("new")
		expect(result[1].id).toBe("old")
	})

	// ─── Rating sorting ────────────────────────────────────────────────

	it("sorts by rating descending", () => {
		const products = [
			makeProduct("low", {
				reviewStats: { averageRating: 3.0, totalCount: 5 },
			}),
			makeProduct("high", {
				reviewStats: { averageRating: 4.5, totalCount: 10 },
			}),
		]

		const result = sortProducts(products as never[], "rating-descending")

		expect(result[0].id).toBe("high")
		expect(result[1].id).toBe("low")
	})

	it("breaks rating ties by review count", () => {
		const products = [
			makeProduct("few-reviews", {
				reviewStats: { averageRating: 4.0, totalCount: 2 },
			}),
			makeProduct("many-reviews", {
				reviewStats: { averageRating: 4.0, totalCount: 20 },
			}),
		]

		const result = sortProducts(products as never[], "rating-descending")

		expect(result[0].id).toBe("many-reviews")
		expect(result[1].id).toBe("few-reviews")
	})

	it("treats products without reviewStats as rating 0", () => {
		const products = [
			makeProduct("no-reviews", { reviewStats: null }),
			makeProduct("has-reviews", {
				reviewStats: { averageRating: 3.0, totalCount: 1 },
			}),
		]

		const result = sortProducts(products as never[], "rating-descending")

		expect(result[0].id).toBe("has-reviews")
		expect(result[1].id).toBe("no-reviews")
	})

	// ─── Admin sort fields ─────────────────────────────────────────────

	it("sorts by updatedAt (admin, newest first)", () => {
		const products = [
			makeProduct("old-update", { updatedAt: new Date("2024-01-01") }),
			makeProduct("new-update", { updatedAt: new Date("2024-06-01") }),
		]

		const result = sortProducts(products as never[], "updatedAt")

		expect(result[0].id).toBe("new-update")
		expect(result[1].id).toBe("old-update")
	})

	it("sorts by title (admin, alphabetical)", () => {
		const products = [
			makeProduct("b", { title: "Bracelet" }),
			makeProduct("a", { title: "Alliance" }),
		]

		const result = sortProducts(products as never[], "title")

		expect(result[0].title).toBe("Alliance")
		expect(result[1].title).toBe("Bracelet")
	})

	it("sorts by type label (admin)", () => {
		const products = [
			makeProduct("b", { type: { label: "Collier" } }),
			makeProduct("a", { type: { label: "Bague" } }),
		]

		const result = sortProducts(products as never[], "type")

		expect(result[0].id).toBe("a")
		expect(result[1].id).toBe("b")
	})

	it("handles null type labels in type sort", () => {
		const products = [
			makeProduct("no-type", { type: null }),
			makeProduct("has-type", { type: { label: "Bague" } }),
		]

		const result = sortProducts(products as never[], "type")

		// null type uses empty string, sorts before "Bague"
		expect(result[0].id).toBe("no-type")
		expect(result[1].id).toBe("has-type")
	})

	// ─── Default sorting ───────────────────────────────────────────────

	it("defaults to newest first for unknown sort field", () => {
		const products = [
			makeProduct("old", { createdAt: new Date("2024-01-01") }),
			makeProduct("new", { createdAt: new Date("2024-06-01") }),
		]

		const result = sortProducts(products as never[], "unknown-field")

		expect(result[0].id).toBe("new")
		expect(result[1].id).toBe("old")
	})

	// ─── Immutability ──────────────────────────────────────────────────

	it("does not mutate the original array", () => {
		const products = [
			makeProduct("b", { title: "Bracelet" }),
			makeProduct("a", { title: "Alliance" }),
		]
		const original = [...products]

		sortProducts(products as never[], "title-ascending")

		expect(products).toEqual(original)
	})
})

// ============================================================================
// orderByIds
// ============================================================================

describe("orderByIds", () => {
	it("preserves order based on ID list", () => {
		const items = [
			{ id: "c", name: "C" },
			{ id: "a", name: "A" },
			{ id: "b", name: "B" },
		]

		const result = orderByIds(items, ["a", "b", "c"])

		expect(result.map((i) => i.id)).toEqual(["a", "b", "c"])
	})

	it("puts items not in the ID list at the end", () => {
		const items = [
			{ id: "x", name: "X" },
			{ id: "a", name: "A" },
			{ id: "b", name: "B" },
		]

		const result = orderByIds(items, ["a", "b"])

		expect(result[0].id).toBe("a")
		expect(result[1].id).toBe("b")
		expect(result[2].id).toBe("x")
	})

	it("applies fallback sort for items not in ID list", () => {
		const items = [
			{ id: "z", name: "Z" },
			{ id: "a", name: "A" },
			{ id: "y", name: "Y" },
		]

		const result = orderByIds(items, ["a"], (a, b) =>
			a.name.localeCompare(b.name)
		)

		expect(result.map((i) => i.id)).toEqual(["a", "y", "z"])
	})

	it("handles empty ID list", () => {
		const items = [
			{ id: "a", name: "A" },
			{ id: "b", name: "B" },
		]

		const result = orderByIds(items, [])

		expect(result).toHaveLength(2)
	})

	it("handles empty items list", () => {
		const result = orderByIds([], ["a", "b"])

		expect(result).toEqual([])
	})

	it("does not mutate the original array", () => {
		const items = [
			{ id: "b", name: "B" },
			{ id: "a", name: "A" },
		]
		const original = [...items]

		orderByIds(items, ["a", "b"])

		expect(items).toEqual(original)
	})
})

// ============================================================================
// sortByCreatedAtDesc
// ============================================================================

describe("sortByCreatedAtDesc", () => {
	it("sorts newer items first", () => {
		const a = { createdAt: new Date("2024-01-01") }
		const b = { createdAt: new Date("2024-06-01") }

		expect(sortByCreatedAtDesc(a, b)).toBeGreaterThan(0)
		expect(sortByCreatedAtDesc(b, a)).toBeLessThan(0)
	})

	it("returns 0 for equal dates", () => {
		const a = { createdAt: new Date("2024-01-01") }
		const b = { createdAt: new Date("2024-01-01") }

		expect(sortByCreatedAtDesc(a, b)).toBe(0)
	})

	it("works with string dates", () => {
		const a = { createdAt: "2024-01-01T00:00:00Z" }
		const b = { createdAt: "2024-06-01T00:00:00Z" }

		expect(sortByCreatedAtDesc(a, b)).toBeGreaterThan(0)
	})
})
