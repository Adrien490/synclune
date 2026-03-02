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

vi.mock("../constants/recent-products", () => ({
	RECENT_PRODUCTS_COOKIE_NAME: "recent-products",
	RECENT_PRODUCTS_MAX_ITEMS: 10,
}));

import { getRecentProductSlugs } from "../get-recent-product-slugs";

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

describe("getRecentProductSlugs", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	// ─── Cookie absent ───────────────────────────────────────────────────────

	it("returns empty array when cookie does not exist", async () => {
		mockCookies.mockResolvedValue(makeCookieStore());

		const result = await getRecentProductSlugs();

		expect(result).toEqual([]);
	});

	it("returns empty array when cookie value is empty string", async () => {
		mockCookies.mockResolvedValue(makeCookieStore(""));

		const result = await getRecentProductSlugs();

		expect(result).toEqual([]);
	});

	// ─── Valid cookie ────────────────────────────────────────────────────────

	it("returns parsed slugs from cookie", async () => {
		const slugs = ["bracelet-lune", "collier-etoile", "bague-soleil"];
		const encoded = encodeURIComponent(JSON.stringify(slugs));
		mockCookies.mockResolvedValue(makeCookieStore(encoded));

		const result = await getRecentProductSlugs();

		expect(result).toEqual(slugs);
	});

	it("filters out non-string values", async () => {
		const mixed = ["bracelet-lune", 42, null, true, "collier-etoile"];
		const encoded = encodeURIComponent(JSON.stringify(mixed));
		mockCookies.mockResolvedValue(makeCookieStore(encoded));

		const result = await getRecentProductSlugs();

		expect(result).toEqual(["bracelet-lune", "collier-etoile"]);
	});

	// ─── Limits ──────────────────────────────────────────────────────────────

	it("limits results to RECENT_PRODUCTS_MAX_ITEMS (10)", async () => {
		const slugs = Array.from({ length: 15 }, (_, i) => `product-${i}`);
		const encoded = encodeURIComponent(JSON.stringify(slugs));
		mockCookies.mockResolvedValue(makeCookieStore(encoded));

		const result = await getRecentProductSlugs();

		expect(result).toHaveLength(10);
		expect(result).toEqual(slugs.slice(0, 10));
	});

	// ─── Error handling ──────────────────────────────────────────────────────

	it("returns empty array on JSON parse error", async () => {
		mockCookies.mockResolvedValue(makeCookieStore("not-valid-json{{{"));

		const result = await getRecentProductSlugs();

		expect(result).toEqual([]);
	});

	it("returns empty array when parsed value is not an array", async () => {
		const encoded = encodeURIComponent(JSON.stringify({ slug: "bracelet-lune" }));
		mockCookies.mockResolvedValue(makeCookieStore(encoded));

		const result = await getRecentProductSlugs();

		expect(result).toEqual([]);
	});
});
