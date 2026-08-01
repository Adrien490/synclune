import { describe, expect, it, vi, beforeEach } from "vitest";

// ──��� Mocks (hoisted to avoid reference errors) ──────────────────

const {
	mockFuzzySearchProductIds,
	mockGetSpellSuggestion,
	mockPrismaFindMany,
	mockPrismaCount,
	mockBuildRelatedFieldsSearchConditions,
} = vi.hoisted(() => ({
	mockFuzzySearchProductIds: vi.fn(),
	mockGetSpellSuggestion: vi.fn(),
	mockPrismaFindMany: vi.fn(),
	mockPrismaCount: vi.fn(),
	mockBuildRelatedFieldsSearchConditions: vi.fn(),
}));

vi.mock("../fuzzy-search", () => ({
	fuzzySearchProductIds: mockFuzzySearchProductIds,
}));

vi.mock("../spell-suggestion", () => ({
	getSpellSuggestion: mockGetSpellSuggestion,
	SUGGESTION_THRESHOLD_RESULTS: 3,
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		product: { findMany: mockPrismaFindMany, count: mockPrismaCount },
	},
	notDeleted: { deletedAt: null },
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("../../constants/product.constants", () => ({
	QUICK_SEARCH_SELECT: { id: true, slug: true, title: true },
}));

vi.mock("../../services/product-query-builder", () => ({
	buildRelatedFieldsSearchConditions: mockBuildRelatedFieldsSearchConditions,
}));

vi.mock("../../utils/search-helpers", () => ({
	splitSearchTerms: vi.fn((term: string) => {
		const trimmed = term.trim();
		if (!trimmed) return [];
		return trimmed.split(/\s+/).filter(Boolean).slice(0, 5);
	}),
}));

import { quickSearchProducts, type QuickSearchSuccess } from "../quick-search-products";

function asSuccess(result: Awaited<ReturnType<typeof quickSearchProducts>>): QuickSearchSuccess {
	if (result.kind !== "success") throw new Error(`Expected success result, got: ${result.kind}`);
	return result;
}

// ─── Helpers ──────────────────────────────────────────────────────

function makeProduct(id: string) {
	return {
		id,
		slug: `product-${id}`,
		title: `Product ${id}`,
		skus: [],
	};
}

// ─── Tests ──────────────────────────────────────────────────────

describe("quickSearchProducts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFuzzySearchProductIds.mockResolvedValue({ ids: [], totalCount: 0 });
		mockGetSpellSuggestion.mockResolvedValue(null);
		mockPrismaFindMany.mockResolvedValue([]);
		mockPrismaCount.mockResolvedValue(0);
		mockBuildRelatedFieldsSearchConditions.mockReturnValue([
			{ type: { OR: [{ label: { contains: "test" } }] } },
		]);
	});

	// ─── Input validation ──────────────────────────────────────

	it("returns empty result for empty string", async () => {
		const result = await quickSearchProducts("");
		expect(result).toEqual({ kind: "success", products: [], suggestion: null, totalCount: 0 });
		expect(mockFuzzySearchProductIds).not.toHaveBeenCalled();
	});

	it("returns empty result for whitespace-only string", async () => {
		const result = await quickSearchProducts("   ");
		expect(result).toEqual({ kind: "success", products: [], suggestion: null, totalCount: 0 });
	});

	it("returns empty result for single character", async () => {
		const result = await quickSearchProducts("a");
		expect(result).toEqual({ kind: "success", products: [], suggestion: null, totalCount: 0 });
	});

	// ─── Fuzzy search integration ──────────────────────────────

	it("calls fuzzySearchProductIds with correct params", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({ ids: [], totalCount: 0 });

		await quickSearchProducts("collier");

		expect(mockFuzzySearchProductIds).toHaveBeenCalledWith("collier", {
			limit: 6,
			status: "PUBLIC",
		});
	});

	it("fetches products by IDs from fuzzy results", async () => {
		const products = [makeProduct("id-1"), makeProduct("id-2")];
		mockFuzzySearchProductIds.mockResolvedValue({
			ids: ["id-1", "id-2"],
			totalCount: 2,
		});
		// First call: exact-match IDs, second call: full products
		mockPrismaFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce(products);

		const result = await quickSearchProducts("collier");

		// The full product fetch should include both fuzzy IDs
		const fullProductCall = mockPrismaFindMany.mock.calls.find((call) =>
			call[0]?.where?.id?.in?.includes("id-1"),
		);
		expect(fullProductCall).toBeDefined();
		expect(asSuccess(result).products).toHaveLength(2);
		expect(asSuccess(result).totalCount).toBe(2);
	});

	it("preserves relevance ordering from fuzzy search", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({
			ids: ["id-2", "id-1", "id-3"],
			totalCount: 3,
		});
		// First call: exact-match IDs, second call: full products (in different order)
		mockPrismaFindMany
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([makeProduct("id-1"), makeProduct("id-3"), makeProduct("id-2")]);

		const result = await quickSearchProducts("collier");

		expect(asSuccess(result).products.map((p) => p.id)).toEqual(["id-2", "id-1", "id-3"]);
	});

	it("does not call prisma.findMany for full products when no IDs found from either search", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({ ids: [], totalCount: 0 });
		// Exact search also returns nothing
		mockPrismaFindMany.mockResolvedValue([]);

		await quickSearchProducts("xyznonexistent");

		// First call is exact-match ID query, should not have a second call for full products
		const fullProductCalls = mockPrismaFindMany.mock.calls.filter(
			(call) => call[0]?.select?.slug !== undefined,
		);
		expect(fullProductCalls).toHaveLength(0);
	});

	// ─── Spell suggestion ──────────────────────────────────────

	it("triggers spell suggestion when results < threshold", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({
			ids: ["id-1"],
			totalCount: 1,
		});
		mockPrismaFindMany
			.mockResolvedValueOnce([]) // exact-match IDs
			.mockResolvedValueOnce([makeProduct("id-1")]); // full products
		mockGetSpellSuggestion.mockResolvedValue({
			term: "collier",
			similarity: 0.7,
			source: "product",
		});

		const result = await quickSearchProducts("colier");

		expect(mockGetSpellSuggestion).toHaveBeenCalledWith("colier", { status: "PUBLIC" });
		expect(asSuccess(result).suggestion).toBe("collier");
	});

	it("does not trigger spell suggestion when enough results", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({
			ids: ["id-1", "id-2", "id-3"],
			totalCount: 10,
		});
		mockPrismaFindMany
			.mockResolvedValueOnce([]) // exact-match IDs
			.mockResolvedValueOnce([makeProduct("id-1"), makeProduct("id-2"), makeProduct("id-3")]); // full products

		const result = await quickSearchProducts("collier");

		expect(mockGetSpellSuggestion).not.toHaveBeenCalled();
		expect(asSuccess(result).suggestion).toBeNull();
	});

	it("returns null suggestion when spell check finds nothing", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({ ids: [], totalCount: 0 });
		mockGetSpellSuggestion.mockResolvedValue(null);

		const result = await quickSearchProducts("xyzxyz");

		expect(asSuccess(result).suggestion).toBeNull();
	});

	// ─── Suggestion HORS du scope de cache ──────────────────────────────────
	//
	// La suggestion n'est plus parallélisée avec le fetch produits : elle vit
	// désormais HORS du cœur `"use cache"` (`fetchQuickSearchCore`), pour qu'un
	// `null` de panne ne soit jamais figé dans l'entrée du terme (audit
	// recherche 2026-08-01, P1-3). Elle ne part donc qu'APRÈS le cœur.

	it("requests the spell suggestion after the cached core resolved", async () => {
		const callOrder: string[] = [];
		let findManyCallCount = 0;

		mockFuzzySearchProductIds.mockResolvedValue({
			ids: ["id-1"],
			totalCount: 1,
		});
		mockPrismaFindMany.mockImplementation(async () => {
			findManyCallCount++;
			// First call: exact-match IDs (fast)
			if (findManyCallCount === 1) return [];
			// Second call: full products
			callOrder.push("findMany-start");
			await new Promise((r) => setTimeout(r, 10));
			callOrder.push("findMany-end");
			return [makeProduct("id-1")];
		});
		mockGetSpellSuggestion.mockImplementation(async () => {
			callOrder.push("spell-start");
			return null;
		});

		await quickSearchProducts("colier");

		expect(callOrder.indexOf("spell-start")).toBeGreaterThan(callOrder.indexOf("findMany-end"));
	});

	// ─── Edge cases ──────────────────────────────────

	it("handles product ID not found in DB gracefully", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({
			ids: ["id-1", "id-missing", "id-2"],
			totalCount: 3,
		});
		// "id-missing" is not returned by DB
		mockPrismaFindMany
			.mockResolvedValueOnce([]) // exact-match IDs
			.mockResolvedValueOnce([makeProduct("id-1"), makeProduct("id-2")]); // full products

		const result = await quickSearchProducts("collier");

		expect(asSuccess(result).products.map((p) => p.id)).toEqual(["id-1", "id-2"]);
	});

	it("trims input before processing", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({ ids: [], totalCount: 0 });

		await quickSearchProducts("  collier  ");

		expect(mockFuzzySearchProductIds).toHaveBeenCalledWith("collier", expect.any(Object));
	});

	// ─── Related-field (exact) search ──────────────────────────

	it("returns exact-only results when fuzzy returns empty", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({ ids: [], totalCount: 0 });
		// Exact search finds products by type/color/material/collection
		mockPrismaFindMany
			.mockResolvedValueOnce([{ id: "exact-1" }, { id: "exact-2" }]) // exact-match IDs
			.mockResolvedValueOnce([makeProduct("exact-1"), makeProduct("exact-2")]); // full products

		const result = await quickSearchProducts("bague");

		expect(asSuccess(result).products).toHaveLength(2);
		expect(asSuccess(result).products.map((p) => p.id)).toEqual(["exact-1", "exact-2"]);
	});

	it("merges fuzzy and exact results with fuzzy first", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({
			ids: ["fuzzy-1", "fuzzy-2"],
			totalCount: 2,
		});
		// Exact search finds additional products
		mockPrismaFindMany
			.mockResolvedValueOnce([{ id: "exact-1" }]) // exact-match IDs
			.mockResolvedValueOnce([
				makeProduct("fuzzy-1"),
				makeProduct("fuzzy-2"),
				makeProduct("exact-1"),
			]); // full products

		const result = await quickSearchProducts("bague");

		expect(asSuccess(result).products.map((p) => p.id)).toEqual(["fuzzy-1", "fuzzy-2", "exact-1"]);
	});

	it("skips exact query when fuzzy fills all 6 slots", async () => {
		const fuzzyIds = ["id-1", "id-2", "id-3", "id-4", "id-5", "id-6"];
		mockFuzzySearchProductIds.mockResolvedValue({
			ids: fuzzyIds,
			totalCount: 10,
		});
		const products = fuzzyIds.map(makeProduct);
		mockPrismaFindMany.mockResolvedValueOnce(products); // only full products, no exact query

		const result = await quickSearchProducts("collier");

		// buildRelatedFieldsSearchConditions should not have been called
		expect(mockBuildRelatedFieldsSearchConditions).not.toHaveBeenCalled();
		expect(asSuccess(result).products).toHaveLength(6);
	});

	it("limits exact results to remaining slots", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({
			ids: ["fuzzy-1", "fuzzy-2", "fuzzy-3", "fuzzy-4"],
			totalCount: 4,
		});
		// Exact search returns 2 extra (but only 2 slots remain)
		mockPrismaFindMany
			.mockResolvedValueOnce([{ id: "exact-1" }, { id: "exact-2" }]) // exact-match IDs
			.mockResolvedValueOnce([
				makeProduct("fuzzy-1"),
				makeProduct("fuzzy-2"),
				makeProduct("fuzzy-3"),
				makeProduct("fuzzy-4"),
				makeProduct("exact-1"),
				makeProduct("exact-2"),
			]); // full products

		const result = await quickSearchProducts("bague");

		expect(asSuccess(result).products).toHaveLength(6);
		// Verify exact query was limited to 2 (remaining slots)
		const exactCall = mockPrismaFindMany.mock.calls[0]!;
		expect(exactCall[0].take).toBe(2);
	});

	it("excludes fuzzy IDs from exact query to avoid duplicates", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({
			ids: ["fuzzy-1"],
			totalCount: 1,
		});
		mockPrismaFindMany
			.mockResolvedValueOnce([{ id: "exact-1" }]) // exact-match IDs
			.mockResolvedValueOnce([makeProduct("fuzzy-1"), makeProduct("exact-1")]); // full products

		await quickSearchProducts("bague");

		// Verify exact query excludes fuzzy IDs
		const exactCall = mockPrismaFindMany.mock.calls[0]!;
		const whereAnd = exactCall[0].where.AND;
		const notCondition = whereAnd.find((c: Record<string, unknown>) => "NOT" in c);
		expect(notCondition).toEqual({ NOT: { id: { in: ["fuzzy-1"] } } });
	});

	it("reports totalCount as sum of fuzzy and exact-only counts", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({
			ids: ["fuzzy-1"],
			totalCount: 15,
		});
		mockPrismaFindMany
			.mockResolvedValueOnce([{ id: "exact-1" }, { id: "exact-2" }])
			.mockResolvedValueOnce([
				makeProduct("fuzzy-1"),
				makeProduct("exact-1"),
				makeProduct("exact-2"),
			]);
		mockPrismaCount.mockResolvedValueOnce(8);

		const result = await quickSearchProducts("bague");

		// fuzzyTotalCount (15) + exactOnlyTotalCount (8) = 23
		expect(asSuccess(result).totalCount).toBe(23);
	});
});
