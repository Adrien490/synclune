/**
 * Tests des Server Actions panier depuis le passage au cookie (2026-08-04).
 *
 * Remplacent les suites par action de l'architecture DB (`add-to-cart.test.ts`,
 * `remove-from-cart.test.ts`, `clear-cart.test.ts`, `update-cart-item.test.ts`,
 * `remove-multiple-items.test.ts`, `remove-cart-discount.test.ts`,
 * `add-to-cart-concurrency.test.ts`), dont la quasi-totalité des assertions
 * portait sur des mécaniques disparues : `cart.upsert`, l'ownership
 * userId/sessionId d'un `CartItem`, le `SELECT … FOR UPDATE` et les `updateTag`
 * de cache panier.
 *
 * Ce qui reste vrai — et qui est testé ici — c'est le comportement métier : le
 * SKU est validé en base avant d'entrer dans le cookie, les plafonds tiennent,
 * et le cookie écrit reflète le geste.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockFindUnique,
	mockReadCartCookie,
	mockWriteCartCookie,
	mockClearCartCookie,
	mockCheckCartRateLimit,
	mockAssertStoreOpen,
} = vi.hoisted(() => ({
	mockFindUnique: vi.fn(),
	mockReadCartCookie: vi.fn(),
	mockWriteCartCookie: vi.fn(),
	mockClearCartCookie: vi.fn(),
	mockCheckCartRateLimit: vi.fn(),
	mockAssertStoreOpen: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { productSku: { findUnique: mockFindUnique } },
}));

vi.mock("@/modules/cart/lib/cart-cookie", () => ({
	readCartCookie: mockReadCartCookie,
	writeCartCookie: mockWriteCartCookie,
	clearCartCookie: mockClearCartCookie,
}));

vi.mock("@/modules/cart/lib/cart-rate-limit", () => ({
	checkCartRateLimit: mockCheckCartRateLimit,
}));

vi.mock("@/modules/store-settings/services/store-closure-guard", () => ({
	assertStoreOpen: mockAssertStoreOpen,
}));

import { addToCart } from "../add-to-cart";
import { removeFromCart } from "../remove-from-cart";
import { updateCartItem } from "../update-cart-item";
import { clearCart } from "../clear-cart";
import { ActionStatus } from "@/shared/types/server-action";
import { MAX_CART_ITEMS, MAX_QUANTITY_PER_ORDER } from "../../constants/cart";

const SKU_A = "cm1234567890abcdefghijk12";
const SKU_B = "cm1234567890abcdefghijk34";

const AVAILABLE_SKU = {
	id: SKU_A,
	inventory: 10,
	isActive: true,
	priceInclTax: 4990,
	deletedAt: null,
	product: { status: "PUBLIC", deletedAt: null },
};

function formData(entries: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(entries)) fd.set(k, v);
	return fd;
}

/** Dernier panier passé à `writeCartCookie`. */
function writtenCart() {
	return mockWriteCartCookie.mock.calls.at(-1)?.[0];
}

beforeEach(() => {
	vi.clearAllMocks();
	mockCheckCartRateLimit.mockResolvedValue({
		success: true,
		context: { userId: undefined, sessionId: "sess-1", ipAddress: "1.2.3.4" },
	});
	mockAssertStoreOpen.mockResolvedValue(null);
	mockReadCartCookie.mockResolvedValue({ items: [], discountCode: null });
	mockFindUnique.mockResolvedValue(AVAILABLE_SKU);
	mockWriteCartCookie.mockResolvedValue(undefined);
	mockClearCartCookie.mockResolvedValue(undefined);
});

// ============================================================================
// addToCart
// ============================================================================

