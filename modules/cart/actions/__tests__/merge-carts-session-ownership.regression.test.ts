/**
 * @regression merge-carts-session-ownership
 *
 * mergeCarts est une Server Action ("use server") callable en RPC direct, en
 * bypassant le hook Better Auth post-login. Sans garde, un utilisateur
 * authentifié pouvait fusionner (aspirer puis supprimer) le panier guest d'une
 * victime en passant un sessionId arbitraire (IDOR OWASP A01).
 *
 * Verrouille le miroir de merge-wishlists :
 * 1. sessionId doit être un UUID v4 canonique (garde de format) ;
 * 2. sessionId doit correspondre au cookie `cart_session` du caller
 *    (ownership-of-cookie check).
 *
 * Utilise le module cart-session RÉEL (regex + lecture cookie) — seul
 * next/headers est mocké pour contrôler la valeur du cookie.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

const {
	mockGetSession,
	mockCheckMergeCartsRateLimit,
	mockCookieGet,
	mockPrisma,
	mockGetGuestCartForMerge,
	mockGetUserCartForMerge,
	mockBatchValidateSkusForMerge,
} = vi.hoisted(() => ({
	mockGetSession: vi.fn(),
	mockCheckMergeCartsRateLimit: vi.fn(),
	mockCookieGet: vi.fn(),
	mockPrisma: {
		user: { findUnique: vi.fn() },
		cart: { create: vi.fn(), delete: vi.fn() },
		$transaction: vi.fn(),
	},
	mockGetGuestCartForMerge: vi.fn(),
	mockGetUserCartForMerge: vi.fn(),
	mockBatchValidateSkusForMerge: vi.fn(),
}));

vi.mock("next/headers", () => ({
	cookies: async () => ({
		get: mockCookieGet,
		set: vi.fn(),
		delete: vi.fn(),
	}),
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("@/modules/cart/lib/cart-rate-limit", () => ({
	checkMergeCartsRateLimit: mockCheckMergeCartsRateLimit,
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
	updateTag: vi.fn(),
}));

vi.mock("@/modules/cart/constants/cache", () => ({
	getCartInvalidationTags: vi.fn(() => []),
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

import { mergeCarts } from "../merge-carts";

const OWN_SESSION_ID = "550e8400-e29b-41d4-a716-446655440000";
const VICTIM_SESSION_ID = "6f9619ff-8b86-4d11-b42d-00c04fc964ff";

function setupDefaults() {
	mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
	mockCookieGet.mockReturnValue({ value: OWN_SESSION_ID });
	mockCheckMergeCartsRateLimit.mockResolvedValue({ success: true });
	mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1", deletedAt: null });
	mockGetGuestCartForMerge.mockResolvedValue(null);
	mockGetUserCartForMerge.mockResolvedValue(null);
	mockBatchValidateSkusForMerge.mockResolvedValue(new Map());
}

describe("mergeCarts — session ownership (regression)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("rejette un sessionId non-UUID sans toucher la DB", async () => {
		const result = await mergeCarts("user-1", "not-a-uuid");

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe("Non autorisé");
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
		expect(mockGetGuestCartForMerge).not.toHaveBeenCalled();
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("rejette un UUID valide qui n'est pas le cookie du caller (anti-IDOR)", async () => {
		// Le caller possède OWN_SESSION_ID mais tente d'aspirer le panier d'une victime
		const result = await mergeCarts("user-1", VICTIM_SESSION_ID);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe("Non autorisé");
		expect(mockGetGuestCartForMerge).not.toHaveBeenCalled();
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("rejette quand aucun cookie cart_session n'est présent", async () => {
		mockCookieGet.mockReturnValue(undefined);

		const result = await mergeCarts("user-1", OWN_SESSION_ID);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockGetGuestCartForMerge).not.toHaveBeenCalled();
	});

	it("accepte quand le sessionId correspond au cookie du caller", async () => {
		const result = await mergeCarts("user-1", OWN_SESSION_ID);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockGetGuestCartForMerge).toHaveBeenCalledWith(OWN_SESSION_ID);
	});
});
