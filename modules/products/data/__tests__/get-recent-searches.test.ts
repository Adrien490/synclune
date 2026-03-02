import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockCookies } = vi.hoisted(() => ({
	mockCookies: vi.fn(),
}));

vi.mock("next/headers", () => ({
	cookies: mockCookies,
}));

vi.mock("../constants/recent-searches", () => ({
	RECENT_SEARCHES_COOKIE_NAME: "recent-searches",
	RECENT_SEARCHES_MAX_ITEMS: 5,
}));

import { getRecentSearches } from "../get-recent-searches";

// ============================================================================
// HELPERS
// ============================================================================

function makeCookieStore(value?: string) {
	return {
		get: vi.fn().mockReturnValue(value !== undefined ? { value } : undefined),
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("getRecentSearches", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	// ─── Cookie absent ───────────────────────────────────────────────────────

	it("returns empty array when cookie does not exist", async () => {
		mockCookies.mockResolvedValue(makeCookieStore());

		const result = await getRecentSearches();

		expect(result).toEqual([]);
	});

	it("returns empty array when cookie value is empty string", async () => {
		mockCookies.mockResolvedValue(makeCookieStore(""));

		const result = await getRecentSearches();

		expect(result).toEqual([]);
	});

	// ─── Valid cookie ────────────────────────────────────────────────────────

	it("returns parsed searches from cookie", async () => {
		const searches = ["bracelet", "collier", "bague"];
		const encoded = encodeURIComponent(JSON.stringify(searches));
		mockCookies.mockResolvedValue(makeCookieStore(encoded));

		const result = await getRecentSearches();

		expect(result).toEqual(searches);
	});

	it("filters out non-string values", async () => {
		const mixed = ["bracelet", 42, null, true, "collier"];
		const encoded = encodeURIComponent(JSON.stringify(mixed));
		mockCookies.mockResolvedValue(makeCookieStore(encoded));

		const result = await getRecentSearches();

		expect(result).toEqual(["bracelet", "collier"]);
	});

	it("filters strings longer than 100 characters", async () => {
		const longString = "a".repeat(101);
		const searches = ["bracelet", longString, "collier"];
		const encoded = encodeURIComponent(JSON.stringify(searches));
		mockCookies.mockResolvedValue(makeCookieStore(encoded));

		const result = await getRecentSearches();

		expect(result).toEqual(["bracelet", "collier"]);
	});

	it("keeps strings of exactly 100 characters", async () => {
		const exactHundred = "a".repeat(100);
		const searches = [exactHundred];
		const encoded = encodeURIComponent(JSON.stringify(searches));
		mockCookies.mockResolvedValue(makeCookieStore(encoded));

		const result = await getRecentSearches();

		expect(result).toEqual([exactHundred]);
	});

	// ─── Limits ──────────────────────────────────────────────────────────────

	it("limits results to RECENT_SEARCHES_MAX_ITEMS (5)", async () => {
		const searches = ["a", "b", "c", "d", "e", "f", "g"];
		const encoded = encodeURIComponent(JSON.stringify(searches));
		mockCookies.mockResolvedValue(makeCookieStore(encoded));

		const result = await getRecentSearches();

		expect(result).toHaveLength(5);
		expect(result).toEqual(["a", "b", "c", "d", "e"]);
	});

	// ─── Error handling ──────────────────────────────────────────────────────

	it("returns empty array on JSON parse error", async () => {
		mockCookies.mockResolvedValue(makeCookieStore("not-valid-json{{{"));

		const result = await getRecentSearches();

		expect(result).toEqual([]);
	});

	it("returns empty array when parsed value is not an array", async () => {
		const encoded = encodeURIComponent(JSON.stringify({ search: "bracelet" }));
		mockCookies.mockResolvedValue(makeCookieStore(encoded));

		const result = await getRecentSearches();

		expect(result).toEqual([]);
	});
});
