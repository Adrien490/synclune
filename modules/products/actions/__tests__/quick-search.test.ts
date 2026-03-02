import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockEnforceRateLimit, mockQuickSearchProducts } = vi.hoisted(() => ({
	mockEnforceRateLimit: vi.fn(),
	mockQuickSearchProducts: vi.fn(),
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({ PRODUCT_SEARCH_LIMIT: "product-search" }));
vi.mock("@/modules/products/data/quick-search-products", () => ({
	quickSearchProducts: mockQuickSearchProducts,
}));

import { quickSearch } from "../quick-search";

// ============================================================================
// HELPERS
// ============================================================================

const EMPTY_RESULT = { products: [], suggestion: null, totalCount: 0 };

const mockSearchResult = {
	products: [
		{
			id: "prod_1",
			slug: "bracelet-lune",
			title: "Bracelet Lune",
			skus: [],
		},
	],
	suggestion: null,
	totalCount: 1,
};

// ============================================================================
// TESTS
// ============================================================================

describe("quickSearch", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockQuickSearchProducts.mockResolvedValue(mockSearchResult);
	});

	it("should return EMPTY_RESULT with rateLimited flag when rate limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({ error: { status: "error", message: "Rate limit" } });
		const result = await quickSearch("bracelet");
		expect(result).toEqual({ ...EMPTY_RESULT, rateLimited: true });
	});

	it("should return EMPTY_RESULT when query exceeds 100 characters", async () => {
		const longQuery = "a".repeat(101);
		const result = await quickSearch(longQuery);
		expect(result).toEqual(EMPTY_RESULT);
		expect(mockQuickSearchProducts).not.toHaveBeenCalled();
	});

	it("should return search results for a valid query", async () => {
		const result = await quickSearch("bracelet");
		expect(result).toEqual(mockSearchResult);
		expect(mockQuickSearchProducts).toHaveBeenCalledWith("bracelet");
	});

	it("should trim whitespace from query before calling quickSearchProducts", async () => {
		await quickSearch("  bracelet  ");
		expect(mockQuickSearchProducts).toHaveBeenCalledWith("bracelet");
	});

	it("should log zero results with console.log", async () => {
		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		mockQuickSearchProducts.mockResolvedValue({ products: [], suggestion: "bague", totalCount: 0 });

		await quickSearch("bracelt");

		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("zero-result"));
		consoleSpy.mockRestore();
	});

	it("should not log when results are found", async () => {
		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
		await quickSearch("bracelet");
		expect(consoleSpy).not.toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it("should return EMPTY_RESULT with error flag on unexpected exception from quickSearchProducts", async () => {
		mockQuickSearchProducts.mockRejectedValue(new Error("DB crash"));
		const result = await quickSearch("bracelet");
		expect(result).toEqual({ ...EMPTY_RESULT, error: true });
	});

	it("should return EMPTY_RESULT with error flag on unexpected exception from rate limit service", async () => {
		mockEnforceRateLimit.mockRejectedValue(new Error("rate limit service down"));
		const result = await quickSearch("bracelet");
		expect(result).toEqual({ ...EMPTY_RESULT, error: true });
	});
});
