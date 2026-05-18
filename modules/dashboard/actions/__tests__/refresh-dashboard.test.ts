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
	ADMIN_DASHBOARD_LIMITS: { REFRESH: "dashboard-refresh" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	handleActionError: mockHandleActionError,
	success: mockSuccess,
}));
vi.mock("../../constants/cache", () => ({
	DASHBOARD_CACHE_TAGS: {
		KPIS: "dashboard-kpis",
		REVENUE_CHART: "dashboard-revenue-chart",
		RECENT_ORDERS: "dashboard-recent-orders",
		ALERTS: "dashboard-alerts",
		FULFILLMENT: "dashboard-fulfillment",
		TOP_PRODUCTS: "dashboard-top-products",
		ACTIVE_DISCOUNTS: "dashboard-active-discounts",
	},
}));

import { refreshDashboard } from "../refresh-dashboard";

// ============================================================================
// TESTS
// ============================================================================

describe("refreshDashboard", () => {
	const mockFormData = new FormData();

	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ success: true });
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

	// -------------------------------------------------------------------------
	// Auth guard
	// -------------------------------------------------------------------------

	it("should call requireAdmin", async () => {
		await refreshDashboard(undefined, mockFormData);

		expect(mockRequireAdmin).toHaveBeenCalledTimes(1);
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});

		const result = await refreshDashboard(undefined, mockFormData);

		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	// -------------------------------------------------------------------------
	// Rate limit
	// -------------------------------------------------------------------------

	it("should call enforceRateLimitForCurrentUser after admin check", async () => {
		await refreshDashboard(undefined, mockFormData);

		expect(mockEnforceRateLimit).toHaveBeenCalledTimes(1);
		expect(mockEnforceRateLimit).toHaveBeenCalledWith("dashboard-refresh");
	});

	it("should return error when rate limit is exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de requêtes" },
		});

		const result = await refreshDashboard(undefined, mockFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	// -------------------------------------------------------------------------
	// Cache invalidation
	// -------------------------------------------------------------------------

	it("should call updateTag for all 7 dashboard cache tags", async () => {
		await refreshDashboard(undefined, mockFormData);

		expect(mockUpdateTag).toHaveBeenCalledTimes(7);
		expect(mockUpdateTag).toHaveBeenCalledWith("dashboard-kpis");
		expect(mockUpdateTag).toHaveBeenCalledWith("dashboard-revenue-chart");
		expect(mockUpdateTag).toHaveBeenCalledWith("dashboard-recent-orders");
		expect(mockUpdateTag).toHaveBeenCalledWith("dashboard-alerts");
		expect(mockUpdateTag).toHaveBeenCalledWith("dashboard-fulfillment");
		expect(mockUpdateTag).toHaveBeenCalledWith("dashboard-top-products");
		expect(mockUpdateTag).toHaveBeenCalledWith("dashboard-active-discounts");
	});

	// -------------------------------------------------------------------------
	// Success response
	// -------------------------------------------------------------------------

	it("should return success with the expected message", async () => {
		const result = await refreshDashboard(undefined, mockFormData);

		expect(mockSuccess).toHaveBeenCalledWith("Tableau de bord rafraichi");
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// -------------------------------------------------------------------------
	// Error handling
	// -------------------------------------------------------------------------

	it("should call handleActionError on unexpected exception", async () => {
		mockRequireAdmin.mockRejectedValue(new Error("DB crash"));

		const result = await refreshDashboard(undefined, mockFormData);

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should not call updateTag when an exception occurs before invalidation", async () => {
		mockEnforceRateLimit.mockRejectedValue(new Error("Unexpected"));

		await refreshDashboard(undefined, mockFormData);

		expect(mockUpdateTag).not.toHaveBeenCalled();
	});
});
