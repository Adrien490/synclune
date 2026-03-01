import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockHandleActionError,
	mockSuccess,
	mockUpdateTag,
} = vi.hoisted(() => ({
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockUpdateTag: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({ ADMIN_SKU_TOGGLE_STATUS_LIMIT: "sku-toggle" }));
vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	BusinessError: class BusinessError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "BusinessError";
		}
	},
	handleActionError: mockHandleActionError,
	success: mockSuccess,
}));
vi.mock("@/modules/products/constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: {
		SKUS_LIST: "skus-list",
		SKUS: (productId: string) => `product-${productId}-skus`,
	},
}));
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_BADGES: "admin-badges",
		ADMIN_INVENTORY_LIST: "admin-inventory-list",
	},
}));

import { refreshSkus } from "../refresh-skus";

// ============================================================================
// TESTS
// ============================================================================

describe("refreshSkus", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ success: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSuccess.mockReturnValue({ status: ActionStatus.SUCCESS, message: "Variantes rafraichies" });

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await refreshSkus(undefined, createMockFormData({}));
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await refreshSkus(undefined, createMockFormData({}));
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should invalidate SKUS_LIST tag", async () => {
		await refreshSkus(undefined, createMockFormData({}));
		expect(mockUpdateTag).toHaveBeenCalledWith("skus-list");
	});

	it("should invalidate ADMIN_BADGES tag", async () => {
		await refreshSkus(undefined, createMockFormData({}));
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
	});

	it("should invalidate ADMIN_INVENTORY_LIST tag", async () => {
		await refreshSkus(undefined, createMockFormData({}));
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-inventory-list");
	});

	it("should invalidate product-specific SKU tag when valid productId is provided", async () => {
		const formData = createMockFormData({ productId: VALID_CUID });
		await refreshSkus(undefined, formData);
		expect(mockUpdateTag).toHaveBeenCalledWith(`product-${VALID_CUID}-skus`);
	});

	it("should not invalidate product-specific SKU tag when productId is invalid", async () => {
		const formData = createMockFormData({ productId: "not-a-valid-cuid" });
		await refreshSkus(undefined, formData);
		expect(mockUpdateTag).not.toHaveBeenCalledWith(expect.stringContaining("not-a-valid-cuid"));
	});

	it("should not invalidate product-specific SKU tag when no productId is provided", async () => {
		const callsBefore = mockUpdateTag.mock.calls.length;
		await refreshSkus(undefined, createMockFormData({}));
		const callsAfter = mockUpdateTag.mock.calls.length;
		// Only 3 standard tags invalidated (skus-list, admin-badges, admin-inventory-list)
		expect(callsAfter - callsBefore).toBe(3);
	});

	it("should return success after invalidating tags", async () => {
		const result = await refreshSkus(undefined, createMockFormData({}));
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalled();
	});

	it("should call success helper with message", async () => {
		await refreshSkus(undefined, createMockFormData({}));
		expect(mockSuccess).toHaveBeenCalledWith("Variantes rafraichies");
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockUpdateTag.mockImplementation(() => {
			throw new Error("Cache failure");
		});
		const result = await refreshSkus(undefined, createMockFormData({}));
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should invalidate all 4 tags when valid productId is provided", async () => {
		const formData = createMockFormData({ productId: VALID_CUID });
		await refreshSkus(undefined, formData);
		expect(mockUpdateTag).toHaveBeenCalledTimes(4);
	});
});
