import { describe, it, expect, vi, beforeEach } from "vitest"
import { ActionStatus } from "@/shared/types/server-action"
import { createMockFormData, VALID_CUID } from "@/test/factories"

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockGetInventoryInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		productSku: { findUnique: vi.fn() },
		$executeRaw: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockGetInventoryInvalidationTags: vi.fn(),
}))

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }))
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }))
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({ enforceRateLimitForCurrentUser: mockEnforceRateLimit }))
vi.mock("@/shared/lib/rate-limit-config", () => ({ ADMIN_SKU_ADJUST_STOCK_LIMIT: "sku-adjust" }))
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }))
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}))
vi.mock("../../schemas/sku.schemas", () => ({ adjustSkuStockSchema: {} }))
vi.mock("../../utils/cache.utils", () => ({
	getInventoryInvalidationTags: mockGetInventoryInvalidationTags,
}))

import { adjustSkuStock } from "../adjust-sku-stock"

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({
	skuId: VALID_CUID,
	adjustment: "5",
})

// ============================================================================
// TESTS
// ============================================================================

describe("adjustSkuStock", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		mockRequireAdmin.mockResolvedValue({ success: true })
		mockEnforceRateLimit.mockResolvedValue({ success: true })
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID, adjustment: 5 } })
		mockGetInventoryInvalidationTags.mockReturnValue(["sku-stock"])
		// Use mockImplementation for tagged template literal compatibility
		mockPrisma.$executeRaw.mockImplementation(() => Promise.resolve(1))
		mockPrisma.productSku.findUnique.mockResolvedValue({
			id: VALID_CUID,
			sku: "BRC-01",
			inventory: 15,
			productId: "prod-1",
			product: { slug: "bracelet-lune" },
		})

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS, message: msg, data,
		}))
		mockError.mockImplementation((msg: string) => ({
			status: ActionStatus.ERROR, message: msg,
		}))
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR, message: fallback,
		}))
	})

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({ error: { status: ActionStatus.UNAUTHORIZED, message: "No" } })
		const result = await adjustSkuStock(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED)
	})

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({ error: { status: ActionStatus.ERROR, message: "Rate" } })
		const result = await adjustSkuStock(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
	})

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({ error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" } })
		const result = await adjustSkuStock(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR)
	})

	it("should call $executeRaw for stock adjustment", async () => {
		const result = await adjustSkuStock(undefined, validFormData)
		expect(mockPrisma.$executeRaw).toHaveBeenCalled()
		expect(result.status).toBe(ActionStatus.SUCCESS)
	})

	it("should return error when SKU not found after update", async () => {
		mockPrisma.$executeRaw.mockImplementation(() => Promise.resolve(0))
		const result = await adjustSkuStock(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
	})

	it("should prevent negative stock on decrement", async () => {
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID, adjustment: -20 } })
		mockPrisma.$executeRaw.mockImplementation(() => Promise.resolve(0))
		mockPrisma.productSku.findUnique.mockResolvedValueOnce({ inventory: 5 })
		const fd = createMockFormData({ skuId: VALID_CUID, adjustment: "-20" })

		const result = await adjustSkuStock(undefined, fd)

		expect(result.status).toBe(ActionStatus.ERROR)
	})

	it("should return success data with inventory info", async () => {
		const result = await adjustSkuStock(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.SUCCESS)
		expect(result.data).toBeDefined()
	})

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$executeRaw.mockImplementation(() => Promise.reject(new Error("DB crash")))
		const result = await adjustSkuStock(undefined, validFormData)
		expect(mockHandleActionError).toHaveBeenCalled()
		expect(result.status).toBe(ActionStatus.ERROR)
	})
})
