/**
 * `getCartItemCount` depuis le passage du panier au cookie (2026-08-04) : la
 * somme se lit dans le cookie, sans requête ni cache.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockReadCartCookie, mockLoggerError } = vi.hoisted(() => ({
	mockReadCartCookie: vi.fn(),
	mockLoggerError: vi.fn(),
}));

vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("@/shared/lib/logger", () => ({ logger: { error: mockLoggerError } }));
vi.mock("../../lib/cart-cookie", () => ({ readCartCookie: mockReadCartCookie }));

import { getCartItemCount } from "../get-cart-item-count";

beforeEach(() => {
	vi.clearAllMocks();
});

describe("getCartItemCount", () => {
	it("retourne 0 sur un panier vide", async () => {
		mockReadCartCookie.mockResolvedValue({ items: [], discountCode: null });
		expect(await getCartItemCount()).toBe(0);
	});

	it("somme les QUANTITÉS, pas le nombre de lignes", async () => {
		mockReadCartCookie.mockResolvedValue({
			items: [
				{ variantId: "cm1234567890abcdefghijk12", quantity: 3, priceAtAdd: 100 },
				{ variantId: "cm1234567890abcdefghijk34", quantity: 2, priceAtAdd: 200 },
			],
			discountCode: null,
		});

		expect(await getCartItemCount()).toBe(5);
	});

	it("retourne 0 et loggue si la lecture du cookie échoue", async () => {
		mockReadCartCookie.mockRejectedValue(new Error("boom"));

		expect(await getCartItemCount()).toBe(0);
		expect(mockLoggerError).toHaveBeenCalled();
	});
});
