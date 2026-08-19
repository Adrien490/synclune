/**
 * `toggleWishlistItem` — présent → retire, absent → ajoute via le chemin
 * partagé `addProductIdToWishlist` (cap + garde « produit actif » + écriture
 * en tête). Le payload `data.action` pilote les optimistic updates du hook.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { WISHLIST_ERROR_MESSAGES } from "@/modules/wishlist/constants/error-messages";
import { WISHLIST_MAX_ITEMS } from "@/modules/wishlist/constants/wishlist.constants";

const mocks = vi.hoisted(() => ({
	readWishlistCookie: vi.fn(),
	writeWishlistCookie: vi.fn(),
	findUnique: vi.fn(),
}));

vi.mock("@/modules/wishlist/lib/wishlist-cookie", () => ({
	readWishlistCookie: mocks.readWishlistCookie,
	writeWishlistCookie: mocks.writeWishlistCookie,
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { product: { findUnique: mocks.findUnique } },
}));

// Silence le log attendu de `handleActionError` dans le test de panne
vi.mock("@/shared/lib/logger", () => ({
	logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { toggleWishlistItem } from "../toggle-wishlist-item";

const PRODUCT_A = "cm1234567890abcdefghijk12";
const PRODUCT_B = "cm1234567890abcdefghijk34";

function makeFormData(productId: string) {
	const fd = new FormData();
	fd.set("productId", productId);
	return fd;
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.readWishlistCookie.mockResolvedValue([PRODUCT_B]);
	mocks.findUnique.mockResolvedValue({ id: PRODUCT_A });
});

describe("toggleWishlistItem", () => {
	it("rejette un productId invalide sans rien lire ni écrire", async () => {
		const result = await toggleWishlistItem(undefined, makeFormData("not-a-cuid"));

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mocks.findUnique).not.toHaveBeenCalled();
		expect(mocks.writeWishlistCookie).not.toHaveBeenCalled();
	});

	it("présent → retire sans requête DB, payload `action: removed`", async () => {
		mocks.readWishlistCookie.mockResolvedValue([PRODUCT_A, PRODUCT_B]);

		const result = await toggleWishlistItem(undefined, makeFormData(PRODUCT_A));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual({ action: "removed" });
		expect(mocks.findUnique).not.toHaveBeenCalled();
		expect(mocks.writeWishlistCookie).toHaveBeenCalledWith([PRODUCT_B]);
	});

	it("absent + liste pleine → WISHLIST_FULL sans requête DB ni réécriture", async () => {
		mocks.readWishlistCookie.mockResolvedValue(
			Array.from({ length: WISHLIST_MAX_ITEMS }, (_, i) => `cmfull${String(i).padStart(6, "0")}`),
		);

		const result = await toggleWishlistItem(undefined, makeFormData(PRODUCT_A));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe(WISHLIST_ERROR_MESSAGES.WISHLIST_FULL);
		expect(mocks.findUnique).not.toHaveBeenCalled();
		expect(mocks.writeWishlistCookie).not.toHaveBeenCalled();
	});

	it("absent + produit inactif/inexistant → refus, rien n'entre dans le cookie", async () => {
		mocks.findUnique.mockResolvedValue(null);

		const result = await toggleWishlistItem(undefined, makeFormData(PRODUCT_A));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe(WISHLIST_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
		expect(mocks.writeWishlistCookie).not.toHaveBeenCalled();
	});

	it("absent + produit actif → ajout EN TÊTE, payload `action: added`", async () => {
		const result = await toggleWishlistItem(undefined, makeFormData(PRODUCT_A));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual({ action: "added" });
		expect(mocks.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: PRODUCT_A, active: true } }),
		);
		expect(mocks.writeWishlistCookie).toHaveBeenCalledWith([PRODUCT_A, PRODUCT_B]);
	});

	it("répond ERROR avec le message générique sur une panne imprévue (pas de throw)", async () => {
		mocks.findUnique.mockRejectedValue(new Error("db down"));

		const result = await toggleWishlistItem(undefined, makeFormData(PRODUCT_A));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mocks.writeWishlistCookie).not.toHaveBeenCalled();
	});
});
