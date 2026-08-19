/**
 * `addToWishlist` — idempotente (un produit déjà présent est un succès, c'est
 * le chemin de l'undo toast), plafonnée à `WISHLIST_MAX_ITEMS`, et gardée par
 * « produit actif » : un cuid2 forgé ne doit jamais entrer dans le cookie.
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

import { addToWishlist } from "../add-to-wishlist";

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

describe("addToWishlist", () => {
	it("rejette un productId invalide sans rien lire ni écrire", async () => {
		// "not-a-cuid" : les tirets échouent la regex cuid2 (un simple mot
		// minuscule la PASSE — Zod ne borne pas la longueur).
		const result = await addToWishlist(undefined, makeFormData("not-a-cuid"));

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mocks.findUnique).not.toHaveBeenCalled();
		expect(mocks.writeWishlistCookie).not.toHaveBeenCalled();
	});

	it("est idempotente : produit déjà présent ⇒ succès SANS requête DB ni réécriture", async () => {
		mocks.readWishlistCookie.mockResolvedValue([PRODUCT_A, PRODUCT_B]);

		const result = await addToWishlist(undefined, makeFormData(PRODUCT_A));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.findUnique).not.toHaveBeenCalled();
		expect(mocks.writeWishlistCookie).not.toHaveBeenCalled();
	});

	it("refuse au cap WISHLIST_MAX_ITEMS, AVANT la requête DB", async () => {
		mocks.readWishlistCookie.mockResolvedValue(
			Array.from({ length: WISHLIST_MAX_ITEMS }, (_, i) => `cmfull${String(i).padStart(6, "0")}`),
		);

		const result = await addToWishlist(undefined, makeFormData(PRODUCT_A));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe(WISHLIST_ERROR_MESSAGES.WISHLIST_FULL);
		expect(mocks.findUnique).not.toHaveBeenCalled();
		expect(mocks.writeWishlistCookie).not.toHaveBeenCalled();
	});

	it("refuse un produit inactif ou inexistant — un cuid2 forgé n'entre pas dans le cookie", async () => {
		mocks.findUnique.mockResolvedValue(null);

		const result = await addToWishlist(undefined, makeFormData(PRODUCT_A));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe(WISHLIST_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
		expect(mocks.writeWishlistCookie).not.toHaveBeenCalled();
	});

	it("ne considère un produit que s'il est ACTIF (filtre dans le where, pas en post-traitement)", async () => {
		await addToWishlist(undefined, makeFormData(PRODUCT_A));

		expect(mocks.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: PRODUCT_A, active: true } }),
		);
	});

	it("écrit le nouvel id EN TÊTE (plus récent en premier = ordre d'affichage)", async () => {
		const result = await addToWishlist(undefined, makeFormData(PRODUCT_A));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.writeWishlistCookie).toHaveBeenCalledWith([PRODUCT_A, PRODUCT_B]);
	});

	it("répond ERROR avec le message générique sur une panne imprévue (pas de throw)", async () => {
		mocks.findUnique.mockRejectedValue(new Error("db down"));

		const result = await addToWishlist(undefined, makeFormData(PRODUCT_A));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mocks.writeWishlistCookie).not.toHaveBeenCalled();
	});
});
