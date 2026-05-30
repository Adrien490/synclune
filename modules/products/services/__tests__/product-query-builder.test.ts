import { describe, it, expect, vi } from "vitest";

// Mocks des dépendances lourdes : on teste uniquement `buildProductFilterConditions`
// (fonction pure synchrone), pas la recherche fuzzy ni l'accès DB.
vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: { QueryMode: { insensitive: "insensitive" } },
}));
vi.mock("@/shared/lib/prisma", () => ({
	notDeleted: { deletedAt: null },
}));
vi.mock("../../data/fuzzy-search", () => ({
	fuzzySearchProductIds: vi.fn(),
}));
vi.mock("../../constants/product.constants", () => ({
	LOW_STOCK_THRESHOLD: 3,
}));
vi.mock("../../constants/search.constants", () => ({
	FUZZY_MIN_LENGTH: 3,
}));
vi.mock("../../constants/search-synonyms", () => ({
	SEARCH_SYNONYMS: new Map(),
}));
vi.mock("../../utils/search-helpers", () => ({
	splitSearchTerms: (s: string) => s.split(/\s+/).filter(Boolean),
}));

import type { ProductFilters } from "../../types/product.types";
import { buildProductFilterConditions } from "../product-query-builder";

const findSkuSome = (conditions: ReturnType<typeof buildProductFilterConditions>) =>
	conditions
		.map((c) => (c as { skus?: { some?: Record<string, unknown> } }).skus?.some)
		.filter(Boolean) as Array<Record<string, unknown>>;

describe("buildProductFilterConditions", () => {
	it("returns no conditions for empty filters", () => {
		expect(buildProductFilterConditions({} as ProductFilters)).toEqual([]);
	});

	// ========================================================================
	// S1 — couleur + matériau + prix fusionnés dans UNE seule variante
	// ========================================================================
	describe("@regression product-filter-single-variant — color+material+price merged", () => {
		it("merges color, material and price into a single skus.some (same variant)", () => {
			const conditions = buildProductFilterConditions({
				color: "or",
				material: "argent",
				priceMin: 1000,
				priceMax: 5000,
			} as ProductFilters);

			const skuSomes = findSkuSome(conditions);
			// Une seule contrainte variante, pas trois `some` séparés.
			expect(skuSomes).toHaveLength(1);
			expect(skuSomes[0]).toEqual({
				isActive: true,
				colors: { some: { color: { slug: "or" } } },
				materials: { some: { material: { slug: "argent" } } },
				priceInclTax: { gte: 1000, lte: 5000 },
			});
		});

		it("supports multi-value color (any-of) within the single variant", () => {
			const conditions = buildProductFilterConditions({
				color: ["or", "argent"],
				priceMax: 5000,
			} as ProductFilters);

			const skuSomes = findSkuSome(conditions);
			expect(skuSomes).toHaveLength(1);
			expect(skuSomes[0]).toEqual({
				isActive: true,
				colors: { some: { color: { slug: { in: ["or", "argent"] } } } },
				priceInclTax: { lte: 5000 },
			});
		});

		it("emits priceMin-only range", () => {
			const conditions = buildProductFilterConditions({ priceMin: 2000 } as ProductFilters);
			const skuSomes = findSkuSome(conditions);
			expect(skuSomes).toHaveLength(1);
			expect(skuSomes[0]).toEqual({ isActive: true, priceInclTax: { gte: 2000 } });
		});

		it("does not emit a variant constraint when none of color/material/price set", () => {
			const conditions = buildProductFilterConditions({ type: "bagues" } as ProductFilters);
			expect(findSkuSome(conditions)).toHaveLength(0);
		});
	});

	// ========================================================================
	// Stock status (gap-free, sémantique > 0)
	// ========================================================================
	describe("stock status", () => {
		it("in_stock → at least one active SKU with inventory > 0", () => {
			const [cond] = buildProductFilterConditions({ stockStatus: "in_stock" } as ProductFilters);
			expect(cond).toEqual({ skus: { some: { isActive: true, inventory: { gt: 0 } } } });
		});

		it("low_stock → 0 < inventory <= LOW", () => {
			const [cond] = buildProductFilterConditions({ stockStatus: "low_stock" } as ProductFilters);
			expect(cond).toEqual({ skus: { some: { isActive: true, inventory: { gt: 0, lte: 3 } } } });
		});

		it("out_of_stock → NOT some active SKU with inventory > 0", () => {
			const [cond] = buildProductFilterConditions({
				stockStatus: "out_of_stock",
			} as ProductFilters);
			expect(cond).toEqual({
				NOT: { skus: { some: { isActive: true, inventory: { gt: 0 } } } },
			});
		});
	});

	// ========================================================================
	// Filtres niveau produit (restent séparés)
	// ========================================================================
	it("filters by single type slug", () => {
		const [cond] = buildProductFilterConditions({ type: "colliers" } as ProductFilters);
		expect(cond).toEqual({ type: { slug: "colliers" } });
	});

	it("filters by multiple statuses", () => {
		const [cond] = buildProductFilterConditions({
			status: ["PUBLIC", "DRAFT"],
		} as ProductFilters);
		expect(cond).toEqual({ status: { in: ["PUBLIC", "DRAFT"] } });
	});

	it("filters onSale via compareAtPrice (separate from the merged variant)", () => {
		const conditions = buildProductFilterConditions({ onSale: true } as ProductFilters);
		expect(conditions).toContainEqual({
			skus: { some: { isActive: true, compareAtPrice: { not: null } } },
		});
	});
});
