import { describe, it, expect, vi, beforeEach } from "vitest"
import { ActionStatus } from "@/shared/types/server-action"
import { createMockFormData, createMockOrder, VALID_CUID } from "@/test/factories"

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockHandleActionError,
	mockSendCancelEmail,
	mockSanitizeText,
	mockCanCancelOrder,
	mockCreateOrderAuditTx,
	mockBuildUrl,
	mockGetOrderInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn(), update: vi.fn() },
		productSku: { update: vi.fn() },
		orderHistory: { create: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSendCancelEmail: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockCanCancelOrder: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockBuildUrl: vi.fn(),
	mockGetOrderInvalidationTags: vi.fn(),
}))

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}))

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}))

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}))

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ORDER_LIMITS: { SINGLE_OPERATIONS: "admin-order-single" },
}))

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}))

vi.mock("@/shared/lib/actions", () => ({
	handleActionError: mockHandleActionError,
}))

vi.mock("@/modules/emails/services/status-emails", () => ({
	sendCancelOrderConfirmationEmail: mockSendCancelEmail,
}))

vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: mockSanitizeText,
}))

vi.mock("../../services/order-status-validation.service", () => ({
	canCancelOrder: mockCanCancelOrder,
}))

vi.mock("../../utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}))

vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: { ACCOUNT: { ORDER_DETAIL: (n: string) => `/compte/commandes/${n}` } },
}))

vi.mock("../../schemas/order.schemas", () => ({
	cancelOrderSchema: {
		safeParse: vi.fn().mockReturnValue({ success: true, data: { id: VALID_CUID, reason: undefined } }),
	},
}))

vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOT_FOUND: "La commande n'existe pas.",
		ALREADY_CANCELLED: "Cette commande est deja annulee.",
		CANCEL_FAILED: "Erreur lors de l'annulation de la commande.",
	},
}))

vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}))

import { cancelOrder } from "../cancel-order"
import { cancelOrderSchema } from "../../schemas/order.schemas"

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ id: VALID_CUID })

function createTxOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		status: "PENDING",
		paymentStatus: "PENDING",
		...overrides,
	})
}

// ============================================================================
// TESTS
// ============================================================================

