/**
 * Les 4 actions panier que `cart-cookie-actions.test.ts` ne couvrait pas —
 * `clearCartAfterOrder`, `removeUnavailableItems`, `updateCartPrices` et
 * `validateCart`. Trou relevé par l'audit « Server Actions sécurisées » du
 * 2026-08-07 : 4 des 8 actions du module n'avaient aucune assertion.
 *
 * Elles partagent une mécanique que la suite sœur ne teste pas : elles lisent le
 * catalogue EN DIRECT via `readCartWithSkus()` (pas `getCart()` et son cache),
 * précisément parce qu'elles décident sur l'état courant du stock et des prix.
 *
 * Deux invariants du passage au cookie (2026-08-04) sont verrouillés ici :
 *
 *  - **une ligne dont le SKU a disparu de la base** est absente de `items` mais
 *    présente dans `cookie.items`. Seul `removeUnavailableItems` peut la retirer :
 *    si elle survivait, le panier porterait une ligne fantôme indéracinable ;
 *  - **`updateCartPrices` ne retire rien** — elle rafraîchit les prix témoins des
 *    lignes disponibles et laisse les autres intactes. Retirer serait le geste
 *    d'une autre action.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockReadCartWithSkus,
	mockWriteCartCookie,
	mockClearCartCookie,
	mockCheckCartRateLimit,
	mockLogger,
} = vi.hoisted(() => ({
	mockReadCartWithSkus: vi.fn(),
	mockWriteCartCookie: vi.fn(),
	mockClearCartCookie: vi.fn(),
	mockCheckCartRateLimit: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/modules/cart/services/read-cart-with-skus.service", () => ({
	readCartWithSkus: mockReadCartWithSkus,
}));

vi.mock("@/modules/cart/lib/cart-cookie", () => ({
	writeCartCookie: mockWriteCartCookie,
	clearCartCookie: mockClearCartCookie,
}));

vi.mock("@/modules/cart/lib/cart-rate-limit", () => ({
	checkCartRateLimit: mockCheckCartRateLimit,
}));

vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

import { clearCartAfterOrder } from "../clear-cart-after-order";
import { removeUnavailableItems } from "../remove-unavailable-items";
import { updateCartPrices } from "../update-cart-prices";
import { validateCart } from "../validate-cart";

// ============================================================================
// FACTORIES
// ============================================================================

/** Une ligne panier telle que `readCartWithSkus` la matérialise. */
function makeItem(
	skuId: string,
	{
		quantity = 1,
		priceAtAdd = 2500,
		priceInclTax = 2500,
		inventory = 10,
		isActive = true,
		deletedAt = null as Date | null,
		productStatus = "PUBLIC",
		productDeletedAt = null as Date | null,
		title = "Boucles Goutte de Pluie",
	} = {},
) {
	return {
		id: skuId,
		skuId,
		quantity,
		priceAtAdd,
		sku: {
			id: skuId,
			inventory,
			isActive,
			deletedAt,
			priceInclTax,
			product: { title, status: productStatus, deletedAt: productDeletedAt },
		},
	};
}

const cookieLine = (skuId: string, quantity = 1, priceAtAdd = 2500) => ({
	skuId,
	quantity,
	priceAtAdd,
});

/** `cookie.items` et `items` peuvent DIVERGER : c'est tout l'enjeu du SKU disparu. */
function setupCart(cookieItems: ReturnType<typeof cookieLine>[], items: unknown[]) {
	mockReadCartWithSkus.mockResolvedValue({ cookie: { items: cookieItems }, items });
}

const RATE_LIMITED = {
	success: false as const,
	errorState: { status: ActionStatus.ERROR, message: "Trop de requêtes." },
};

beforeEach(() => {
	vi.resetAllMocks();
	mockCheckCartRateLimit.mockResolvedValue({ success: true });
	mockClearCartCookie.mockResolvedValue(undefined);
	mockWriteCartCookie.mockResolvedValue(undefined);
	setupCart([], []);
});

// ============================================================================
// clearCartAfterOrder
// ============================================================================

