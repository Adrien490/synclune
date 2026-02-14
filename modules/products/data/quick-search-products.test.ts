import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Mocks (hoisted to avoid reference errors) ──────────────────

const {
	mockFuzzySearchProductIds,
	mockGetSpellSuggestion,
	mockPrismaFindMany,
} = vi.hoisted(() => ({
	mockFuzzySearchProductIds: vi.fn(),
	mockGetSpellSuggestion: vi.fn(),
	mockPrismaFindMany: vi.fn(),
}));

vi.mock("./fuzzy-search", () => ({
	fuzzySearchProductIds: mockFuzzySearchProductIds,
}));

vi.mock("./spell-suggestion", () => ({
	getSpellSuggestion: mockGetSpellSuggestion,
	SUGGESTION_THRESHOLD_RESULTS: 3,
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		product: { findMany: mockPrismaFindMany },
	},
}));

vi.mock("server-only", () => ({}));

vi.mock("../constants/product.constants", () => ({
	QUICK_SEARCH_SELECT: { id: true, slug: true, title: true },
}));

import { quickSearchProducts } from "./quick-search-products";

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
	});

	// ─── Input validation ──────────────────────────────────────

	it("returns empty result for empty string", async () => {
		const result = await quickSearchProducts("");
		expect(result).toEqual({ products: [], suggestion: null, totalCount: 0 });
		expect(mockFuzzySearchProductIds).not.toHaveBeenCalled();
	});

	it("returns empty result for whitespace-only string", async () => {
		const result = await quickSearchProducts("   ");
		expect(result).toEqual({ products: [], suggestion: null, totalCount: 0 });
	});

	it("returns empty result for single character", async () => {
		const result = await quickSearchProducts("a");
		expect(result).toEqual({ products: [], suggestion: null, totalCount: 0 });
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
		mockPrismaFindMany.mockResolvedValue(products);

		const result = await quickSearchProducts("collier");

		expect(mockPrismaFindMany).toHaveBeenCalledWith({
			where: { id: { in: ["id-1", "id-2"] } },
			select: expect.any(Object),
		});
		expect(result.products).toHaveLength(2);
		expect(result.totalCount).toBe(2);
	});

	it("preserves relevance ordering from fuzzy search", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({
			ids: ["id-2", "id-1", "id-3"],
			totalCount: 3,
		});
		// Prisma returns in different order
		mockPrismaFindMany.mockResolvedValue([
			makeProduct("id-1"),
			makeProduct("id-3"),
			makeProduct("id-2"),
		]);

		const result = await quickSearchProducts("collier");

		expect(result.products.map((p) => p.id)).toEqual(["id-2", "id-1", "id-3"]);
	});

	it("does not call prisma.findMany when no IDs found", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({ ids: [], totalCount: 0 });

		await quickSearchProducts("xyznonexistent");

		expect(mockPrismaFindMany).not.toHaveBeenCalled();
	});

	// ─── Spell suggestion ──────────────────────────────────────

	it("triggers spell suggestion when results < threshold", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({
			ids: ["id-1"],
			totalCount: 1,
		});
		mockPrismaFindMany.mockResolvedValue([makeProduct("id-1")]);
		mockGetSpellSuggestion.mockResolvedValue({
			term: "collier",
			similarity: 0.7,
			source: "product",
		});

		const result = await quickSearchProducts("colier");

		expect(mockGetSpellSuggestion).toHaveBeenCalledWith("colier", { status: "PUBLIC" });
		expect(result.suggestion).toBe("collier");
	});

	it("does not trigger spell suggestion when enough results", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({
			ids: ["id-1", "id-2", "id-3"],
			totalCount: 10,
		});
		mockPrismaFindMany.mockResolvedValue([
			makeProduct("id-1"),
			makeProduct("id-2"),
			makeProduct("id-3"),
		]);

		const result = await quickSearchProducts("collier");

		expect(mockGetSpellSuggestion).not.toHaveBeenCalled();
		expect(result.suggestion).toBeNull();
	});

	it("returns null suggestion when spell check finds nothing", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({ ids: [], totalCount: 0 });
		mockGetSpellSuggestion.mockResolvedValue(null);

		const result = await quickSearchProducts("xyzxyz");

		expect(result.suggestion).toBeNull();
	});

	// ─── Parallel execution ──────────────────────────────────

	it("fetches products and spell suggestion in parallel", async () => {
		const callOrder: string[] = [];

		mockFuzzySearchProductIds.mockResolvedValue({
			ids: ["id-1"],
			totalCount: 1,
		});
		mockPrismaFindMany.mockImplementation(async () => {
			callOrder.push("findMany-start");
			await new Promise((r) => setTimeout(r, 10));
			callOrder.push("findMany-end");
			return [makeProduct("id-1")];
		});
		mockGetSpellSuggestion.mockImplementation(async () => {
			callOrder.push("spell-start");
			await new Promise((r) => setTimeout(r, 10));
			callOrder.push("spell-end");
			return null;
		});

		await quickSearchProducts("colier");

		// Both should start before either finishes (parallel via Promise.all)
		const findManyStartIdx = callOrder.indexOf("findMany-start");
		const spellStartIdx = callOrder.indexOf("spell-start");
		const findManyEndIdx = callOrder.indexOf("findMany-end");

		expect(spellStartIdx).toBeLessThan(findManyEndIdx);
		expect(findManyStartIdx).toBeLessThan(spellStartIdx + 2);
	});

	// ─── Edge cases ──────────────────────────────────

	it("handles product ID not found in DB gracefully", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({
			ids: ["id-1", "id-missing", "id-2"],
			totalCount: 3,
		});
		// "id-missing" is not returned by DB
		mockPrismaFindMany.mockResolvedValue([
			makeProduct("id-1"),
			makeProduct("id-2"),
		]);

		const result = await quickSearchProducts("collier");

		expect(result.products.map((p) => p.id)).toEqual(["id-1", "id-2"]);
	});

	it("trims input before processing", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({ ids: [], totalCount: 0 });

		await quickSearchProducts("  collier  ");

		expect(mockFuzzySearchProductIds).toHaveBeenCalledWith("collier", expect.any(Object));
	});
});
