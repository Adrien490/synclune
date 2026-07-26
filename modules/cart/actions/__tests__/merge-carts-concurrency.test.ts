import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

/**
 * Concurrence sur mergeCarts (double login simultané, multi-onglets/appareils).
 *
 * Contrat attendu :
 * - Le guest cart est supprimé DANS la transaction de merge → le perdant du race
 *   voit son `tx.cart.delete` échouer (P2025), la transaction entière rollback,
 *   et mergeCarts retourne ERROR (jamais de throw vers le hook auth).
 * - ERROR ⇒ le hook auth conserve le cookie `cart_session` (retry au login
 *   suivant) et AUCUNE invalidation de cache n'est émise pour ce perdant.
 * - Au retry, le guest cart n'existe plus → SUCCESS « rien à fusionner » ⇒ le
 *   cookie est enfin nettoyé. Le système converge sans dupliquer d'items.
 */

// ============================================================================
// Hoisted mocks (structure alignée sur merge-carts.test.ts)
// ============================================================================

const {
	mockGetSession,
	mockCheckMergeCartsRateLimit,
	mockPrisma,
	mockUpdateTag,
	mockGetCartInvalidationTags,
	mockGetGuestCartForMerge,
	mockGetUserCartForMerge,
	mockBatchValidateSkusForMerge,
} = vi.hoisted(() => ({
	mockGetSession: vi.fn(),
	mockCheckMergeCartsRateLimit: vi.fn(),
	mockPrisma: {
		user: { findUnique: vi.fn() },
		cart: { create: vi.fn(), delete: vi.fn() },
		$transaction: vi.fn(),
	},
	mockUpdateTag: vi.fn(),
	mockGetCartInvalidationTags: vi.fn(),
	mockGetGuestCartForMerge: vi.fn(),
	mockGetUserCartForMerge: vi.fn(),
	mockBatchValidateSkusForMerge: vi.fn(),
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("@/modules/cart/lib/cart-rate-limit", () => ({
	checkMergeCartsRateLimit: mockCheckMergeCartsRateLimit,
}));

// Le mock évite l'import de next/headers (cookies) ; ownership vérifiée dans
// merge-carts-session-ownership.regression.test.ts — ici le cookie matche toujours.
vi.mock("@/modules/cart/lib/cart-session", () => ({
	isValidCartSessionId: (value: unknown) =>
		typeof value === "string" &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
	getCartSessionId: vi.fn(async () => "550e8400-e29b-41d4-a716-446655440000"),
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	CART_LIMITS: { MERGE: "merge" },
}));

vi.mock("@/shared/lib/actions", () => ({
	handleActionError: vi.fn((_error: unknown, defaultMessage?: string) => ({
		status: "error",
		message: defaultMessage ?? "Une erreur est survenue",
	})),
	success: vi.fn(),
	error: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));

vi.mock("@/modules/cart/constants/cache", () => ({
	getCartInvalidationTags: mockGetCartInvalidationTags,
	CART_CACHE_TAGS: {
		PRODUCT_CARTS: (id: string) => `product-carts-${id}`,
	},
}));

vi.mock("@/modules/cart/data/get-cart-for-merge", () => ({
	getGuestCartForMerge: mockGetGuestCartForMerge,
	getUserCartForMerge: mockGetUserCartForMerge,
}));

vi.mock("@/modules/cart/services/sku-validation.service", () => ({
	batchValidateSkusForMerge: mockBatchValidateSkusForMerge,
}));

vi.mock("../../constants/cart", () => ({
	MAX_CART_ITEMS: 50,
}));

import { mergeCarts } from "../merge-carts";

// ============================================================================
// Factories
// ============================================================================

const SESSION_ID = "550e8400-e29b-41d4-a716-446655440000";

function makeGuestItem(skuId: string, quantity: number) {
	return {
		id: `gi-${skuId}`,
		skuId,
		quantity,
		priceAtAdd: 2999,
		sku: {
			isActive: true,
			product: { id: `prod-${skuId}`, title: `Product ${skuId}`, status: "PUBLIC" },
		},
	};
}

function setupDefaults() {
	mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
	mockCheckMergeCartsRateLimit.mockResolvedValue({ success: true });
	mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1", deletedAt: null });
	mockGetGuestCartForMerge.mockResolvedValue({
		id: "guest-cart-1",
		items: [makeGuestItem("sku-1", 2)],
	});
	mockGetUserCartForMerge.mockResolvedValue({ id: "user-cart-1", items: [] });
	mockBatchValidateSkusForMerge.mockResolvedValue(new Map([["sku-1", { isValid: true }]]));
	mockGetCartInvalidationTags.mockReturnValue(["tag-1"]);
}

/** Erreur Prisma P2025 simulée (delete d'un record déjà supprimé). handleActionError
 * est mocké ici — pas de check instanceof dans mergeCarts, une shape suffit. */
function makeP2025(): Error {
	return Object.assign(new Error("Record to delete does not exist"), { code: "P2025" });
}

// ============================================================================
// Tests
// ============================================================================

describe("mergeCarts - concurrency", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns ERROR (no throw) when the guest cart was deleted by a concurrent merge (tx rollback)", async () => {
		// Le tx.cart.delete du perdant échoue → la transaction entière rejette.
		mockPrisma.$transaction.mockRejectedValue(makeP2025());

		const result = await mergeCarts("user-1", SESSION_ID);

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("does not invalidate any cache when the merge transaction rolls back", async () => {
		mockPrisma.$transaction.mockRejectedValue(makeP2025());

		await mergeCarts("user-1", SESSION_ID);

		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("converges on retry: guest cart already merged (absent) → SUCCESS with nothing to merge", async () => {
		// Login suivant : le panier invité n'existe plus (fusionné par le gagnant).
		mockGetGuestCartForMerge.mockResolvedValue(null);

		const result = await mergeCarts("user-1", SESSION_ID);

		// SUCCESS ⇒ le hook auth peut enfin supprimer le cookie cart_session.
		expect(result).toMatchObject({
			status: ActionStatus.SUCCESS,
			data: { mergedItems: 0, conflicts: 0 },
		});
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("two simultaneous merges of the same guest cart: exactly one wins, the loser errors without duplicating items", async () => {
		// État DB partagé simulé : le premier tx.cart.delete gagne, le second
		// trouve le guest cart déjà supprimé et rejette (P2025 → rollback).
		let guestCartDeleted = false;
		const createdItems: Array<Record<string, unknown>> = [];

		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
			const pendingCreates: Array<Record<string, unknown>> = [];
			const tx = {
				cartItem: {
					create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
						pendingCreates.push(data);
					}),
					update: vi.fn(),
				},
				cart: {
					delete: vi.fn(async () => {
						if (guestCartDeleted) {
							throw makeP2025();
						}
						guestCartDeleted = true;
					}),
				},
			};
			const result = await fn(tx);
			// Commit : seuls les writes d'une transaction NON rejetée sont visibles.
			createdItems.push(...pendingCreates);
			return result;
		});

		const [first, second] = await Promise.all([
			mergeCarts("user-1", SESSION_ID),
			mergeCarts("user-1", SESSION_ID),
		]);

		const statuses = [first.status, second.status].sort();
		expect(statuses).toEqual([ActionStatus.ERROR, ActionStatus.SUCCESS].sort());
		// Un seul commit : l'item du guest cart n'est créé qu'une fois.
		expect(createdItems).toHaveLength(1);
		expect(createdItems[0]).toMatchObject({ skuId: "sku-1", quantity: 2, priceAtAdd: 2999 });
	});
});
