import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockHandleActionError,
	mockSuccess,
	mockLogAudit,
} = vi.hoisted(() => ({
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockLogAudit: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));
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
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_CUSTOMERS_LIST: "admin-customers-list", ADMIN_BADGES: "admin-badges" },
}));

import { refreshUsers } from "../refresh-users";

// ============================================================================
// HELPERS
// ============================================================================

const emptyFormData = createMockFormData({});
const adminUser = { id: "admin-1", name: "Admin", email: "admin@test.com", role: "ADMIN" };

// ============================================================================
// TESTS
// ============================================================================

describe("refreshUsers", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAdminWithUser.mockResolvedValue({ user: adminUser });
		mockLogAudit.mockResolvedValue(undefined);

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return rate limit error before mutating cache", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit exceeded" },
		});
		const result = await refreshUsers(undefined, emptyFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
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
		mockRequireAdminWithUser.mockRejectedValue(new Error("Unexpected crash"));
		const result = await refreshUsers(undefined, emptyFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should log audit entry on success", async () => {
		await refreshUsers(undefined, emptyFormData);
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				adminId: adminUser.id,
				adminName: adminUser.name,
				action: "user.refresh",
				targetType: "user",
				targetId: "list",
			}),
		);
	});

	it("should fall back to email for adminName when name is null", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-2", name: null, email: "noname@test.com", role: "ADMIN" },
		});
		await refreshUsers(undefined, emptyFormData);
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({ adminName: "noname@test.com" }),
		);
	});
});