describe("clearCartAfterOrder", () => {
	it("vide le cookie et rend un succès", async () => {
		const result = await clearCartAfterOrder();

		expect(mockClearCartCookie).toHaveBeenCalledTimes(1);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("respecte le rate limit — `use server` publie un endpoint RPC hors UI", async () => {
		mockCheckCartRateLimit.mockResolvedValue(RATE_LIMITED);

		const result = await clearCartAfterOrder();

		expect(result).toEqual(RATE_LIMITED.errorState);
		expect(mockClearCartCookie).not.toHaveBeenCalled();
	});

	it("masque le détail technique en cas d'échec", async () => {
		mockClearCartCookie.mockRejectedValue(new Error("cookie store unavailable"));

		const result = await clearCartAfterOrder();

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).not.toContain("cookie store unavailable");
	});
});

// ============================================================================
// removeUnavailableItems
// ============================================================================

describe("removeUnavailableItems", () => {
	it("respecte le rate limit", async () => {
		mockCheckCartRateLimit.mockResolvedValue(RATE_LIMITED);

		const result = await removeUnavailableItems();

		expect(result).toEqual(RATE_LIMITED.errorState);
		expect(mockWriteCartCookie).not.toHaveBeenCalled();
	});

	it("ne réécrit rien sur un panier vide", async () => {
		const result = await removeUnavailableItems();

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual({ deletedCount: 0 });
		expect(mockWriteCartCookie).not.toHaveBeenCalled();
	});

	it("ne réécrit rien quand tout est disponible", async () => {
		setupCart([cookieLine("sku-a"), cookieLine("sku-b")], [makeItem("sku-a"), makeItem("sku-b")]);

		const result = await removeUnavailableItems();

		expect(result.data).toEqual({ deletedCount: 0 });
		expect(mockWriteCartCookie).not.toHaveBeenCalled();
	});

	it("retire une ligne en stock insuffisant", async () => {
		setupCart(
			[cookieLine("sku-a", 5), cookieLine("sku-b")],
			[makeItem("sku-a", { quantity: 5, inventory: 2 }), makeItem("sku-b")],
		);

		const result = await removeUnavailableItems();

		expect(result.data).toEqual({ deletedCount: 1 });
		expect(mockWriteCartCookie).toHaveBeenCalledWith(
			expect.objectContaining({ items: [cookieLine("sku-b")] }),
		);
	});

	it("retire un SKU désactivé et un produit dépublié", async () => {
		setupCart(
			[cookieLine("sku-a"), cookieLine("sku-b"), cookieLine("sku-c")],
			[
				makeItem("sku-a", { isActive: false }),
				makeItem("sku-b", { productStatus: "DRAFT" }),
				makeItem("sku-c"),
			],
		);

		const result = await removeUnavailableItems();

		expect(result.data).toEqual({ deletedCount: 2 });
		expect(mockWriteCartCookie).toHaveBeenCalledWith(
			expect.objectContaining({ items: [cookieLine("sku-c")] }),
		);
	});

	it("retire une ligne dont le SKU a DISPARU de la base", async () => {
		// `readCartWithSkus` écarte les SKUs introuvables de `items` : la ligne
		// n'apparaît que dans `cookie.items`. Cette action est le SEUL endroit qui
		// peut l'enlever — sinon elle reste indéracinable dans le panier.
		setupCart([cookieLine("sku-fantome"), cookieLine("sku-b")], [makeItem("sku-b")]);

		const result = await removeUnavailableItems();

		expect(result.data).toEqual({ deletedCount: 1 });
		expect(mockWriteCartCookie).toHaveBeenCalledWith(
			expect.objectContaining({ items: [cookieLine("sku-b")] }),
		);
	});

	it("accorde le message au pluriel", async () => {
		setupCart(
			[cookieLine("sku-a"), cookieLine("sku-b")],
			[makeItem("sku-a", { isActive: false }), makeItem("sku-b", { isActive: false })],
		);

		const result = await removeUnavailableItems();

		expect(result.message).toBe("2 articles indisponibles retirés");
	});
});

// ============================================================================
// updateCartPrices
// ============================================================================

describe("updateCartPrices", () => {
	it("respecte le rate limit", async () => {
		mockCheckCartRateLimit.mockResolvedValue(RATE_LIMITED);

		const result = await updateCartPrices();

		expect(result).toEqual(RATE_LIMITED.errorState);
		expect(mockWriteCartCookie).not.toHaveBeenCalled();
	});

	it("rend une erreur sur un panier vide", async () => {
		const result = await updateCartPrices();

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockWriteCartCookie).not.toHaveBeenCalled();
	});

	it("ne réécrit rien quand aucun prix n'a bougé", async () => {
		setupCart([cookieLine("sku-a")], [makeItem("sku-a", { priceAtAdd: 2500, priceInclTax: 2500 })]);

		const result = await updateCartPrices();

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toMatchObject({ updatedCount: 0 });
		expect(mockWriteCartCookie).not.toHaveBeenCalled();
	});

	it("aligne le prix témoin sur le prix DB à la baisse", async () => {
		setupCart([cookieLine("sku-a")], [makeItem("sku-a", { priceAtAdd: 3000, priceInclTax: 2500 })]);

		const result = await updateCartPrices();

		expect(mockWriteCartCookie).toHaveBeenCalledWith(
			expect.objectContaining({ items: [cookieLine("sku-a", 1, 2500)] }),
		);
		expect(result.data).toMatchObject({ updatedCount: 1, totalSavings: 500 });
	});

	it("aligne aussi à la HAUSSE, et le dit", async () => {
		setupCart([cookieLine("sku-a")], [makeItem("sku-a", { priceAtAdd: 2000, priceInclTax: 2500 })]);

		const result = await updateCartPrices();

		expect(result.data).toMatchObject({ updatedCount: 1, totalIncrease: 500 });
		// Un prix qui monte est un avertissement, pas une bonne nouvelle.
		expect(result.message).toMatch(/hausse/i);
	});

	it("IGNORE une ligne indisponible, sans la retirer", async () => {
		// Retirer n'est pas le rôle de cette action — c'est celui de
		// `removeUnavailableItems`. Le prix témoin d'une ligne morte reste figé.
		setupCart(
			[cookieLine("sku-mort", 1, 3000), cookieLine("sku-vivant", 1, 3000)],
			[
				makeItem("sku-mort", { priceAtAdd: 3000, priceInclTax: 2500, isActive: false }),
				makeItem("sku-vivant", { priceAtAdd: 3000, priceInclTax: 2500 }),
			],
		);

		const result = await updateCartPrices();

		expect(result.data).toMatchObject({ updatedCount: 1 });
		expect(mockWriteCartCookie).toHaveBeenCalledWith(
			expect.objectContaining({
				items: [cookieLine("sku-mort", 1, 3000), cookieLine("sku-vivant", 1, 2500)],
			}),
		);
	});

	it("masque le détail technique en cas d'échec", async () => {
		mockReadCartWithSkus.mockRejectedValue(new Error("PrismaClientKnownRequestError P2024"));

		const result = await updateCartPrices();

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).not.toContain("P2024");
	});
});

