import { describe, it, expect, vi, beforeEach } from "vitest"
import { ActionStatus } from "@/shared/types/server-action"
import { createMockFormData } from "@/test/factories"

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
	mockGetProductTypeInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		productType: {
			findMany: vi.fn(),
			updateMany: vi.fn(),
		},
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockGetProductTypeInvalidationTags: vi.fn(),
}))

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }))
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }))
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({ enforceRateLimitForCurrentUser: mockEnforceRateLimit }))
vi.mock("@/shared/lib/rate-limit-config", () => ({ ADMIN_PRODUCT_TYPE_LIMITS: { BULK_OPERATIONS: "pt-bulk" } }))
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }))
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}))
vi.mock("../../schemas/product-type.schemas", () => ({ bulkDeactivateProductTypesSchema: {} }))
vi.mock("../../utils/cache.utils", () => ({
	getProductTypeInvalidationTags: mockGetProductTypeInvalidationTags,
}))

import { bulkDeactivateProductTypes } from "../bulk-deactivate-product-types"

// ============================================================================
// HELPERS
// ============================================================================

function makeSystemType(id: string, label: string) {
	return { id, label }
}

function makeFormData(ids: string[]) {
	return createMockFormData({ ids: JSON.stringify(ids) })
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkDeactivateProductTypes", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		mockRequireAdmin.mockResolvedValue({ success: true })
		mockEnforceRateLimit.mockResolvedValue({ success: true })
		mockValidateInput.mockReturnValue({ data: { ids: ["pt-1", "pt-2"] } })
		mockGetProductTypeInvalidationTags.mockReturnValue(["product-types-list"])
		mockPrisma.productType.findMany.mockResolvedValue([])
		mockPrisma.productType.updateMany.mockResolvedValue({ count: 2 })

		mockSuccess.mockImplementation((msg: string) => ({ status: ActionStatus.SUCCESS, message: msg }))
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }))
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({ status: ActionStatus.ERROR, message: fallback }))
	})

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({ error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" } })
		const result = await bulkDeactivateProductTypes(undefined, makeFormData(["pt-1"]))
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED)
	})

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({ error: { status: ActionStatus.ERROR, message: "Rate limit" } })
		const result = await bulkDeactivateProductTypes(undefined, makeFormData(["pt-1"]))
		expect(result.status).toBe(ActionStatus.ERROR)
	})

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({ error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalide" } })
		const result = await bulkDeactivateProductTypes(undefined, makeFormData([]))
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR)
	})

	it("should return error when ids array is empty after validation", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: [] } })
		const result = await bulkDeactivateProductTypes(undefined, makeFormData([]))
		expect(result.status).toBe(ActionStatus.ERROR)
		expect(result.message).toContain("Au moins")
	})

	it("should return error when all types are system types", async () => {
		mockPrisma.productType.findMany.mockResolvedValue([
			makeSystemType("pt-1", "Bague"),
			makeSystemType("pt-2", "Collier"),
		])
		const result = await bulkDeactivateProductTypes(undefined, makeFormData(["pt-1", "pt-2"]))
		expect(result.status).toBe(ActionStatus.ERROR)
		expect(result.message).toContain("Aucun type modifiable")
		expect(result.message).toContain("2")
	})

	it("should deactivate only non-system types and skip system types", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: ["pt-1", "pt-2", "pt-3"] } })
		mockPrisma.productType.findMany.mockResolvedValue([
			makeSystemType("pt-2", "Systeme"),
		])
		const result = await bulkDeactivateProductTypes(undefined, makeFormData(["pt-1", "pt-2", "pt-3"]))
		expect(mockPrisma.productType.updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["pt-1", "pt-3"] } },
			data: { isActive: false },
		})
		expect(result.status).toBe(ActionStatus.SUCCESS)
	})

	it("should set isActive to false for all deactivatable types", async () => {
		await bulkDeactivateProductTypes(undefined, makeFormData(["pt-1", "pt-2"]))
		expect(mockPrisma.productType.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { isActive: false },
			})
		)
	})

	it("should include deactivated count in success message", async () => {
		const result = await bulkDeactivateProductTypes(undefined, makeFormData(["pt-1", "pt-2"]))
		expect(result.status).toBe(ActionStatus.SUCCESS)
		expect(result.message).toContain("2")
	})

	it("should mention skipped system types in success message when applicable", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: ["pt-1", "pt-2"] } })
		mockPrisma.productType.findMany.mockResolvedValue([
			makeSystemType("pt-2", "Systeme"),
		])
		const result = await bulkDeactivateProductTypes(undefined, makeFormData(["pt-1", "pt-2"]))
		expect(result.status).toBe(ActionStatus.SUCCESS)
		expect(result.message).toContain("1 type(s) systeme ignore(s)")
	})

	it("should not mention skipped types when no system types present", async () => {
		mockPrisma.productType.findMany.mockResolvedValue([])
		const result = await bulkDeactivateProductTypes(undefined, makeFormData(["pt-1", "pt-2"]))
		expect(result.status).toBe(ActionStatus.SUCCESS)
		expect(result.message).not.toContain("ignore")
	})

	it("should invalidate cache after deactivation", async () => {
		await bulkDeactivateProductTypes(undefined, makeFormData(["pt-1", "pt-2"]))
		expect(mockGetProductTypeInvalidationTags).toHaveBeenCalled()
		expect(mockUpdateTag).toHaveBeenCalledWith("product-types-list")
	})

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.productType.updateMany.mockRejectedValue(new Error("DB crash"))
		const result = await bulkDeactivateProductTypes(undefined, makeFormData(["pt-1"]))
		expect(mockHandleActionError).toHaveBeenCalled()
		expect(result.status).toBe(ActionStatus.ERROR)
	})
})
