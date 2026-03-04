import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

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

vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_USER_LIMITS: { REFRESH: "admin-user-refresh" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	handleActionError: mockHandleActionError,
	success: mockSuccess,
}));
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_CUSTOMERS_LIST: "admin-customers-list", ADMIN_BADGES: "admin-badges" },
}));

import { refreshUsers } from "../refresh-users";

// ============================================================================
// HELPERS
// ============================================================================

const emptyFormData = createMockFormData({});

// ============================================================================
// TESTS
// ============================================================================

describe("refreshUsers", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAdmin.mockResolvedValue({ user: { id: "1", role: "ADMIN" } });

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit exceeded" },
		});
		const result = await refreshUsers(undefined, emptyFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockRequireAdmin).not.toHaveBeenCalled();
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "Admin only" },
		});
		const result = await refreshUsers(undefined, emptyFormData);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("should invalidate both ADMIN_CUSTOMERS_LIST and ADMIN_BADGES cache tags", async () => {
		await refreshUsers(undefined, emptyFormData);
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-customers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
		expect(mockUpdateTag).toHaveBeenCalledTimes(2);
	});

	it("should succeed with proper message", async () => {
		const result = await refreshUsers(undefined, emptyFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("rafraîchis");
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockRequireAdmin.mockRejectedValue(new Error("Unexpected crash"));
		const result = await refreshUsers(undefined, emptyFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
