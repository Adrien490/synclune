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
	mockValidationError,
	mockNotFound,
	mockValidateProductForPublication,
	mockGetProductInvalidationTags,
	mockGetCollectionInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		product: { findUnique: vi.fn(), update: vi.fn() },
		productSku: { updateMany: vi.fn() },
		orderItem: { count: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockValidationError: vi.fn(),
	mockNotFound: vi.fn(),
	mockValidateProductForPublication: vi.fn(),
	mockGetProductInvalidationTags: vi.fn(),
	mockGetCollectionInvalidationTags: vi.fn(),
}))

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }))
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }))
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({ enforceRateLimitForCurrentUser: mockEnforceRateLimit }))
vi.mock("@/shared/lib/rate-limit-config", () => ({ ADMIN_PRODUCT_TOGGLE_STATUS_LIMIT: "admin-product-toggle-status" }))
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }))
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
	validationError: mockValidationError,
	notFound: mockNotFound,
}))
vi.mock("../../services/product-validation.service", () => ({
	validateProductForPublication: mockValidateProductForPublication,
}))
vi.mock("../../schemas/product.schemas", () => ({ toggleProductStatusSchema: {} }))
vi.mock("../../utils/cache.utils", () => ({
	getProductInvalidationTags: mockGetProductInvalidationTags,
}))
vi.mock("@/modules/collections/utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}))

import { toggleProductStatus } from "../toggle-product-status"

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({
	productId: VALID_CUID,
	currentStatus: "DRAFT",
	targetStatus: "",
})

const mockProduct = {
	id: VALID_CUID,
	title: "Bracelet Lune",
	slug: "bracelet-lune",
	status: "DRAFT",
	description: "Un bracelet artisanal",
	collections: [{ collection: { slug: "bijoux" } }],
	skus: [
		{
			id: "sku_1",
			isActive: true,
			inventory: 5,
			images: [{ id: "img_1" }],
		},
	],
}

// ============================================================================
// TESTS
// ============================================================================

describe("toggleProductStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		mockRequireAdmin.mockResolvedValue({ success: true })
		mockEnforceRateLimit.mockResolvedValue({ success: true })
		mockValidateInput.mockReturnValue({
			data: { productId: VALID_CUID, currentStatus: "DRAFT", targetStatus: null },
		})
		mockValidateProductForPublication.mockReturnValue({ isValid: true })
		mockGetProductInvalidationTags.mockReturnValue(["products-list", `product-bracelet-lune`])
		mockGetCollectionInvalidationTags.mockReturnValue(["collection-bijoux"])

		mockPrisma.product.findUnique.mockResolvedValue(mockProduct)
		mockPrisma.orderItem.count.mockResolvedValue(0)
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma))
		mockPrisma.product.update.mockResolvedValue({ id: VALID_CUID })
		mockPrisma.productSku.updateMany.mockResolvedValue({ count: 1 })

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({ status: ActionStatus.SUCCESS, message: msg, data }))
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }))
		mockValidationError.mockImplementation((msg: string) => ({ status: ActionStatus.VALIDATION_ERROR, message: msg }))
		mockNotFound.mockImplementation((msg: string) => ({ status: ActionStatus.NOT_FOUND, message: msg }))
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR, message: fallback,
		}))
	})

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" }
		mockRequireAdmin.mockResolvedValue({ error: authError })
		const result = await toggleProductStatus(undefined, validFormData)
		expect(result).toEqual(authError)
	})

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({ error: { status: ActionStatus.ERROR, message: "Rate limit" } })
		const result = await toggleProductStatus(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
	})

	it("should return validation error for invalid data", async () => {
		const valErr = { status: ActionStatus.VALIDATION_ERROR, message: "Champ requis" }
		mockValidateInput.mockReturnValue({ error: valErr })
		const result = await toggleProductStatus(undefined, validFormData)
		expect(result).toEqual(valErr)
	})

	it("should return not found when product does not exist", async () => {
		mockPrisma.product.findUnique.mockResolvedValue(null)
		mockNotFound.mockReturnValue({ status: ActionStatus.NOT_FOUND, message: "Le produit introuvable" })
		const result = await toggleProductStatus(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.NOT_FOUND)
	})

	it("should toggle DRAFT to PUBLIC when no targetStatus", async () => {
		mockValidateInput.mockReturnValue({
			data: { productId: VALID_CUID, currentStatus: "DRAFT", targetStatus: null },
		})
		const result = await toggleProductStatus(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.SUCCESS)
		expect(mockValidateProductForPublication).toHaveBeenCalledWith(mockProduct)
	})

	it("should toggle PUBLIC to DRAFT when no targetStatus", async () => {
		mockValidateInput.mockReturnValue({
			data: { productId: VALID_CUID, currentStatus: "PUBLIC", targetStatus: null },
		})
		mockPrisma.product.findUnique.mockResolvedValue({ ...mockProduct, status: "PUBLIC" })
		const result = await toggleProductStatus(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.SUCCESS)
		// DRAFT target - no publication validation needed
		expect(mockValidateProductForPublication).not.toHaveBeenCalled()
	})

	it("should restore ARCHIVED to PUBLIC when no targetStatus", async () => {
		mockValidateInput.mockReturnValue({
			data: { productId: VALID_CUID, currentStatus: "ARCHIVED", targetStatus: null },
		})
		mockPrisma.product.findUnique.mockResolvedValue({ ...mockProduct, status: "ARCHIVED" })
		const result = await toggleProductStatus(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.SUCCESS)
		expect(mockValidateProductForPublication).toHaveBeenCalled()
	})

	it("should use targetStatus directly when provided", async () => {
		mockValidateInput.mockReturnValue({
			data: { productId: VALID_CUID, currentStatus: "PUBLIC", targetStatus: "ARCHIVED" },
		})
		mockPrisma.product.findUnique.mockResolvedValue({ ...mockProduct, status: "PUBLIC" })
		await toggleProductStatus(undefined, validFormData)
		// ARCHIVED target - should deactivate SKUs
		expect(mockPrisma.productSku.updateMany).toHaveBeenCalled()
	})

	it("should return validation error when targeting PUBLIC with invalid product", async () => {
		mockValidateProductForPublication.mockReturnValue({ isValid: false, errorMessage: "SKU actif requis" })
		const result = await toggleProductStatus(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR)
		expect(mockValidationError).toHaveBeenCalledWith("SKU actif requis")
	})

	it("should include warning in success when archiving product with orders", async () => {
		mockValidateInput.mockReturnValue({
			data: { productId: VALID_CUID, currentStatus: "PUBLIC", targetStatus: "ARCHIVED" },
		})
		mockPrisma.orderItem.count.mockResolvedValue(3)
		await toggleProductStatus(undefined, validFormData)
		expect(mockSuccess).toHaveBeenCalledWith(
			expect.stringContaining("3 commande"),
			expect.objectContaining({ warning: expect.stringContaining("3 commande") })
		)
	})

	it("should not include warning when archiving product with no orders", async () => {
		mockValidateInput.mockReturnValue({
			data: { productId: VALID_CUID, currentStatus: "PUBLIC", targetStatus: "ARCHIVED" },
		})
		mockPrisma.orderItem.count.mockResolvedValue(0)
		await toggleProductStatus(undefined, validFormData)
		expect(mockSuccess).toHaveBeenCalledWith(
			expect.not.stringContaining("commande"),
			expect.objectContaining({ warning: undefined })
		)
	})

	it("should deactivate all SKUs when archiving", async () => {
		mockValidateInput.mockReturnValue({
			data: { productId: VALID_CUID, currentStatus: "PUBLIC", targetStatus: "ARCHIVED" },
		})
		await toggleProductStatus(undefined, validFormData)
		expect(mockPrisma.productSku.updateMany).toHaveBeenCalledWith({
			where: { productId: VALID_CUID },
			data: { isActive: false },
		})
	})

	it("should not deactivate SKUs when setting to PUBLIC", async () => {
		mockValidateInput.mockReturnValue({
			data: { productId: VALID_CUID, currentStatus: "DRAFT", targetStatus: null },
		})
		await toggleProductStatus(undefined, validFormData)
		expect(mockPrisma.productSku.updateMany).not.toHaveBeenCalled()
	})

	it("should invalidate product and collection cache tags", async () => {
		await toggleProductStatus(undefined, validFormData)
		expect(mockUpdateTag).toHaveBeenCalled()
		expect(mockGetProductInvalidationTags).toHaveBeenCalledWith("bracelet-lune", VALID_CUID)
		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledWith("bijoux")
	})

	it("should use transaction for update", async () => {
		await toggleProductStatus(undefined, validFormData)
		expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function))
	})

	it("should handle unexpected error", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"))
		const result = await toggleProductStatus(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
		expect(mockHandleActionError).toHaveBeenCalled()
	})
})
