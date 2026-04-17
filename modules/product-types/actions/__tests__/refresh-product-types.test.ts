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
	mockGetProductTypeInvalidationTags,
} = vi.hoisted(() => ({
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockLogAudit: vi.fn(),
	mockGetProductTypeInvalidationTags: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_PRODUCT_TYPE_LIMITS: { REFRESH: "pt-refresh" },
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
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("../../utils/cache.utils", () => ({
	getProductTypeInvalidationTags: mockGetProductTypeInvalidationTags,
}));

import { refreshProductTypes } from "../refresh-product-types";

// ============================================================================
// HELPERS
// ============================================================================

const emptyFormData = createMockFormData({});

const adminUser = { id: "admin-1", name: "Alice", email: "alice@test.com" };

// ============================================================================
// TESTS
// ============================================================================

describe("refreshProductTypes", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({ user: adminUser });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetProductTypeInvalidationTags.mockReturnValue([
			"product-types-list",
			"product-types-detail",
		]);

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
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});
		const result = await refreshProductTypes(undefined, emptyFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockLogAudit).not.toHaveBeenCalled();
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await refreshProductTypes(undefined, emptyFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockLogAudit).not.toHaveBeenCalled();
	});

	it("should invalidate all cache tags", async () => {
		await refreshProductTypes(undefined, emptyFormData);
		expect(mockGetProductTypeInvalidationTags).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalledWith("product-types-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("product-types-detail");
		expect(mockUpdateTag).toHaveBeenCalledTimes(2);
	});

	it("should emit audit log with action productType.refreshCache", async () => {
		await refreshProductTypes(undefined, emptyFormData);
		expect(mockLogAudit).toHaveBeenCalledWith({
			adminId: adminUser.id,
			adminName: adminUser.name,
			action: "productType.refreshCache",
			targetType: "productType",
			targetId: "all",
		});
	});

	it("should fallback to email for adminName when name is null", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-2", name: null, email: "bob@test.com" },
		});
		await refreshProductTypes(undefined, emptyFormData);
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({ adminName: "bob@test.com" }),
		);
	});

	it("should return success message after refresh", async () => {
		const result = await refreshProductTypes(undefined, emptyFormData);
		expect(mockSuccess).toHaveBeenCalledWith("Types de produits rafraîchis");
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockGetProductTypeInvalidationTags.mockImplementation(() => {
			throw new Error("Unexpected crash");
		});
		const result = await refreshProductTypes(undefined, emptyFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