describe("addToCart", () => {
	it("écrit la ligne dans le cookie avec le prix RELU EN BASE", async () => {
		const result = await addToCart(undefined, formData({ skuId: SKU_A, quantity: "2" }));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(writtenCart()).toEqual({
			items: [{ skuId: SKU_A, quantity: 2, priceAtAdd: 4990 }],
			discountCode: null,
		});
	});

	/**
	 * Le prix ne doit JAMAIS venir du client : c'est la seule raison pour laquelle
	 * `priceAtAdd` peut vivre dans un cookie sans être une faille.
	 */
	it("ignore un priceAtAdd soumis par le client", async () => {
		await addToCart(undefined, formData({ skuId: SKU_A, quantity: "1", priceAtAdd: "1" }));
		expect(writtenCart().items[0].priceAtAdd).toBe(4990);
	});

	it("cumule la quantité d'une ligne existante et la remonte en tête", async () => {
		mockReadCartCookie.mockResolvedValue({
			items: [
				{ skuId: SKU_B, quantity: 1, priceAtAdd: 100 },
				{ skuId: SKU_A, quantity: 3, priceAtAdd: 4990 },
			],
			discountCode: null,
		});

		const result = await addToCart(undefined, formData({ skuId: SKU_A, quantity: "2" }));

		expect(result.message).toContain("Quantité mise à jour");
		expect(writtenCart().items).toEqual([
			{ skuId: SKU_A, quantity: 5, priceAtAdd: 4990 },
			{ skuId: SKU_B, quantity: 1, priceAtAdd: 100 },
		]);
	});

	it("conserve le code promo appliqué", async () => {
		mockReadCartCookie.mockResolvedValue({ items: [], discountCode: "BIENVENUE10" });
		await addToCart(undefined, formData({ skuId: SKU_A, quantity: "1" }));
		expect(writtenCart().discountCode).toBe("BIENVENUE10");
	});

	describe("gardes SKU en base — sans elles, un cuid2 forgé entrerait dans le cookie", () => {
		it.each([
			["SKU inexistant", null],
			["SKU soft-deleted", { ...AVAILABLE_SKU, deletedAt: new Date() }],
			[
				"produit soft-deleted",
				{ ...AVAILABLE_SKU, product: { status: "PUBLIC", deletedAt: new Date() } },
			],
			["SKU inactif", { ...AVAILABLE_SKU, isActive: false }],
			["produit non PUBLIC", { ...AVAILABLE_SKU, product: { status: "DRAFT", deletedAt: null } }],
			["stock nul", { ...AVAILABLE_SKU, inventory: 0 }],
		])("refuse : %s", async (_label, sku) => {
			mockFindUnique.mockResolvedValue(sku);

			const result = await addToCart(undefined, formData({ skuId: SKU_A, quantity: "1" }));

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(mockWriteCartCookie).not.toHaveBeenCalled();
		});

		it("refuse une quantité cumulée au-dessus du stock", async () => {
			mockFindUnique.mockResolvedValue({ ...AVAILABLE_SKU, inventory: 3 });
			mockReadCartCookie.mockResolvedValue({
				items: [{ skuId: SKU_A, quantity: 2, priceAtAdd: 4990 }],
				discountCode: null,
			});

			const result = await addToCart(undefined, formData({ skuId: SKU_A, quantity: "2" }));

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(mockWriteCartCookie).not.toHaveBeenCalled();
		});

		it("refuse une quantité cumulée au-dessus de MAX_QUANTITY_PER_ORDER", async () => {
			mockFindUnique.mockResolvedValue({ ...AVAILABLE_SKU, inventory: 999 });
			mockReadCartCookie.mockResolvedValue({
				items: [{ skuId: SKU_A, quantity: MAX_QUANTITY_PER_ORDER, priceAtAdd: 4990 }],
				discountCode: null,
			});

			const result = await addToCart(undefined, formData({ skuId: SKU_A, quantity: "1" }));

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(mockWriteCartCookie).not.toHaveBeenCalled();
		});

		it("refuse une NOUVELLE ligne au-delà de MAX_CART_ITEMS", async () => {
			mockReadCartCookie.mockResolvedValue({
				items: Array.from({ length: MAX_CART_ITEMS }, (_, i) => ({
					skuId: `cm${String(i).padStart(23, "0")}`,
					quantity: 1,
					priceAtAdd: 100,
				})),
				discountCode: null,
			});

			const result = await addToCart(undefined, formData({ skuId: SKU_A, quantity: "1" }));

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(mockWriteCartCookie).not.toHaveBeenCalled();
		});
	});

	it("refuse quand la boutique est fermée", async () => {
		mockAssertStoreOpen.mockResolvedValue({ message: "Boutique fermée" });

		const result = await addToCart(undefined, formData({ skuId: SKU_A, quantity: "1" }));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockWriteCartCookie).not.toHaveBeenCalled();
	});

	it("refuse un skuId malformé sans toucher à la base", async () => {
		const result = await addToCart(undefined, formData({ skuId: "not-a-cuid", quantity: "1" }));

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockFindUnique).not.toHaveBeenCalled();
		expect(mockWriteCartCookie).not.toHaveBeenCalled();
	});

	it("propage un refus de rate limit", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: false,
			errorState: { status: ActionStatus.ERROR, message: "Trop de requêtes." },
		});

		const result = await addToCart(undefined, formData({ skuId: SKU_A, quantity: "1" }));

		expect(result.message).toBe("Trop de requêtes.");
		expect(mockWriteCartCookie).not.toHaveBeenCalled();
	});
});

