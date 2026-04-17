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
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_PRODUCT_REFRESH_LIMIT: "admin-product-refresh",
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
	PRODUCTS_CACHE_TAGS: {
		LIST: "products-list",
		COUNTS: "product-counts",
		MAX_PRICE: "max-product-price",
		SKUS_LIST: "skus-list",
	},
}));
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_BADGES: "admin-badges",
	},
}));

import { refreshProducts } from "../refresh-products";

// ============================================================================
// HELPERS
// ============================================================================

const emptyFormData = createMockFormData({});

// ============================================================================
// TESTS
// ============================================================================

describe("refreshProducts", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@synclune.fr" },
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
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdmin.mockResolvedValue({ error: authError });
		const result = await refreshProducts(undefined, emptyFormData);
		expect(result).toEqual(authError);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await refreshProducts(undefined, emptyFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should invalidate all product cache tags", async () => {
		await refreshProducts(undefined, emptyFormData);
		expect(mockUpdateTag).toHaveBeenCalledWith("products-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("product-counts");
		expect(mockUpdateTag).toHaveBeenCalledWith("max-product-price");
		expect(mockUpdateTag).toHaveBeenCalledWith("skus-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
	});

	it("should invalidate exactly 5 cache tags", async () => {
		await refreshProducts(undefined, emptyFormData);
		expect(mockUpdateTag).toHaveBeenCalledTimes(5);
	});

	it("should invalidate each cache tag exactly once", async () => {
		await refreshProducts(undefined, emptyFormData);
		const calls = mockUpdateTag.mock.calls.flat();
		const unique = new Set(calls);
		expect(unique.size).toBe(calls.length);
	});

	it("should write an audit log entry with action product.refreshCache", async () => {
		await refreshProducts(undefined, emptyFormData);
		expect(mockLogAudit).toHaveBeenCalledTimes(1);
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "product.refreshCache",
				targetType: "product",
				targetId: "all",
				adminId: "admin-1",
			}),
		);
	});

	it("should fall back to admin email when name is missing in audit log", async () => {
		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: null, email: "admin@synclune.fr" },
		});
		await refreshProducts(undefined, emptyFormData);
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({ adminName: "admin@synclune.fr" }),
		);
	});

	it("should return success with confirmation message", async () => {
		const result = await refreshProducts(undefined, emptyFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith("Produits rafraîchis");
	});

	it("should handle unexpected error via handleActionError", async () => {
		mockUpdateTag.mockImplementation(() => {
			throw new Error("cache crash");
		});
		const result = await refreshProducts(undefined, emptyFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalled();
	});
});
