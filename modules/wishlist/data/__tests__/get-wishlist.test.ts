/**
 * `getWishlist` — matérialisation du cookie en produits : ordre du cookie
 * préservé (findMany ne garantit pas l'ordre de `in`), ids périmés écartés en
 * silence, et repli `{ items: [] }` HORS du scope `"use cache"` — le vide
 * d'une panne ne doit jamais être mis en cache (CACHE-DEGRADED-VALUE-001).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	readWishlistCookie: vi.fn(),
	findMany: vi.fn(),
	loggerError: vi.fn(),
	isPrerenderInterrupt: vi.fn(),
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("@/modules/wishlist/lib/wishlist-cookie", () => ({
	readWishlistCookie: mocks.readWishlistCookie,
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { product: { findMany: mocks.findMany } },
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { error: mocks.loggerError, warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/shared/lib/prerender-interrupt", () => ({
	isPrerenderInterrupt: mocks.isPrerenderInterrupt,
}));

vi.mock("next/cache", () => ({
	cacheLife: mocks.cacheLife,
	cacheTag: mocks.cacheTag,
}));

vi.mock("@/modules/products/constants/product.constants", () => ({
	GET_PRODUCTS_SELECT: { id: true, name: true },
}));

vi.mock("@/modules/products/constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: { LIST: "products:list", VARIANTS_LIST: "products:variants:list" },
}));

import { getWishlist } from "../get-wishlist";

const PRODUCT_A = "cm1234567890abcdefghijk12";
const PRODUCT_B = "cm1234567890abcdefghijk34";
const PRODUCT_GONE = "cm1234567890abcdefghijk56";

beforeEach(() => {
	vi.clearAllMocks();
	mocks.isPrerenderInterrupt.mockReturnValue(false);
});

describe("getWishlist", () => {
	it("cookie vide → liste vide SANS requête DB", async () => {
		mocks.readWishlistCookie.mockResolvedValue([]);

		expect(await getWishlist()).toEqual({ items: [] });
		expect(mocks.findMany).not.toHaveBeenCalled();
	});

	it("réordonne les produits sur l'ordre du COOKIE (findMany ne garantit pas l'ordre de `in`)", async () => {
		mocks.readWishlistCookie.mockResolvedValue([PRODUCT_B, PRODUCT_A]);
		mocks.findMany.mockResolvedValue([
			{ id: PRODUCT_A, name: "Bague pluie" },
			{ id: PRODUCT_B, name: "Créoles soleil" },
		]);

		const { items } = await getWishlist();

		expect(items.map((p) => p.id)).toEqual([PRODUCT_B, PRODUCT_A]);
	});

	it("écarte en silence un id dont le produit n'est plus actif ou n'existe plus", async () => {
		mocks.readWishlistCookie.mockResolvedValue([PRODUCT_A, PRODUCT_GONE, PRODUCT_B]);
		mocks.findMany.mockResolvedValue([
			{ id: PRODUCT_A, name: "Bague pluie" },
			{ id: PRODUCT_B, name: "Créoles soleil" },
		]);

		const { items } = await getWishlist();

		expect(items.map((p) => p.id)).toEqual([PRODUCT_A, PRODUCT_B]);
	});

	it("ne matérialise que des produits ACTIFS (filtre dans le where)", async () => {
		mocks.readWishlistCookie.mockResolvedValue([PRODUCT_A]);
		mocks.findMany.mockResolvedValue([]);

		await getWishlist();

		expect(mocks.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: { in: [PRODUCT_A] }, active: true },
			}),
		);
	});

	it("pose les tags de cache du panier (mêmes mutations prix/stock/dispo)", async () => {
		mocks.readWishlistCookie.mockResolvedValue([PRODUCT_A]);
		mocks.findMany.mockResolvedValue([]);

		await getWishlist();

		expect(mocks.cacheTag).toHaveBeenCalledWith("products:list");
		expect(mocks.cacheTag).toHaveBeenCalledWith("products:variants:list");
		expect(mocks.cacheLife).toHaveBeenCalledWith("checkout");
	});

	it("panne DB → repli { items: [] } + log (le repli vit HORS du scope cache)", async () => {
		mocks.readWishlistCookie.mockResolvedValue([PRODUCT_A]);
		mocks.findMany.mockRejectedValue(new Error("db down"));

		expect(await getWishlist()).toEqual({ items: [] });
		expect(mocks.loggerError).toHaveBeenCalled();
	});

	it("clôture de prerender (PPR) → repli SILENCIEUX, pas un incident à logger", async () => {
		mocks.readWishlistCookie.mockRejectedValue(new Error("Connection closed."));
		mocks.isPrerenderInterrupt.mockReturnValue(true);

		expect(await getWishlist()).toEqual({ items: [] });
		expect(mocks.loggerError).not.toHaveBeenCalled();
	});
});
