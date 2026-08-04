import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReadWishlistCookie, mockLoggerError, mockIsPrerenderInterrupt } = vi.hoisted(() => ({
	mockReadWishlistCookie: vi.fn(),
	mockLoggerError: vi.fn(),
	mockIsPrerenderInterrupt: vi.fn(),
}));

vi.mock("@/modules/wishlist/lib/wishlist-cookie", () => ({
	readWishlistCookie: mockReadWishlistCookie,
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { error: mockLoggerError, warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/shared/lib/prerender-interrupt", () => ({
	isPrerenderInterrupt: mockIsPrerenderInterrupt,
}));

import { getWishlistItemCount } from "../get-wishlist-item-count";

beforeEach(() => {
	vi.clearAllMocks();
	mockIsPrerenderInterrupt.mockReturnValue(false);
});

describe("getWishlistItemCount", () => {
	it("retourne la longueur de la liste du cookie", async () => {
		mockReadWishlistCookie.mockResolvedValue([
			"a1234567890abcdefghijk12",
			"b1234567890abcdefghijk34",
		]);

		expect(await getWishlistItemCount()).toBe(2);
	});

	it("retourne 0 sans cookie", async () => {
		mockReadWishlistCookie.mockResolvedValue([]);

		expect(await getWishlistItemCount()).toBe(0);
	});

	it("retourne 0 sans log quand cookies() rejette pendant le prerender (PPR)", async () => {
		mockReadWishlistCookie.mockRejectedValue(new Error("prerender interrupted"));
		mockIsPrerenderInterrupt.mockReturnValue(true);

		expect(await getWishlistItemCount()).toBe(0);
		expect(mockLoggerError).not.toHaveBeenCalled();
	});

	it("retourne 0 ET logge sur une erreur inattendue", async () => {
		mockReadWishlistCookie.mockRejectedValue(new Error("boom"));

		expect(await getWishlistItemCount()).toBe(0);
		expect(mockLoggerError).toHaveBeenCalled();
	});
});