// ============================================================================
// validateCart
// ============================================================================

describe("validateCart", () => {
	it("signale le blocage par rate limit sans throw", async () => {
		mockCheckCartRateLimit.mockResolvedValue(RATE_LIMITED);

		const result = await validateCart();

		expect(result).toEqual({ isValid: false, issues: [], rateLimited: true });
	});

	it("rend `isValid: false` sans problème listé sur un panier vide", async () => {
		// Un panier vide n'est pas « valide » (il n'y a rien à commander) mais il n'a
		// aucun problème à signaler à l'utilisateur.
		const result = await validateCart();

		expect(result).toEqual({ isValid: false, issues: [] });
	});

	it("valide un panier entièrement disponible", async () => {
		setupCart([cookieLine("sku-a"), cookieLine("sku-b")], [makeItem("sku-a"), makeItem("sku-b")]);

		const result = await validateCart();

		expect(result).toEqual({ isValid: true, issues: [] });
	});

	it("liste les problèmes d'un panier partiellement indisponible", async () => {
		setupCart(
			[cookieLine("sku-a", 5), cookieLine("sku-b")],
			[makeItem("sku-a", { quantity: 5, inventory: 0 }), makeItem("sku-b")],
		);

		const result = await validateCart();

		expect(result.isValid).toBe(false);
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]).toMatchObject({ skuId: "sku-a" });
	});

	it("rend un problème générique plutôt que de throw", async () => {
		mockReadCartWithSkus.mockRejectedValue(new Error("DB down"));

		const result = await validateCart();

		expect(result.isValid).toBe(false);
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]?.issueType).toBe("UNKNOWN");
		expect(result.issues[0]?.message).not.toContain("DB down");
		expect(mockLogger.error).toHaveBeenCalled();
	});
});