// ============================================================================
// removeFromCart
// ============================================================================

describe("removeFromCart", () => {
	beforeEach(() => {
		mockReadCartCookie.mockResolvedValue({
			items: [
				{ skuId: SKU_A, quantity: 1, priceAtAdd: 100 },
				{ skuId: SKU_B, quantity: 2, priceAtAdd: 200 },
			],
			discountCode: "BIENVENUE10",
		});
	});

	it("retire la ligne visée et garde les autres", async () => {
		const result = await removeFromCart(undefined, formData({ skuId: SKU_A }));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(writtenCart()).toEqual({
			items: [{ skuId: SKU_B, quantity: 2, priceAtAdd: 200 }],
			discountCode: "BIENVENUE10",
		});
	});

	/** Double-clic, onglet resté ouvert sur un panier déjà vidé : pas une erreur. */
	it("est idempotente sur une ligne absente (aucune écriture)", async () => {
		const result = await removeFromCart(
			undefined,
			formData({ skuId: "cm9999999999999999999zzzz" }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockWriteCartCookie).not.toHaveBeenCalled();
	});
});

// ============================================================================
// updateCartItem
// ============================================================================

describe("updateCartItem", () => {
	beforeEach(() => {
		mockReadCartCookie.mockResolvedValue({
			items: [{ skuId: SKU_A, quantity: 1, priceAtAdd: 4990 }],
			discountCode: null,
		});
		mockFindUnique.mockResolvedValue({
			inventory: 10,
			isActive: true,
			deletedAt: null,
			product: { status: "PUBLIC", deletedAt: null },
		});
	});

	it("met à jour la quantité", async () => {
		const result = await updateCartItem(undefined, formData({ skuId: SKU_A, quantity: "4" }));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(writtenCart().items).toEqual([{ skuId: SKU_A, quantity: 4, priceAtAdd: 4990 }]);
	});

	it("refuse une ligne absente du panier", async () => {
		const result = await updateCartItem(
			undefined,
			formData({ skuId: "cm9999999999999999999zzzz", quantity: "2" }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockWriteCartCookie).not.toHaveBeenCalled();
	});

	/**
	 * Audit « validation stock panier » 2026-07-30, P2 : resoumettre la MÊME
	 * quantité sur une ligne devenue invalide doit échouer, pas répondre
	 * « Quantité mise à jour ». C'est le geste du client qui « réessaie » une
	 * ligne signalée en rupture.
	 */
	it("valide même à quantité inchangée (pas de court-circuit)", async () => {
		mockFindUnique.mockResolvedValue({
			inventory: 10,
			isActive: false,
			deletedAt: null,
			product: { status: "PUBLIC", deletedAt: null },
		});

		const result = await updateCartItem(undefined, formData({ skuId: SKU_A, quantity: "1" }));

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("n'écrit rien si la quantité est inchangée ET la ligne valide", async () => {
		const result = await updateCartItem(undefined, formData({ skuId: SKU_A, quantity: "1" }));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockWriteCartCookie).not.toHaveBeenCalled();
	});

	it("refuse au-dessus du stock", async () => {
		mockFindUnique.mockResolvedValue({
			inventory: 2,
			isActive: true,
			deletedAt: null,
			product: { status: "PUBLIC", deletedAt: null },
		});

		const result = await updateCartItem(undefined, formData({ skuId: SKU_A, quantity: "5" }));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockWriteCartCookie).not.toHaveBeenCalled();
	});
});

// ============================================================================
// clearCart / removeCartDiscount
// ============================================================================

describe("clearCart", () => {
	it("supprime le cookie et annonce le nombre d'articles retirés", async () => {
		mockReadCartCookie.mockResolvedValue({
			items: [
				{ skuId: SKU_A, quantity: 1, priceAtAdd: 100 },
				{ skuId: SKU_B, quantity: 1, priceAtAdd: 200 },
			],
			discountCode: "BIENVENUE10",
		});

		const result = await clearCart(undefined);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toMatchObject({ clearedCount: 2 });
		expect(mockClearCartCookie).toHaveBeenCalled();
	});

	it("ne supprime rien sur un panier déjà vide", async () => {
		const result = await clearCart(undefined);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toMatchObject({ clearedCount: 0 });
		expect(mockClearCartCookie).not.toHaveBeenCalled();
	});
});
