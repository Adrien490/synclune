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

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
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

	it("invalidates the admin customers list cache tag", async () => {
		await refreshOrders(undefined, makeFormData());

		expect(mockUpdateTag).toHaveBeenCalledWith("admin-customers-list");
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
