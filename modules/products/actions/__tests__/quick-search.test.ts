import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockEnforceRateLimit, mockQuickSearchProducts, mockLogger } = vi.hoisted(() => ({
	mockEnforceRateLimit: vi.fn(),
	mockQuickSearchProducts: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
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

const EMPTY_RESULT = { kind: "success", products: [], suggestion: null, totalCount: 0 };

const mockSearchResult = {
	kind: "success",
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

	it("should return rate-limited result when rate limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({ error: { status: "error", message: "Rate limit" } });
		const result = await quickSearch("bracelet");
		expect(result).toEqual({ kind: "rate-limited" });
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

	it("should log zero results via logger.warn", async () => {
		mockQuickSearchProducts.mockResolvedValue({
			kind: "success",
			products: [],
			suggestion: "bague",
			totalCount: 0,
		});

		await quickSearch("bracelt");

		expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("Zero-result search"), {
			action: "quick-search",
		});
	});

	it("should not log when results are found", async () => {
		mockLogger.warn.mockClear();
		await quickSearch("bracelet");
		expect(mockLogger.warn).not.toHaveBeenCalled();
	});

	it("should return error result on unexpected exception from quickSearchProducts", async () => {
		mockQuickSearchProducts.mockRejectedValue(new Error("DB crash"));
		const result = await quickSearch("bracelet");
		expect(result).toEqual({ kind: "error" });
	});

	it("should return error result on unexpected exception from rate limit service", async () => {
		mockEnforceRateLimit.mockRejectedValue(new Error("rate limit service down"));
		const result = await quickSearch("bracelet");
		expect(result).toEqual({ kind: "error" });
	});
});
