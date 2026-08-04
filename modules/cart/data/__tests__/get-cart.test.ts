/**
 * `getCart` depuis le passage du panier au cookie (2026-08-04).
 *
 * Remplace la suite de l'architecture DB, qui vérifiait le `findFirst` sur la
 * table `Cart`, le filtre `expiresAt`, la résolution userId/sessionId et le tag
 * de cache par identité — tout cela a disparu avec les tables.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockFindMany,
	mockReadCartCookie,
	mockGetDiscountByCode,
	mockResolveCartDiscount,
	mockCacheLife,
	mockCacheTag,
	mockLoggerError,
} = vi.hoisted(() => ({
	mockFindMany: vi.fn(),
	mockReadCartCookie: vi.fn(),
	mockGetDiscountByCode: vi.fn(),
	mockResolveCartDiscount: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockLoggerError: vi.fn(),
}));

vi.mock("next/cache", () => ({ cacheLife: mockCacheLife, cacheTag: mockCacheTag }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("@/shared/lib/prisma", () => ({ prisma: { productSku: { findMany: mockFindMany } } }));
vi.mock("@/shared/lib/logger", () => ({ logger: { error: mockLoggerError } }));
vi.mock("../../lib/cart-cookie", () => ({ readCartCookie: mockReadCartCookie }));
vi.mock("@/modules/discounts/data/get-discount-by-code", () => ({
	getDiscountByCode: mockGetDiscountByCode,
}));
vi.mock("../../services/resolve-cart-discount.service", () => ({
	resolveCartDiscount: mockResolveCartDiscount,
}));
vi.mock("@/modules/products/constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: { LIST: "products-list", SKUS_LIST: "skus-list" },
}));
vi.mock("../../constants/cart", () => ({ CART_SKU_SELECT: { id: true } }));

import { getCart } from "../get-cart";

const SKU_A = "cm1234567890abcdefghijk12";
const SKU_B = "cm1234567890abcdefghijk34";

const skuRow = (id: string) => ({ id, priceInclTax: 4990, compareAtPrice: null });

beforeEach(() => {
	vi.clearAllMocks();
	mockReadCartCookie.mockResolvedValue({ items: [], discountCode: null });
	mockFindMany.mockResolvedValue([]);
	mockResolveCartDiscount.mockReturnValue({
		appliedDiscountCode: null,
		discountAmountCache: null,
	});
});

describe("getCart", () => {
	it("rend un panier VIDE (jamais null) sans cookie", async () => {
		expect(await getCart()).toEqual({
			items: [],
			appliedDiscountCode: null,
			discountAmountCache: null,
		});
		expect(mockFindMany).not.toHaveBeenCalled();
	});

	it("matérialise les lignes du cookie en joignant les SKUs", async () => {
		mockReadCartCookie.mockResolvedValue({
			items: [{ skuId: SKU_A, quantity: 2, priceAtAdd: 4990 }],
			discountCode: null,
		});
		mockFindMany.mockResolvedValue([skuRow(SKU_A)]);

		const cart = await getCart();

		expect(cart.items).toEqual([{ id: SKU_A, quantity: 2, priceAtAdd: 4990, sku: skuRow(SKU_A) }]);
	});

	/** `findMany` ne garantit pas l'ordre du `in` — l'ordre du cookie fait foi. */
	it("respecte l'ordre du cookie, pas celui de la base", async () => {
		mockReadCartCookie.mockResolvedValue({
			items: [
				{ skuId: SKU_B, quantity: 1, priceAtAdd: 100 },
				{ skuId: SKU_A, quantity: 1, priceAtAdd: 200 },
			],
			discountCode: null,
		});
		mockFindMany.mockResolvedValue([skuRow(SKU_A), skuRow(SKU_B)]);

		const cart = await getCart();

		expect(cart.items.map((i) => i.id)).toEqual([SKU_B, SKU_A]);
	});

	it("écarte silencieusement une ligne dont le SKU n'est plus lisible", async () => {
		mockReadCartCookie.mockResolvedValue({
			items: [
				{ skuId: SKU_A, quantity: 1, priceAtAdd: 100 },
				{ skuId: SKU_B, quantity: 1, priceAtAdd: 200 },
			],
			discountCode: null,
		});
		mockFindMany.mockResolvedValue([skuRow(SKU_A)]);

		const cart = await getCart();

		expect(cart.items.map((i) => i.id)).toEqual([SKU_A]);
	});

	it("filtre les SKUs et produits soft-deleted côté requête", async () => {
		mockReadCartCookie.mockResolvedValue({
			items: [{ skuId: SKU_A, quantity: 1, priceAtAdd: 100 }],
			discountCode: null,
		});
		mockFindMany.mockResolvedValue([skuRow(SKU_A)]);

		await getCart();

		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					id: { in: [SKU_A] },
					deletedAt: null,
					product: { deletedAt: null },
				},
			}),
		);
	});

	describe("cache de matérialisation", () => {
		beforeEach(() => {
			mockReadCartCookie.mockResolvedValue({
				items: [{ skuId: SKU_A, quantity: 1, priceAtAdd: 100 }],
				discountCode: null,
			});
			mockFindMany.mockResolvedValue([skuRow(SKU_A)]);
		});

		/**
		 * Profil `checkout` et non `catalog` : le panier affiche le stock et pilote
		 * les alertes de rupture, il ne peut pas tolérer 15 min de péremption.
		 */
		it("utilise le profil checkout", async () => {
			await getCart();
			expect(mockCacheLife).toHaveBeenCalledWith("checkout");
		});

		it("pose les tags catalogue (produits ET SKUs)", async () => {
			await getCart();
			expect(mockCacheTag).toHaveBeenCalledWith("products-list");
			expect(mockCacheTag).toHaveBeenCalledWith("skus-list");
		});
	});

	describe("code promo", () => {
		beforeEach(() => {
			mockReadCartCookie.mockResolvedValue({
				items: [{ skuId: SKU_A, quantity: 1, priceAtAdd: 4990 }],
				discountCode: "BIENVENUE10",
			});
			mockFindMany.mockResolvedValue([skuRow(SKU_A)]);
		});

		it("re-dérive la remise à la lecture depuis les articles COURANTS", async () => {
			mockGetDiscountByCode.mockResolvedValue({ code: "BIENVENUE10" });
			mockResolveCartDiscount.mockReturnValue({
				appliedDiscountCode: "BIENVENUE10",
				discountAmountCache: 499,
			});

			const cart = await getCart();

			expect(mockGetDiscountByCode).toHaveBeenCalledWith({ code: "BIENVENUE10" });
			expect(cart.appliedDiscountCode).toBe("BIENVENUE10");
			expect(cart.discountAmountCache).toBe(499);
		});

		it("efface l'affichage d'un code devenu inéligible", async () => {
			mockGetDiscountByCode.mockResolvedValue(null);

			const cart = await getCart();

			expect(cart.appliedDiscountCode).toBeNull();
			expect(cart.discountAmountCache).toBeNull();
			expect(cart.items).toHaveLength(1);
		});

		it("ne consulte aucun discount sans code appliqué", async () => {
			mockReadCartCookie.mockResolvedValue({
				items: [{ skuId: SKU_A, quantity: 1, priceAtAdd: 4990 }],
				discountCode: null,
			});

			await getCart();

			expect(mockGetDiscountByCode).not.toHaveBeenCalled();
		});
	});

	/**
	 * CACHE-DEGRADED-VALUE-001 : le repli vit HORS du scope `"use cache"` de
	 * `fetchCartSkus`, sinon le panier vide d'une panne serait mis en cache pour
	 * toute la fenêtre du profil.
	 */
	it("rend un panier vide et loggue sur erreur de base", async () => {
		mockReadCartCookie.mockResolvedValue({
			items: [{ skuId: SKU_A, quantity: 1, priceAtAdd: 100 }],
			discountCode: null,
		});
		mockFindMany.mockRejectedValue(new Error("db down"));

		const cart = await getCart();

		expect(cart).toEqual({ items: [], appliedDiscountCode: null, discountAmountCache: null });
		expect(mockLoggerError).toHaveBeenCalled();
	});
});
