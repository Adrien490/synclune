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
	mockNotFound,
	mockGetProductTypeInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		productType: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockNotFound: vi.fn(),
	mockGetProductTypeInvalidationTags: vi.fn(),
}))

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }))
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }))
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({ enforceRateLimitForCurrentUser: mockEnforceRateLimit }))
vi.mock("@/shared/lib/rate-limit-config", () => ({ ADMIN_PRODUCT_TYPE_LIMITS: { TOGGLE_STATUS: "pt-toggle" } }))
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }))
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
	notFound: mockNotFound,
}))
vi.mock("../../schemas/product-type.schemas", () => ({ toggleProductTypeStatusSchema: {} }))
vi.mock("../../utils/cache.utils", () => ({
	getProductTypeInvalidationTags: mockGetProductTypeInvalidationTags,
}))

import { toggleProductTypeStatus } from "../toggle-product-type-status"

// ============================================================================
// HELPERS
// ============================================================================

function makeProductType(overrides: Record<string, unknown> = {}) {
	return {
		id: "pt-1",
		label: "Bague",
		isSystem: false,
		...overrides,
	}
}

function makeFormData(productTypeId: string, isActive: boolean) {
	return createMockFormData({ productTypeId, isActive: String(isActive) })
}

// ============================================================================
// TESTS
// ============================================================================

describe("toggleProductTypeStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		mockRequireAdmin.mockResolvedValue({ success: true })
		mockEnforceRateLimit.mockResolvedValue({ success: true })
		mockValidateInput.mockReturnValue({ data: { productTypeId: "pt-1", isActive: true } })
		mockGetProductTypeInvalidationTags.mockReturnValue(["product-types-list"])
		mockPrisma.productType.findUnique.mockResolvedValue(makeProductType())
		mockPrisma.productType.update.mockResolvedValue({ id: "pt-1" })

		mockSuccess.mockImplementation((msg: string) => ({ status: ActionStatus.SUCCESS, message: msg }))
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }))
		mockNotFound.mockImplementation((label: string) => ({ status: ActionStatus.NOT_FOUND, message: `${label} non trouvé` }))
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({ status: ActionStatus.ERROR, message: fallback }))
	})

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({ error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" } })
		const result = await toggleProductTypeStatus(undefined, makeFormData("pt-1", true))
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED)
	})

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({ error: { status: ActionStatus.ERROR, message: "Rate limit" } })
		const result = await toggleProductTypeStatus(undefined, makeFormData("pt-1", true))
		expect(result.status).toBe(ActionStatus.ERROR)
	})

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({ error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalide" } })
		const result = await toggleProductTypeStatus(undefined, makeFormData("pt-1", true))
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR)
	})

	it("should return not found when product type does not exist", async () => {
		mockPrisma.productType.findUnique.mockResolvedValue(null)
		const result = await toggleProductTypeStatus(undefined, makeFormData("pt-1", true))
		expect(mockNotFound).toHaveBeenCalledWith("Type de produit")
		expect(result.status).toBe(ActionStatus.NOT_FOUND)
	})

	it("should return error when product type is a system type", async () => {
		mockPrisma.productType.findUnique.mockResolvedValue(makeProductType({ isSystem: true, label: "Collier" }))
		const result = await toggleProductTypeStatus(undefined, makeFormData("pt-1", true))
		expect(result.status).toBe(ActionStatus.ERROR)
		expect(result.message).toContain("systeme")
		expect(result.message).toContain("Collier")
	})

	it("should activate type and return correct success message", async () => {
		mockValidateInput.mockReturnValue({ data: { productTypeId: "pt-1", isActive: true } })
		const result = await toggleProductTypeStatus(undefined, makeFormData("pt-1", true))
		expect(mockPrisma.productType.update).toHaveBeenCalledWith({
			where: { id: "pt-1" },
			data: { isActive: true },
		})
		expect(mockSuccess).toHaveBeenCalledWith("Type activé avec succès")
		expect(result.status).toBe(ActionStatus.SUCCESS)
	})

	it("should deactivate type and return correct success message", async () => {
		mockValidateInput.mockReturnValue({ data: { productTypeId: "pt-1", isActive: false } })
		const result = await toggleProductTypeStatus(undefined, makeFormData("pt-1", false))
		expect(mockPrisma.productType.update).toHaveBeenCalledWith({
			where: { id: "pt-1" },
			data: { isActive: false },
		})
		expect(mockSuccess).toHaveBeenCalledWith("Type désactivé avec succès")
		expect(result.status).toBe(ActionStatus.SUCCESS)
	})

	it("should update DB with correct productTypeId", async () => {
		await toggleProductTypeStatus(undefined, makeFormData("pt-1", true))
		expect(mockPrisma.productType.update).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: "pt-1" } })
		)
	})

	it("should invalidate cache after status update", async () => {
		await toggleProductTypeStatus(undefined, makeFormData("pt-1", true))
		expect(mockGetProductTypeInvalidationTags).toHaveBeenCalled()
		expect(mockUpdateTag).toHaveBeenCalledWith("product-types-list")
	})

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.productType.update.mockRejectedValue(new Error("DB crash"))
		const result = await toggleProductTypeStatus(undefined, makeFormData("pt-1", true))
		expect(mockHandleActionError).toHaveBeenCalled()
		expect(result.status).toBe(ActionStatus.ERROR)
	})
})
