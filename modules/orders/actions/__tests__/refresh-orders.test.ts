import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockHandleActionError,
	mockSuccess,
} = vi.hoisted(() => ({
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
	requireAdminWithUser: mockRequireAdmin,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ORDER_LIMITS: { REFRESH: "admin-order-refresh" },
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/actions", () => ({
	handleActionError: mockHandleActionError,
	success: mockSuccess,
}));

vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: { LIST: "orders-list" },
}));

// ⚠️ Ce mock doit rester le miroir COMPLET de SHARED_CACHE_TAGS pour les tags que
// l'action touche. Une clé absente ici (c'était le cas d'ADMIN_ORDERS_LIST) rend le
// test structurellement incapable de voir qu'elle n'est pas invalidée : `updateTag`
// reçoit `undefined` et l'assertion de comptage passe quand même.
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_ORDERS_LIST: "admin-orders-list",
		ADMIN_CUSTOMERS_LIST: "admin-customers-list",
		ADMIN_BADGES: "admin-badges",
	},
}));

import { refreshOrders } from "../refresh-orders";

// ============================================================================
// HELPERS
// ============================================================================

function makeFormData(): FormData {
	return new FormData();
}

// ============================================================================
// TESTS
// ============================================================================

describe("refreshOrders", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ session: { userId: "admin-1" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	// --------------------------------------------------------------------------
	// Auth
	// --------------------------------------------------------------------------

	it("returns auth error when user is not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Admin requis" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await refreshOrders(undefined, makeFormData());

		expect(result).toEqual(authError);
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Rate limit
	// --------------------------------------------------------------------------

	it("returns rate limit error when exceeded", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await refreshOrders(undefined, makeFormData());

		expect(result).toEqual(rateLimitError);
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Cache invalidation
	// --------------------------------------------------------------------------

	it("invalidates the orders list cache tag", async () => {
		await refreshOrders(undefined, makeFormData());

		expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
	});

	it("invalidates the tag actually read by getOrders (admin-orders-list)", async () => {
		// `getOrders()` tague son cache avec ADMIN_ORDERS_LIST, pas ORDERS_CACHE_TAGS.LIST :
		// sans cette invalidation le bouton « Rafraîchir » était un no-op sur la liste.
		await refreshOrders(undefined, makeFormData());

		expect(mockUpdateTag).toHaveBeenCalledWith("admin-orders-list");
	});

	it("never calls updateTag with undefined (mock de tags incomplet)", async () => {
		await refreshOrders(undefined, makeFormData());

		for (const [tag] of mockUpdateTag.mock.calls) {
			expect(tag).toBeTypeOf("string");
		}
	});

	/**
	 * `ADMIN_CUSTOMERS_LIST` a disparu de `SHARED_CACHE_TAGS` avec la liste
	 * `/admin/clients` (retrait de l'espace client 2026-07-31) : ce tag ne taguait
	 * plus aucune entrée de cache, donc l'invalider ici était un no-op.
	 */
	it("n'invalide plus la liste clients admin (tag supprimé)", async () => {
		await refreshOrders(undefined, makeFormData());

		expect(mockUpdateTag).not.toHaveBeenCalledWith("admin-customers-list");
	});

	it("invalidates the admin badges cache tag", async () => {
		await refreshOrders(undefined, makeFormData());

		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
	});

	// --------------------------------------------------------------------------
	// Success
	// --------------------------------------------------------------------------

	it("returns success after invalidating cache", async () => {
		const result = await refreshOrders(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// --------------------------------------------------------------------------
	// Error handling
	// --------------------------------------------------------------------------

	it("calls handleActionError on unexpected exception", async () => {
		mockRequireAdmin.mockRejectedValue(new Error("Unexpected"));

		const result = await refreshOrders(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
