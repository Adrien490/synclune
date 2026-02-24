import { describe, it, expect, vi, beforeEach } from "vitest"
import { ActionStatus } from "@/shared/types/server-action"
import { createMockFormData, createMockOrder, VALID_CUID } from "@/test/factories"

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
	mockSoftDelete,
	mockGetOrderInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockSoftDelete: { order: vi.fn() },
	mockGetOrderInvalidationTags: vi.fn(),
}))

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	softDelete: mockSoftDelete,
	notDeleted: { deletedAt: null },
}))
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }))
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({ enforceRateLimitForCurrentUser: mockEnforceRateLimit }))
vi.mock("@/shared/lib/rate-limit-config", () => ({ ADMIN_ORDER_LIMITS: { SINGLE_OPERATIONS: "admin-order-single" } }))
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }))
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}))
vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOT_FOUND: "La commande n'existe pas.",
		HAS_INVOICE: "Cette commande ne peut pas etre supprimee car une facture a ete emise.",
		CANNOT_DELETE_PAID: "Cette commande ne peut pas etre supprimee car elle a ete payee.",
		DELETE_FAILED: "Erreur lors de la suppression.",
	},
}))
vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}))
vi.mock("../../schemas/order.schemas", () => ({
	deleteOrderSchema: {},
}))

import { deleteOrder } from "../delete-order"

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ id: VALID_CUID })

// ============================================================================
// TESTS
// ============================================================================

describe("deleteOrder", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		mockRequireAdmin.mockResolvedValue({ success: true })
		mockEnforceRateLimit.mockResolvedValue({ success: true })
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID } })
		mockSoftDelete.order.mockResolvedValue(undefined)
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list"])

		mockPrisma.order.findUnique.mockResolvedValue(
			createMockOrder({ invoiceNumber: null, paymentStatus: "PENDING" })
		)

		mockSuccess.mockImplementation((msg: string) => ({ status: ActionStatus.SUCCESS, message: msg }))
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }))
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR, message: fallback,
		}))
	})

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" }
		mockRequireAdmin.mockResolvedValue({ error: authError })
		const result = await deleteOrder(undefined, validFormData)
		expect(result).toEqual(authError)
	})

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({ error: { status: ActionStatus.ERROR, message: "Rate" } })
		const result = await deleteOrder(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
	})

	it("should return validation error for invalid ID", async () => {
		const valErr = { status: ActionStatus.VALIDATION_ERROR, message: "ID invalide" }
		mockValidateInput.mockReturnValue({ error: valErr })
		const result = await deleteOrder(undefined, validFormData)
		expect(result).toEqual(valErr)
	})

	it("should return error when order not found", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null)
		const result = await deleteOrder(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
		expect(result.message).toContain("n'existe pas")
	})

	it("should return error when order has invoice", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createMockOrder({ invoiceNumber: "FAC-2026-001", paymentStatus: "PENDING" })
		)
		const result = await deleteOrder(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
		expect(result.message).toContain("facture")
	})

	it("should return error when order was paid", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createMockOrder({ invoiceNumber: null, paymentStatus: "PAID" })
		)
		const result = await deleteOrder(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
		expect(result.message).toContain("payee")
	})

	it("should return error when order was refunded", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createMockOrder({ invoiceNumber: null, paymentStatus: "REFUNDED" })
		)
		const result = await deleteOrder(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
	})

	it("should soft delete eligible order", async () => {
		const result = await deleteOrder(undefined, validFormData)
		expect(mockSoftDelete.order).toHaveBeenCalledWith(VALID_CUID)
		expect(result.status).toBe(ActionStatus.SUCCESS)
	})

	it("should invalidate cache after deletion", async () => {
		await deleteOrder(undefined, validFormData)
		expect(mockUpdateTag).toHaveBeenCalled()
	})

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.order.findUnique.mockRejectedValue(new Error("DB crash"))
		const result = await deleteOrder(undefined, validFormData)
		expect(mockHandleActionError).toHaveBeenCalled()
		expect(result.status).toBe(ActionStatus.ERROR)
	})
})
