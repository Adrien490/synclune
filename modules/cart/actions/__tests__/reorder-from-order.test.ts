import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockCheckCartRateLimit,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockPrisma,
	mockUpdateTag,
	mockGetCartInvalidationTags,
	mockRequireAuth,
	mockGetCartExpirationDate,
	mockGetOrCreateCartSessionId,
	mockAssertStoreOpen,
} = vi.hoisted(() => ({
	mockCheckCartRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockPrisma: {
		order: { findFirst: vi.fn() },
		cart: { upsert: vi.fn() },
		$transaction: vi.fn(),
	},
	mockUpdateTag: vi.fn(),
	mockGetCartInvalidationTags: vi.fn(),
	mockRequireAuth: vi.fn(),
	mockGetCartExpirationDate: vi.fn(),
	mockGetOrCreateCartSessionId: vi.fn(),
	mockAssertStoreOpen: vi.fn(),
}));

vi.mock("@/modules/cart/lib/cart-rate-limit", () => ({
	checkCartRateLimit: mockCheckCartRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	CART_LIMITS: { REORDER: "reorder" },
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (fd: FormData, k: string) => fd.get(k)?.toString() ?? null,
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/modules/cart/constants/cache", () => ({
	getCartInvalidationTags: mockGetCartInvalidationTags,
	CART_CACHE_TAGS: { PRODUCT_CARTS: (id: string) => `product-carts-${id}` },
}));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAuth: mockRequireAuth,
}));
vi.mock("@/modules/cart/lib/cart-session", () => ({
	getCartExpirationDate: mockGetCartExpirationDate,
	getOrCreateCartSessionId: mockGetOrCreateCartSessionId,
}));
vi.mock("@/modules/store-settings/services/store-closure-guard", () => ({
	assertStoreOpen: mockAssertStoreOpen,
}));
vi.mock("../../schemas/cart.schemas", () => ({
	reorderFromOrderSchema: {},
}));
vi.mock("../../constants/cart", () => ({
	MAX_CART_ITEMS: 50,
	MAX_QUANTITY_PER_ORDER: 10,
}));

import { reorderFromOrder } from "../reorder-from-order";

function makeFormData() {
	const fd = new FormData();
	fd.set("orderId", "order-1");
	return fd;
}

function makeOrderItem(skuId: string, quantity = 1, overrides: Record<string, unknown> = {}) {
	return {
		skuId,
		quantity,
		sku: {
			id: skuId,
			inventory: 10,
			isActive: true,
			priceInclTax: 5000,
			deletedAt: null,
			product: {
				id: `prod-${skuId}`,
				title: `Product ${skuId}`,
				status: "PUBLIC",
				deletedAt: null,
			},
			...(overrides.sku as object),
		},
	};
}

function setupDefaults() {
	mockCheckCartRateLimit.mockResolvedValue({
		success: true,
		context: { userId: "user-1", sessionId: null },
	});
	mockRequireAuth.mockResolvedValue({ user: { id: "user-1" } });
	// AUDIT-BIZ-001 : `null` = boutique ouverte (contrat de `assertStoreOpen`).
	mockAssertStoreOpen.mockResolvedValue(null);
	mockValidateInput.mockReturnValue({ data: { orderId: "order-1" } });
	mockPrisma.order.findFirst.mockResolvedValue({
		id: "order-1",
		items: [makeOrderItem("sku-1", 2), makeOrderItem("sku-2", 1)],
	});
	mockPrisma.cart.upsert.mockResolvedValue({ id: "cart-1", items: [] });
	mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
		fn({
			cartItem: { create: vi.fn(), update: vi.fn() },
			cart: { update: vi.fn() },
		}),
	);
	mockGetCartInvalidationTags.mockReturnValue(["cart-tag"]);
	mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
		status: "success",
		message: msg,
		data,
	}));
	mockError.mockImplementation((msg: string) => ({ status: "error", message: msg }));
	mockHandleActionError.mockReturnValue({ status: "error", message: "fallback" });
}

