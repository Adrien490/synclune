import { describe, it, expect, vi } from "vitest";

vi.mock("@/shared/utils/sort-direction", () => ({
	getSortDirection: (sortBy: string): "asc" | "desc" => {
		if (sortBy.endsWith("-ascending")) return "asc";
		if (sortBy.endsWith("-descending")) return "desc";
		return "desc";
	},
}));

import {
	sortProducts,
	orderByIds,
	sortByCreatedAtDesc,
} from "./product-list-sorting.service";
import type { Product } from "../types/product.types";

// Minimal product factory for tests
function makeProduct(overrides: Partial<Product> & { id: string; title: string }): Product {
	return {
		slug: overrides.id,
		description: null,
		status: "PUBLIC",
		createdAt: new Date("2025-01-01"),
		updatedAt: new Date("2025-01-01"),
		type: null,
		reviewStats: null,
		skus: [],
		_count: { skus: 0 },
		collections: [],
		...overrides,
	} as Product;
}

describe("sortProducts", () => {
	const products = [
		makeProduct({
			id: "p1",
			title: "Collier Lune",
			createdAt: new Date("2025-01-10"),
			updatedAt: new Date("2025-02-01"),
			skus: [{ isActive: true, priceInclTax: 3500 }] as Product["skus"],
			reviewStats: { averageRating: 4.5, totalCount: 10 } as unknown as Product["reviewStats"],
		}),
		makeProduct({
			id: "p2",
			title: "Bague Soleil",
			createdAt: new Date("2025-01-20"),
			updatedAt: new Date("2025-01-15"),
			skus: [{ isActive: true, priceInclTax: 1500 }] as Product["skus"],
			reviewStats: { averageRating: 4.8, totalCount: 5 } as unknown as Product["reviewStats"],
		}),
		makeProduct({
			id: "p3",
			title: "Anneau Etoile",
			createdAt: new Date("2025-01-05"),
			updatedAt: new Date("2025-03-01"),
			skus: [{ isActive: true, priceInclTax: 2500 }] as Product["skus"],
			reviewStats: { averageRating: 4.5, totalCount: 20 } as unknown as Product["reviewStats"],
		}),
	];

	it("should sort by title ascending", () => {
		const sorted = sortProducts(products, "title-ascending");
		expect(sorted.map((p) => p.title)).toEqual([
			"Anneau Etoile",
			"Bague Soleil",
			"Collier Lune",
		]);
	});

	it("should sort by title descending", () => {
		const sorted = sortProducts(products, "title-descending");
		expect(sorted.map((p) => p.title)).toEqual([
			"Collier Lune",
			"Bague Soleil",
			"Anneau Etoile",
		]);
	});

	it("should sort by price ascending", () => {
		const sorted = sortProducts(products, "price-ascending");
		expect(sorted.map((p) => p.id)).toEqual(["p2", "p3", "p1"]);
	});

	it("should sort by price descending", () => {
		const sorted = sortProducts(products, "price-descending");
		expect(sorted.map((p) => p.id)).toEqual(["p1", "p3", "p2"]);
	});

	it("should sort by creation date ascending", () => {
		const sorted = sortProducts(products, "created-ascending");
		expect(sorted.map((p) => p.id)).toEqual(["p3", "p1", "p2"]);
	});

	it("should sort by creation date descending", () => {
		const sorted = sortProducts(products, "created-descending");
		expect(sorted.map((p) => p.id)).toEqual(["p2", "p1", "p3"]);
	});

	it("should sort by rating descending with tiebreaker on totalCount", () => {
		const sorted = sortProducts(products, "rating-descending");
		// p2 (4.8) > p3 (4.5, 20 reviews) > p1 (4.5, 10 reviews)
		expect(sorted.map((p) => p.id)).toEqual(["p2", "p3", "p1"]);
	});

	it("should sort by updatedAt (admin)", () => {
		const sorted = sortProducts(products, "updatedAt");
		// Most recent updatedAt first: p3 (Mar) > p1 (Feb) > p2 (Jan)
		expect(sorted.map((p) => p.id)).toEqual(["p3", "p1", "p2"]);
	});

	it("should sort by title (admin, ascending)", () => {
		const sorted = sortProducts(products, "title");
		expect(sorted.map((p) => p.title)).toEqual([
			"Anneau Etoile",
			"Bague Soleil",
			"Collier Lune",
		]);
	});

	it("should sort by type (admin)", () => {
		const withTypes = [
			makeProduct({ id: "p1", title: "A", type: { id: "t1", slug: "bague", label: "Bague", isActive: true } }),
			makeProduct({ id: "p2", title: "B", type: { id: "t2", slug: "collier", label: "Collier", isActive: true } }),
			makeProduct({ id: "p3", title: "C", type: null }),
		];
		const sorted = sortProducts(withTypes, "type");
		// Empty type ("") first, then Bague, Collier
		expect(sorted.map((p) => p.id)).toEqual(["p3", "p1", "p2"]);
	});

	it("should default to newest first for unknown sort", () => {
		const sorted = sortProducts(products, "unknown-sort");
		expect(sorted.map((p) => p.id)).toEqual(["p2", "p1", "p3"]);
	});

	it("should not mutate the original array", () => {
		const original = [...products];
		sortProducts(products, "title-ascending");
		expect(products.map((p) => p.id)).toEqual(original.map((p) => p.id));
	});
});

describe("orderByIds", () => {
	const items = [
		{ id: "a", name: "A" },
		{ id: "b", name: "B" },
		{ id: "c", name: "C" },
	];

	it("should preserve the order of given IDs", () => {
		const sorted = orderByIds(items, ["c", "a", "b"]);
		expect(sorted.map((i) => i.id)).toEqual(["c", "a", "b"]);
	});

	it("should place items not in the ordered list after ordered items", () => {
		const sorted = orderByIds(items, ["b"]);
		expect(sorted[0].id).toBe("b");
		// a and c come after, stable order preserved
	});

	it("should use fallback sort for items not in ordered list", () => {
		const sorted = orderByIds(items, ["b"], (a, b) => b.name.localeCompare(a.name));
		expect(sorted[0].id).toBe("b");
		// Remaining: c, a (reversed alphabetical)
		expect(sorted[1].id).toBe("c");
		expect(sorted[2].id).toBe("a");
	});

	it("should handle empty ordered IDs", () => {
		const sorted = orderByIds(items, []);
		// No ordering constraint, fallback undefined => stable
		expect(sorted).toHaveLength(3);
	});

	it("should not mutate the original array", () => {
		const original = [...items];
		orderByIds(items, ["c", "a"]);
		expect(items.map((i) => i.id)).toEqual(original.map((i) => i.id));
	});
});

describe("sortByCreatedAtDesc", () => {
	it("should sort by creation date descending", () => {
		const items = [
			{ createdAt: new Date("2025-01-01") },
			{ createdAt: new Date("2025-03-01") },
			{ createdAt: new Date("2025-02-01") },
		];
		const sorted = [...items].sort(sortByCreatedAtDesc);
		expect(sorted[0].createdAt).toEqual(new Date("2025-03-01"));
		expect(sorted[1].createdAt).toEqual(new Date("2025-02-01"));
		expect(sorted[2].createdAt).toEqual(new Date("2025-01-01"));
	});

	it("should handle string dates", () => {
		const items = [
			{ createdAt: "2025-06-01" },
			{ createdAt: "2025-01-01" },
		];
		const sorted = [...items].sort(sortByCreatedAtDesc);
		expect(sorted[0].createdAt).toBe("2025-06-01");
	});
});
