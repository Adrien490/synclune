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
	mockLogAudit,
} = vi.hoisted(() => ({
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockLogAudit: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_MATERIAL_LIMITS: { REFRESH: "mat-refresh" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	handleActionError: mockHandleActionError,
	success: mockSuccess,
}));
vi.mock("../../constants/cache", () => ({
	MATERIALS_CACHE_TAGS: {
		LIST: "materials-list",
	},
}));
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_BADGES: "admin-badges",
	},
}));

import { refreshMaterials } from "../refresh-materials";

// ============================================================================
// TESTS
// ============================================================================

describe("refreshMaterials", () => {
	const mockFormData = new FormData();

	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@example.com" },
		});
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

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});
		const result = await refreshMaterials(undefined, mockFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("should return rate limit error when rate limit is exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit dépassé" },
		});
		const result = await refreshMaterials(undefined, mockFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("should invalidate materials and admin badges cache tags on success", async () => {
		mockSuccess.mockReturnValue({ status: ActionStatus.SUCCESS, message: "Matériaux rafraîchis" });
		await refreshMaterials(undefined, mockFormData);
		expect(mockUpdateTag).toHaveBeenCalledWith("materials-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
		expect(mockUpdateTag).toHaveBeenCalledTimes(2);
	});

	it("should log audit entry with admin info and action material.refresh", async () => {
		await refreshMaterials(undefined, mockFormData);
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				adminId: "admin-1",
				adminName: "Admin",
				action: "material.refresh",
				targetType: "material",
				targetId: "all",
			}),
		);
	});

	it("should fall back to admin email when name is missing", async () => {
		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: null, email: "admin@example.com" },
		});
		await refreshMaterials(undefined, mockFormData);
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({ adminName: "admin@example.com" }),
		);
	});

	it("should return success after cache invalidation", async () => {
		const result = await refreshMaterials(undefined, mockFormData);
		expect(mockSuccess).toHaveBeenCalledWith("Matériaux rafraîchis");
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockRequireAdmin.mockRejectedValue(new Error("DB crash"));
		const result = await refreshMaterials(undefined, mockFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