describe("reorderFromOrder", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("rejects guests (auth required)", async () => {
		mockRequireAuth.mockResolvedValue({
			error: { status: "error", message: "Vous devez être connecté pour effectuer cette action." },
		});
		const result = await reorderFromOrder(undefined, makeFormData());
		expect(result).toEqual({
			status: "error",
			message: "Vous devez être connecté pour effectuer cette action.",
		});
		expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
	});

	// AUDIT-BIZ-001 — `reorderFromOrder` remplit le panier : c'est un chemin
	// d'achat et il doit porter le même gate que `addToCart`. Il était le seul
	// trou, et un trou VIVANT : le `ReorderButton` s'affiche dans l'espace client,
	// dont le layout est volontairement sans gate de fermeture (« accessible to
	// authenticated users even when the store is closed »).
	it("rejects when the store is closed (same gate as addToCart)", async () => {
		mockAssertStoreOpen.mockResolvedValue({
			closed: true,
			message: "Les commandes ne sont pas encore ouvertes.",
		});

		const result = await reorderFromOrder(undefined, makeFormData());

		expect(result).toEqual({
			status: "error",
			message: "Les commandes ne sont pas encore ouvertes.",
		});
		// Court-circuit avant toute lecture de commande ou écriture panier.
		expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("rejects orders not owned by user (ownership)", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(null);
		await reorderFromOrder(undefined, makeFormData());
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("introuvable"));
	});

	it("errors when no eligible items (all archived)", async () => {
		mockPrisma.order.findFirst.mockResolvedValue({
			id: "order-1",
			items: [
				makeOrderItem("sku-old", 1, {
					sku: {
						id: "sku-old",
						inventory: 0,
						isActive: true,
						priceInclTax: 5000,
						deletedAt: null,
						product: {
							id: "prod-sku-old",
							title: "old",
							status: "ARCHIVED",
							deletedAt: null,
						},
					},
				}),
			],
		});
		await reorderFromOrder(undefined, makeFormData());
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("disponible"));
	});

	it("creates cart items when none exist yet", async () => {
		const create = vi.fn();
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
			fn({ cartItem: { create, update: vi.fn() }, cart: { update: vi.fn() } }),
		);

		await reorderFromOrder(undefined, makeFormData());

		expect(create).toHaveBeenCalledTimes(2);
		expect(mockSuccess).toHaveBeenCalled();
	});

	// ─────────────────────────────────────────────────────────────────────────
	// Bornage par le stock. `reorderFromOrder` recommande une ancienne commande :
	// les quantités viennent de l'historique et peuvent dépasser le stock actuel.
	// Le clamp (`Math.min(requested, inventory, MAX_QUANTITY_PER_ORDER)`) n'avait
	// AUCUN test — audit « validation stock panier » 2026-07-30, P2-8.
	// ─────────────────────────────────────────────────────────────────────────
	describe("bornage par le stock disponible (P2-8)", () => {
		it("plafonne la quantité au stock restant quand la commande en demandait plus", async () => {
			mockPrisma.order.findFirst.mockResolvedValue({
				id: "order-1",
				// 5 exemplaires commandés à l'époque, il n'en reste que 2.
				items: [makeOrderItem("sku-1", 5, { sku: { inventory: 2 } })],
			});
			const create = vi.fn();
			mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
				fn({ cartItem: { create, update: vi.fn() }, cart: { update: vi.fn() } }),
			);

			await reorderFromOrder(undefined, makeFormData());

			expect(create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ skuId: "sku-1", quantity: 2 }),
				}),
			);
		});

		it("plafonne à MAX_QUANTITY_PER_ORDER même quand le stock le permettrait", async () => {
			mockPrisma.order.findFirst.mockResolvedValue({
				id: "order-1",
				items: [makeOrderItem("sku-1", 40, { sku: { inventory: 100 } })],
			});
			const create = vi.fn();
			mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
				fn({ cartItem: { create, update: vi.fn() }, cart: { update: vi.fn() } }),
			);

			await reorderFromOrder(undefined, makeFormData());

			expect(create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ skuId: "sku-1", quantity: 10 }),
				}),
			);
		});

		it("ignore une ligne dont le SKU est tombé à zéro", async () => {
			mockPrisma.order.findFirst.mockResolvedValue({
				id: "order-1",
				items: [
					makeOrderItem("sku-1", 1, { sku: { inventory: 0 } }),
					makeOrderItem("sku-2", 1, { sku: { inventory: 3 } }),
				],
			});
			const create = vi.fn();
			mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
				fn({ cartItem: { create, update: vi.fn() }, cart: { update: vi.fn() } }),
			);

			await reorderFromOrder(undefined, makeFormData());

			// Seul sku-2 est recommandé : sku-1 est écarté par le filtre `inventory > 0`.
			expect(create).toHaveBeenCalledTimes(1);
			expect(create).toHaveBeenCalledWith(
				expect.objectContaining({ data: expect.objectContaining({ skuId: "sku-2" }) }),
			);
		});

		it("borne aussi la fusion avec une ligne déjà au panier", async () => {
			mockPrisma.order.findFirst.mockResolvedValue({
				id: "order-1",
				items: [makeOrderItem("sku-1", 5, { sku: { inventory: 3 } })],
			});
			// Le panier contient déjà 4 unités — plus que le stock actuel.
			mockPrisma.cart.upsert.mockResolvedValue({
				id: "cart-1",
				items: [{ id: "ci-1", skuId: "sku-1", quantity: 4 }],
			});
			const update = vi.fn();
			mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
				fn({ cartItem: { create: vi.fn(), update }, cart: { update: vi.fn() } }),
			);

			await reorderFromOrder(undefined, makeFormData());

			// La stratégie MAX est bornée par le stock : 4 → 3, jamais laissé à 4.
			expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { quantity: 3 } }));
		});
	});
});
