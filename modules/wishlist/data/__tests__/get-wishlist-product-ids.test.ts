import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReadWishlistCookie } = vi.hoisted(() => ({
	mockReadWishlistCookie: vi.fn(),
}));

vi.mock("@/modules/wishlist/lib/wishlist-cookie", () => ({
	readWishlistCookie: mockReadWishlistCookie,
}));

import { getWishlistProductIds } from "../get-wishlist-product-ids";

const VALID_ID_A = "cm1234567890abcdefghijk12";
const VALID_ID_B = "cm1234567890abcdefghijk34";

beforeEach(() => {
	vi.clearAllMocks();
});

describe("getWishlistProductIds", () => {
	it("retourne un Set des ids du cookie (aucune requête DB)", async () => {
		mockReadWishlistCookie.mockResolvedValue([VALID_ID_A, VALID_ID_B]);

		const result = await getWishlistProductIds();

		expect(result).toBeInstanceOf(Set);
		expect(result.has(VALID_ID_A)).toBe(true);
		expect(result.has(VALID_ID_B)).toBe(true);
		expect(result.size).toBe(2);
	});

	it("retourne un Set vide sans cookie", async () => {
		mockReadWishlistCookie.mockResolvedValue([]);

		const result = await getWishlistProductIds();

		expect(result.size).toBe(0);
	});
});
