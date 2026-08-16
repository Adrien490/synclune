/**
 * `clearCart` — le message reprend le nombre d'articles retirés, et un panier
 * déjà vide n'est ni une erreur ni une suppression de cookie.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { CART_ERROR_MESSAGES } from "../../constants/error-messages";

const mocks = vi.hoisted(() => ({
	readCartCookie: vi.fn(),
	clearCartCookie: vi.fn(),
}));

vi.mock("@/modules/cart/lib/cart-cookie", () => ({
	readCartCookie: mocks.readCartCookie,
	clearCartCookie: mocks.clearCartCookie,
}));

import { clearCart } from "../clear-cart";

function item(variantId: string) {
	return { variantId, quantity: 1, priceAtAdd: 100 };
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("clearCart", () => {
	it("panier déjà vide : succès, cookie intact, clearedCount 0", async () => {
		mocks.readCartCookie.mockResolvedValue({ items: [] });
		const result = await clearCart(undefined);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe(CART_ERROR_MESSAGES.CART_ALREADY_EMPTY);
		expect(result.data).toEqual({ clearedCount: 0 });
		expect(mocks.clearCartCookie).not.toHaveBeenCalled();
	});

	it("une ligne : message singulier", async () => {
		mocks.readCartCookie.mockResolvedValue({ items: [item("a")] });
		const result = await clearCart(undefined);
		expect(result.message).toBe("Panier vidé avec succès");
		expect(result.data).toEqual({ clearedCount: 1 });
		expect(mocks.clearCartCookie).toHaveBeenCalledOnce();
	});

	it("plusieurs lignes : message au pluriel avec le compte", async () => {
		mocks.readCartCookie.mockResolvedValue({ items: [item("a"), item("b"), item("c")] });
		const result = await clearCart(undefined);
		expect(result.message).toBe("3 articles supprimés du panier");
		expect(result.data).toEqual({ clearedCount: 3 });
	});
});
