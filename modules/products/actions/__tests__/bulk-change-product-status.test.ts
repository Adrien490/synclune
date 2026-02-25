import { describe, it, expect, vi, beforeEach } from "vitest"
import { ActionStatus } from "@/shared/types/server-action"
import { createMockFormData, VALID_CUID, VALID_CUID_2 } from "@/test/factories"

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
	mockNotFound,
	mockValidationError,
	mockValidateProductForPublication,
	mockGetProductInvalidationTags,
	mockGetCollectionInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		product: { findMany: vi.fn(), updateMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockNotFound: vi.fn(),
	mockValidationError: vi.fn(),
	mockValidateProductForPublication: vi.fn(),
	mockGetProductInvalidationTags: vi.fn(),
	mockGetCollectionInvalidationTags: vi.fn(),
}))

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }))
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }))
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({ enforceRateLimitForCurrentUser: mockEnforceRateLimit }))
vi.mock("@/shared/lib/rate-limit-config", () => ({ ADMIN_PRODUCT_BULK_STATUS_LIMIT: "admin-product-bulk-status" }))
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }))
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	notFound: mockNotFound,
	validationError: mockValidationError,
}))
vi.mock("../../schemas/product.schemas", () => ({ bulkChangeProductStatusSchema: {} }))
vi.mock("../../services/product-validation.service", () => ({
	validateProductForPublication: mockValidateProductForPublication,
}))
vi.mock("../../utils/cache.utils", () => ({
	getProductInvalidationTags: mockGetProductInvalidationTags,
}))
vi.mock("@/modules/collections/utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}))

import { bulkChangeProductStatus } from "../bulk-change-product-status"

// ============================================================================
// HELPERS
// ============================================================================

const productIds = [VALID_CUID, VALID_CUID_2]

const validFormData = createMockFormData({
	productIds: JSON.stringify(productIds),
	targetStatus: "PUBLIC",
})

const validatedData = {
	productIds,
	targetStatus: "PUBLIC",
}

const makeProduct = (id: string, slug: string, title: string, status = "DRAFT") => ({
	id,
	title,
	slug,
	status,
	collections: [{ collection: { slug: "bijoux" } }],
	skus: [
		{
			id: "sku_1",
			isActive: true,
			inventory: 5,
			images: [{ id: "img_1" }],
		},
	],
})

const existingProducts = [
	makeProduct(VALID_CUID, "bracelet-lune", "Bracelet Lune"),
	makeProduct(VALID_CUID_2, "collier-etoile", "Collier Etoile"),
]

// ============================================================================
// TESTS
// ============================================================================

describe("bulkChangeProductStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		mockRequireAdmin.mockResolvedValue({ success: true })
		mockEnforceRateLimit.mockResolvedValue({ success: true })
		mockValidateInput.mockReturnValue({ data: { ...validatedData } })
		mockValidateProductForPublication.mockReturnValue({ isValid: true })
		mockGetProductInvalidationTags.mockReturnValue(["products-list"])
		mockGetCollectionInvalidationTags.mockReturnValue(["collections-list"])

		mockPrisma.product.findMany.mockResolvedValue(existingProducts)
		mockPrisma.product.updateMany.mockResolvedValue({ count: 2 })

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({ status: ActionStatus.SUCCESS, message: msg, data }))
		mockNotFound.mockImplementation((entity: string) => ({ status: ActionStatus.NOT_FOUND, message: `${entity} introuvable` }))
		mockValidationError.mockImplementation((msg: string) => ({ status: ActionStatus.VALIDATION_ERROR, message: msg }))
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR, message: fallback,
		}))
	})

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" }
		mockRequireAdmin.mockResolvedValue({ error: authError })
		const result = await bulkChangeProductStatus(undefined, validFormData)
		expect(result).toEqual(authError)
	})

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({ error: { status: ActionStatus.ERROR, message: "Rate" } })
		const result = await bulkChangeProductStatus(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
	})

	it("should return validation error for invalid JSON in productIds", async () => {
		const badFormData = createMockFormData({ productIds: "not-json", targetStatus: "PUBLIC" })
		const result = await bulkChangeProductStatus(undefined, badFormData)
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR)
	})

	it("should return validation error when Zod schema fails", async () => {
		const valErr = { status: ActionStatus.VALIDATION_ERROR, message: "Statut invalide" }
		mockValidateInput.mockReturnValue({ error: valErr })
		const result = await bulkChangeProductStatus(undefined, validFormData)
		expect(result).toEqual(valErr)
	})

	it("should return not found when some products do not exist", async () => {
		mockPrisma.product.findMany.mockResolvedValue([existingProducts[0]])
		const result = await bulkChangeProductStatus(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.NOT_FOUND)
	})

	it("should return validation error when any product is archived", async () => {
		const archivedProducts = [
			makeProduct(VALID_CUID, "bracelet-lune", "Bracelet Lune", "ARCHIVED"),
			makeProduct(VALID_CUID_2, "collier-etoile", "Collier Etoile", "DRAFT"),
		]
		mockPrisma.product.findMany.mockResolvedValue(archivedProducts)
		const result = await bulkChangeProductStatus(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR)
		expect(result.message).toContain("archives")
	})

	it("should validate each product for publication when targeting PUBLIC", async () => {
		await bulkChangeProductStatus(undefined, validFormData)
		expect(mockValidateProductForPublication).toHaveBeenCalledTimes(existingProducts.length)
	})

	it("should return validation error when a product fails publication validation", async () => {
		mockValidateProductForPublication.mockReturnValueOnce({ isValid: false, errorMessage: "SKU manquant" })
		const result = await bulkChangeProductStatus(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR)
		expect(result.message).toContain("Bracelet Lune")
	})

	it("should skip publication validation when targeting DRAFT", async () => {
		mockValidateInput.mockReturnValue({ data: { productIds, targetStatus: "DRAFT" } })
		const draftFormData = createMockFormData({ productIds: JSON.stringify(productIds), targetStatus: "DRAFT" })
		await bulkChangeProductStatus(undefined, draftFormData)
		expect(mockValidateProductForPublication).not.toHaveBeenCalled()
	})

	it("should call product updateMany with the target status", async () => {
		await bulkChangeProductStatus(undefined, validFormData)
		expect(mockPrisma.product.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({ data: { status: "PUBLIC" } })
		)
	})

	it("should invalidate product cache tags for each product", async () => {
		await bulkChangeProductStatus(undefined, validFormData)
		expect(mockGetProductInvalidationTags).toHaveBeenCalledTimes(existingProducts.length)
		expect(mockUpdateTag).toHaveBeenCalled()
	})

	it("should invalidate deduplicated collection cache tags", async () => {
		await bulkChangeProductStatus(undefined, validFormData)
		// Both products share "bijoux" — deduplication means only one call
		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledWith("bijoux")
		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledTimes(1)
	})

	it("should return success with product count and target status", async () => {
		const result = await bulkChangeProductStatus(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.SUCCESS)
		expect(mockSuccess).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ count: 2, targetStatus: "PUBLIC" })
		)
	})

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.product.findMany.mockRejectedValue(new Error("DB crash"))
		const result = await bulkChangeProductStatus(undefined, validFormData)
		expect(mockHandleActionError).toHaveBeenCalled()
		expect(result.status).toBe(ActionStatus.ERROR)
	})
})
