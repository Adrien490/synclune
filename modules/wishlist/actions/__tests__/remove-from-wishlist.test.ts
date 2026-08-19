/**
 * `removeFromWishlist` — un retrait d'absent est une ERREUR (contrairement au
 * panier) : le message alimente le rollback optimiste du badge côté hook.
 * Aucune garde « produit actif » : on doit pouvoir retirer un produit
 * désactivé ou supprimé de ses favoris.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { WISHLIST_ERROR_MESSAGES } from "@/modules/wishlist/constants/error-messages";

const mocks = vi.hoisted(() => ({
	readWishlistCookie: vi.fn(),
	writeWishlistCookie: vi.fn(),
}));

vi.mock("@/modules/wishlist/lib/wishlist-cookie", () => ({
	readWishlistCookie: mocks.readWishlistCookie,
	writeWishlistCookie: mocks.writeWishlistCookie,
}));

import { removeFromWishlist } from "../remove-from-wishlist";

const PRODUCT_A = "cm1234567890abcdefghijk12";
const PRODUCT_B = "cm1234567890abcdefghijk34";

function makeFormData(productId: string) {
	const fd = new FormData();
	fd.set("productId", productId);
	return fd;
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.readWishlistCookie.mockResolvedValue([PRODUCT_A, PRODUCT_B]);
});

describe("removeFromWishlist", () => {
	it("rejette un productId invalide sans rien écrire", async () => {
		const result = await removeFromWishlist(undefined, makeFormData("not-a-cuid"));

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mocks.writeWishlistCookie).not.toHaveBeenCalled();
	});

	it("retourne ITEM_NOT_FOUND pour un produit absent, sans réécriture", async () => {
		mocks.readWishlistCookie.mockResolvedValue([PRODUCT_B]);

		const result = await removeFromWishlist(undefined, makeFormData(PRODUCT_A));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe(WISHLIST_ERROR_MESSAGES.ITEM_NOT_FOUND);
		expect(mocks.writeWishlistCookie).not.toHaveBeenCalled();
	});

	it("retire l'id visé en préservant l'ordre des autres", async () => {
		const result = await removeFromWishlist(undefined, makeFormData(PRODUCT_A));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.writeWishlistCookie).toHaveBeenCalledWith([PRODUCT_B]);
	});

	it("signale `removed: true` dans le payload (consommé par les callbacks du hook)", async () => {
		const result = await removeFromWishlist(undefined, makeFormData(PRODUCT_A));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual({ removed: true });
	});
});
