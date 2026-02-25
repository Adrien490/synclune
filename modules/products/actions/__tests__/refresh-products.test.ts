import { describe, it, expect, vi, beforeEach } from "vitest"
import { ActionStatus } from "@/shared/types/server-action"
import { createMockFormData } from "@/test/factories"

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
}))

vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }))
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({ enforceRateLimitForCurrentUser: mockEnforceRateLimit }))
vi.mock("@/shared/lib/rate-limit-config", () => ({ ADMIN_PRODUCT_REFRESH_LIMIT: "admin-product-refresh" }))
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }))
vi.mock("@/shared/lib/actions", () => ({
	handleActionError: mockHandleActionError,
	success: mockSuccess,
}))
vi.mock("../../constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: {
		LIST: "products-list",
		COUNTS: "product-counts",
		MAX_PRICE: "max-product-price",
		SKUS_LIST: "skus-list",
	},
}))
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_BADGES: "admin-badges",
	},
}))

import { refreshProducts } from "../refresh-products"

// ============================================================================
// HELPERS
// ============================================================================

const emptyFormData = createMockFormData({})

// ============================================================================
// TESTS
// ============================================================================

describe("refreshProducts", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		mockRequireAdmin.mockResolvedValue({ success: true })
		mockEnforceRateLimit.mockResolvedValue({ success: true })

		mockSuccess.mockImplementation((msg: string) => ({ status: ActionStatus.SUCCESS, message: msg }))
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR, message: fallback,
		}))
	})

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" }
		mockRequireAdmin.mockResolvedValue({ error: authError })
		const result = await refreshProducts(undefined, emptyFormData)
		expect(result).toEqual(authError)
	})

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({ error: { status: ActionStatus.ERROR, message: "Rate limit" } })
		const result = await refreshProducts(undefined, emptyFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
	})

	it("should invalidate all product cache tags", async () => {
		await refreshProducts(undefined, emptyFormData)
		expect(mockUpdateTag).toHaveBeenCalledWith("products-list")
		expect(mockUpdateTag).toHaveBeenCalledWith("product-counts")
		expect(mockUpdateTag).toHaveBeenCalledWith("max-product-price")
		expect(mockUpdateTag).toHaveBeenCalledWith("skus-list")
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges")
	})

	it("should invalidate exactly 5 cache tags", async () => {
		await refreshProducts(undefined, emptyFormData)
		expect(mockUpdateTag).toHaveBeenCalledTimes(5)
	})

	it("should return success with confirmation message", async () => {
		const result = await refreshProducts(undefined, emptyFormData)
		expect(result.status).toBe(ActionStatus.SUCCESS)
		expect(mockSuccess).toHaveBeenCalledWith("Produits rafraîchis")
	})

	it("should handle unexpected error via handleActionError", async () => {
		mockUpdateTag.mockImplementation(() => { throw new Error("cache crash") })
		const result = await refreshProducts(undefined, emptyFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
		expect(mockHandleActionError).toHaveBeenCalled()
	})
})