describe("cancelOrder", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin" },
		})
		mockEnforceRateLimit.mockResolvedValue({ success: true })
		mockSanitizeText.mockImplementation((t: string) => t)
		mockCanCancelOrder.mockReturnValue(true)
		mockCreateOrderAuditTx.mockResolvedValue(undefined)
		mockSendCancelEmail.mockResolvedValue(undefined)
		mockBuildUrl.mockReturnValue("https://synclune.fr/compte/commandes/SYN-2026-0001")
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list", "admin-badges"])

		const txOrder = createTxOrder()
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
			return fn(mockPrisma)
		})
		mockPrisma.order.findUnique.mockResolvedValue(txOrder)
		mockPrisma.order.update.mockResolvedValue({})
		mockPrisma.productSku.update.mockResolvedValue({})

		vi.mocked(cancelOrderSchema.safeParse).mockReturnValue({
			success: true,
			data: { id: VALID_CUID, reason: undefined },
		} as never)

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}))
	})

	// Auth
	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" }
		mockRequireAdminWithUser.mockResolvedValue({ error: authError })

		const result = await cancelOrder(undefined, validFormData)

		expect(result).toEqual(authError)
		expect(mockPrisma.$transaction).not.toHaveBeenCalled()
	})

	// Rate limit
	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" }
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError })

		const result = await cancelOrder(undefined, validFormData)

		expect(result).toEqual(rateLimitError)
		expect(mockPrisma.$transaction).not.toHaveBeenCalled()
	})

	// Validation
	it("should return validation error for invalid ID", async () => {
		vi.mocked(cancelOrderSchema.safeParse).mockReturnValue({
			success: false,
			error: { issues: [{ message: "ID invalide" }] },
		} as never)

		const result = await cancelOrder(undefined, validFormData)

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR)
		expect(result.message).toContain("ID invalide")
	})

	// Order not found
	it("should return NOT_FOUND when order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null)

		const result = await cancelOrder(undefined, validFormData)

		expect(result.status).toBe(ActionStatus.NOT_FOUND)
	})

	// Already cancelled
	it("should return error when order is already cancelled", async () => {
		const order = createTxOrder({ status: "CANCELLED" })
		mockPrisma.order.findUnique.mockResolvedValue(order)
		mockCanCancelOrder.mockReturnValue(false)

		const result = await cancelOrder(undefined, validFormData)

		expect(result.status).toBe(ActionStatus.ERROR)
		expect(result.message).toContain("annulee")
	})

	// Cannot cancel shipped
	it("should return error when order is shipped", async () => {
		const order = createTxOrder({ status: "SHIPPED" })
		mockPrisma.order.findUnique.mockResolvedValue(order)
		mockCanCancelOrder.mockReturnValue(false)

		const result = await cancelOrder(undefined, validFormData)

		expect(result.status).toBe(ActionStatus.ERROR)
	})

	// Success with PENDING payment (restore stock)
	it("should restore stock when cancelling a PENDING payment order", async () => {
		const order = createTxOrder({
			paymentStatus: "PENDING",
			items: [{ skuId: "sku-1", quantity: 2 }],
		})
		mockPrisma.order.findUnique.mockResolvedValue(order)

		const result = await cancelOrder(undefined, validFormData)

		expect(result.status).toBe(ActionStatus.SUCCESS)
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "sku-1" },
				data: { inventory: { increment: 2 } },
			})
		)
	})

	// Success with PAID payment (mark REFUNDED)
	it("should mark paymentStatus as REFUNDED when cancelling a PAID order", async () => {
		const order = createTxOrder({ paymentStatus: "PAID" })
		mockPrisma.order.findUnique.mockResolvedValue(order)

		const result = await cancelOrder(undefined, validFormData)

		expect(result.status).toBe(ActionStatus.SUCCESS)
		expect(result.message).toContain("REFUNDED")
	})

	// Email sent
	it("should send cancellation email to customer", async () => {
		const order = createTxOrder({ customerEmail: "client@example.com" })
		mockPrisma.order.findUnique.mockResolvedValue(order)

		const result = await cancelOrder(undefined, validFormData)

		expect(mockSendCancelEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "client@example.com",
				orderNumber: "SYN-2026-0001",
			})
		)
		expect(result.message).toContain("Email")
	})

	// Email failure fallback
	it("should succeed even if email fails", async () => {
		const order = createTxOrder({ customerEmail: "client@example.com" })
		mockPrisma.order.findUnique.mockResolvedValue(order)
		mockSendCancelEmail.mockRejectedValue(new Error("SMTP error"))

		const result = await cancelOrder(undefined, validFormData)

		expect(result.status).toBe(ActionStatus.SUCCESS)
		expect(result.message).toContain("chec")
	})

	// Audit trail
	it("should create audit trail entry", async () => {
		const order = createTxOrder()
		mockPrisma.order.findUnique.mockResolvedValue(order)

		await cancelOrder(undefined, validFormData)

		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				orderId: VALID_CUID,
				action: "CANCELLED",
				authorId: "admin-1",
			})
		)
	})

	// Cache invalidation
	it("should invalidate order cache tags", async () => {
		const order = createTxOrder()
		mockPrisma.order.findUnique.mockResolvedValue(order)

		await cancelOrder(undefined, validFormData)

		expect(mockUpdateTag).toHaveBeenCalled()
	})

	// Sanitize reason
	it("should sanitize the cancellation reason", async () => {
		const fd = createMockFormData({ id: VALID_CUID, reason: "<script>alert(1)</script>" })
		const order = createTxOrder()
		mockPrisma.order.findUnique.mockResolvedValue(order)

		await cancelOrder(undefined, fd)

		expect(mockSanitizeText).toHaveBeenCalledWith("<script>alert(1)</script>")
	})

	// handleActionError on unexpected exception
	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"))

		const result = await cancelOrder(undefined, validFormData)

		expect(mockHandleActionError).toHaveBeenCalled()
		expect(result.status).toBe(ActionStatus.ERROR)
	})
})
