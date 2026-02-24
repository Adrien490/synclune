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
			deleteMany: vi.fn(),
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
vi.mock("../../schemas/product-type.schemas", () => ({ bulkDeleteProductTypesSchema: {} }))
vi.mock("../../utils/cache.utils", () => ({
	getProductTypeInvalidationTags: mockGetProductTypeInvalidationTags,
}))

import { bulkDeleteProductTypes } from "../bulk-delete-product-types"

// ============================================================================
// HELPERS
// ============================================================================

function makeProductType(id: string, label: string, isSystem = false, productCount = 0) {
	return { id, label, isSystem, _count: { products: productCount } }
}

function makeFormData(ids: string[]) {
	return createMockFormData({ ids: JSON.stringify(ids) })
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkDeleteProductTypes", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		mockRequireAdmin.mockResolvedValue({ success: true })
		mockEnforceRateLimit.mockResolvedValue({ success: true })
		mockValidateInput.mockReturnValue({ data: { ids: ["pt-1", "pt-2"] } })
		mockGetProductTypeInvalidationTags.mockReturnValue(["product-types-list"])
		mockPrisma.productType.findMany.mockResolvedValue([
			makeProductType("pt-1", "Bague"),
			makeProductType("pt-2", "Bracelet"),
		])
		mockPrisma.productType.deleteMany.mockResolvedValue({ count: 2 })

		mockSuccess.mockImplementation((msg: string) => ({ status: ActionStatus.SUCCESS, message: msg }))
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }))
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({ status: ActionStatus.ERROR, message: fallback }))
	})

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({ error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" } })
		const result = await bulkDeleteProductTypes(undefined, makeFormData(["pt-1"]))
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED)
	})

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({ error: { status: ActionStatus.ERROR, message: "Rate limit" } })
		const result = await bulkDeleteProductTypes(undefined, makeFormData(["pt-1"]))
		expect(result.status).toBe(ActionStatus.ERROR)
	})

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({ error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalide" } })
		const result = await bulkDeleteProductTypes(undefined, makeFormData([]))
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR)
	})

	it("should return error when ids array is empty after validation", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: [] } })
		const result = await bulkDeleteProductTypes(undefined, makeFormData([]))
		expect(result.status).toBe(ActionStatus.ERROR)
		expect(result.message).toContain("Au moins")
	})

	it("should return error when all types are system types", async () => {
		mockPrisma.productType.findMany.mockResolvedValue([
			makeProductType("pt-1", "Bague", true),
			makeProductType("pt-2", "Bracelet", true),
		])
		const result = await bulkDeleteProductTypes(undefined, makeFormData(["pt-1", "pt-2"]))
		expect(result.status).toBe(ActionStatus.ERROR)
		expect(result.message).toContain("système")
	})

	it("should return error when all types have active products", async () => {
		mockPrisma.productType.findMany.mockResolvedValue([
			makeProductType("pt-1", "Bague", false, 2),
			makeProductType("pt-2", "Bracelet", false, 5),
		])
		const result = await bulkDeleteProductTypes(undefined, makeFormData(["pt-1", "pt-2"]))
		expect(result.status).toBe(ActionStatus.ERROR)
		expect(result.message).toContain("produits actifs")
	})

	it("should delete deletable types and skip system/active-product types", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: ["pt-1", "pt-2", "pt-3"] } })
		mockPrisma.productType.findMany.mockResolvedValue([
			makeProductType("pt-1", "Bague"),
			makeProductType("pt-2", "Systeme", true),
			makeProductType("pt-3", "Avec Produits", false, 3),
		])
		const result = await bulkDeleteProductTypes(undefined, makeFormData(["pt-1", "pt-2", "pt-3"]))
		expect(mockPrisma.productType.deleteMany).toHaveBeenCalledWith({
			where: { id: { in: ["pt-1"] } },
		})
		expect(result.status).toBe(ActionStatus.SUCCESS)
		expect(result.message).toContain("1 type(s)")
		expect(result.message).toContain("2 ignoré(s)")
	})

	it("should delete all types and return success when all are deletable", async () => {
		const result = await bulkDeleteProductTypes(undefined, makeFormData(["pt-1", "pt-2"]))
		expect(mockPrisma.productType.deleteMany).toHaveBeenCalled()
		expect(result.status).toBe(ActionStatus.SUCCESS)
	})

	it("should invalidate cache after deletion", async () => {
		await bulkDeleteProductTypes(undefined, makeFormData(["pt-1", "pt-2"]))
		expect(mockUpdateTag).toHaveBeenCalled()
	})

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.productType.deleteMany.mockRejectedValue(new Error("DB crash"))
		const result = await bulkDeleteProductTypes(undefined, makeFormData(["pt-1"]))
		expect(mockHandleActionError).toHaveBeenCalled()
		expect(result.status).toBe(ActionStatus.ERROR)
	})
})
