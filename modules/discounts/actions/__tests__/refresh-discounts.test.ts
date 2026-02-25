import { describe, it, expect, vi, beforeEach } from "vitest"
import { ActionStatus } from "@/shared/types/server-action"

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
vi.mock("@/shared/lib/rate-limit-config", () => ({ ADMIN_DISCOUNT_LIMITS: { REFRESH: "discount-refresh" } }))
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }))
vi.mock("@/shared/lib/actions", () => ({
	handleActionError: mockHandleActionError,
	success: mockSuccess,
}))
vi.mock("../constants/cache", () => ({
	DISCOUNT_CACHE_TAGS: {
		LIST: "discounts-list",
	},
}))
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_BADGES: "admin-badges",
	},
}))

import { refreshDiscounts } from "../refresh-discounts"

// ============================================================================
// TESTS
// ============================================================================

describe("refreshDiscounts", () => {
	const mockFormData = new FormData()

	beforeEach(() => {
		vi.resetAllMocks()

		mockRequireAdmin.mockResolvedValue({ success: true })
		mockEnforceRateLimit.mockResolvedValue({ success: true })
		mockSuccess.mockImplementation((msg: string) => ({ status: ActionStatus.SUCCESS, message: msg }))
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}))
	})

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		})
		const result = await refreshDiscounts(undefined, mockFormData)
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED)
		expect(mockUpdateTag).not.toHaveBeenCalled()
	})

	it("should return rate limit error when rate limit is exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit dépassé" },
		})
		const result = await refreshDiscounts(undefined, mockFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
		expect(mockUpdateTag).not.toHaveBeenCalled()
	})

	it("should invalidate discounts and admin badges cache tags on success", async () => {
		mockSuccess.mockReturnValue({ status: ActionStatus.SUCCESS, message: "Codes promo rafraîchis" })
		await refreshDiscounts(undefined, mockFormData)
		expect(mockUpdateTag).toHaveBeenCalledWith("discounts-list")
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges")
		expect(mockUpdateTag).toHaveBeenCalledTimes(2)
	})

	it("should return success after cache invalidation", async () => {
		const result = await refreshDiscounts(undefined, mockFormData)
		expect(mockSuccess).toHaveBeenCalledWith("Codes promo rafraîchis")
		expect(result.status).toBe(ActionStatus.SUCCESS)
	})

	it("should call handleActionError on unexpected exception", async () => {
		mockRequireAdmin.mockRejectedValue(new Error("DB crash"))
		const result = await refreshDiscounts(undefined, mockFormData)
		expect(mockHandleActionError).toHaveBeenCalled()
		expect(result.status).toBe(ActionStatus.ERROR)
	})
})
