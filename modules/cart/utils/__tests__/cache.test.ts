import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
}));

import { cacheCart, cacheCartSummary, getCartInvalidationTags } from "../cache";

// ============================================================================
// TESTS
// ============================================================================

describe("cacheCart", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("sets cart cache profile", () => {
		cacheCart();
		expect(mockCacheLife).toHaveBeenCalledWith("cart");
	});

	it("sets anonymous cart tag when no userId or sessionId", () => {
		cacheCart();
		expect(mockCacheTag).toHaveBeenCalledWith("cart-anonymous");
	});

	it("sets user-scoped cart tag when userId is provided", () => {
		cacheCart("user-123");
		expect(mockCacheTag).toHaveBeenCalledWith("cart-user-user-123");
	});

	it("sets session-scoped cart tag when sessionId is provided without userId", () => {
		cacheCart(undefined, "sess-abc");
		expect(mockCacheTag).toHaveBeenCalledWith("cart-session-sess-abc");
	});

	it("prefers userId over sessionId for the cart tag", () => {
		cacheCart("user-123", "sess-abc");
		expect(mockCacheTag).toHaveBeenCalledWith("cart-user-user-123");
	});
});

describe("cacheCartSummary", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("sets cart cache profile", () => {
		cacheCartSummary();
		expect(mockCacheLife).toHaveBeenCalledWith("cart");
	});

	it("sets anonymous summary tag when no userId or sessionId", () => {
		cacheCartSummary();
		expect(mockCacheTag).toHaveBeenCalledWith("cart-summary-anonymous");
	});

	it("sets user-scoped summary tag when userId is provided", () => {
		cacheCartSummary("user-123");
		expect(mockCacheTag).toHaveBeenCalledWith("cart-summary-user-user-123");
	});
});

describe("getCartInvalidationTags", () => {
	it("returns anonymous tags when no userId or sessionId", () => {
		const tags = getCartInvalidationTags();
		expect(tags).toContain("cart-anonymous");
		expect(tags).toContain("cart-count-anonymous");
		expect(tags).toContain("cart-summary-anonymous");
	});

	it("returns user-scoped tags when userId is provided", () => {
		const tags = getCartInvalidationTags("user-42");
		expect(tags).toContain("cart-user-user-42");
		expect(tags).toContain("cart-count-user-user-42");
		expect(tags).toContain("cart-summary-user-user-42");
	});

	it("returns session-scoped tags when sessionId is provided", () => {
		const tags = getCartInvalidationTags(undefined, "sess-xyz");
		expect(tags).toContain("cart-session-sess-xyz");
		expect(tags).toContain("cart-count-session-sess-xyz");
		expect(tags).toContain("cart-summary-session-sess-xyz");
	});

	it("returns exactly 3 tags", () => {
		expect(getCartInvalidationTags()).toHaveLength(3);
		expect(getCartInvalidationTags("user-1")).toHaveLength(3);
	});
});
