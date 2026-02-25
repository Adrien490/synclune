import { describe, it, expect, vi, beforeEach } from "vitest"
import { ActionStatus } from "@/shared/types/server-action"
import { createMockFormData, VALID_CUID, VALID_CUID_2, VALID_USER_ID } from "@/test/factories"

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockSendRefundApprovedEmail,
	mockBuildUrl,
} = vi.hoisted(() => ({
	mockPrisma: {
		refund: {
			findMany: vi.fn(),
			update: vi.fn(),
		},
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSendRefundApprovedEmail: vi.fn(),
	mockBuildUrl: vi.fn((path: string) => `https://synclune.fr${path}`),
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
	REFUND_LIMITS: { BULK_OPERATION: "refund-bulk" },
}))

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}))

vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	error: (message: string) => ({ status: ActionStatus.ERROR, message }),
}))

vi.mock("@/modules/emails/services/refund-emails", () => ({
	sendRefundApprovedEmail: mockSendRefundApprovedEmail,
}))

vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: {
		ACCOUNT: {
			ORDER_DETAIL: (id: string) => `/compte/commandes/${id}`,
		},
	},
}))

vi.mock("../../constants/refund.constants", () => ({
	REFUND_ERROR_MESSAGES: {
		APPROVE_FAILED: "Erreur lors de l'approbation du remboursement.",
	},
}))

vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		LIST: "orders-list",
		REFUNDS: (orderId: string) => `order-refunds-${orderId}`,
		USER_ORDERS: (userId: string) => `orders-user-${userId}`,
	},
}))

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_BADGES: "admin-badges" },
}))

vi.mock("@/modules/dashboard/constants/cache", () => ({
	DASHBOARD_CACHE_TAGS: {
		KPIS: "dashboard-kpis",
		REVENUE_CHART: "dashboard-revenue-chart",
		RECENT_ORDERS: "dashboard-recent-orders",
	},
}))

vi.mock("../../schemas/refund.schemas", () => ({
	bulkApproveRefundsSchema: {},
}))

vi.mock("@/app/generated/prisma/client", async (importOriginal) => {
	const actual = await importOriginal()
	return {
		...(actual as object),
		RefundStatus: {
			PENDING: "PENDING",
			APPROVED: "APPROVED",
			REJECTED: "REJECTED",
			COMPLETED: "COMPLETED",
		},
	}
})

import { bulkApproveRefunds } from "../bulk-approve-refunds"

// ============================================================================
// HELPERS
// ============================================================================

const VALID_IDS = [VALID_CUID, VALID_CUID_2]
const ORDER_ID = "order_cm1234567890abcde"
const ORDER_ID_2 = "order_cm9876543210zyxwv"

function makeFormData(ids: string[] = VALID_IDS) {
	return createMockFormData({ ids: JSON.stringify(ids) })
}

function createMockRefund(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_CUID,
		amount: 2500,
		reason: "CUSTOMER_REQUEST",
		order: {
			id: ORDER_ID,
			orderNumber: "SYN-2026-0001",
			total: 4999,
			user: {
				id: VALID_USER_ID,
				email: "client@example.com",
				name: "Marie Dupont",
			},
		},
		...overrides,
	}
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkApproveRefunds", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin Test" },
		})
		mockEnforceRateLimit.mockResolvedValue({ success: true })
		mockSendRefundApprovedEmail.mockResolvedValue(undefined)
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}))
		mockValidateInput.mockImplementation((_schema: unknown, data: unknown) => ({
			data: data as { ids: string[] },
		}))

		const refunds = [createMockRefund({ id: VALID_CUID }), createMockRefund({ id: VALID_CUID_2 })]
		mockPrisma.refund.findMany.mockResolvedValue(refunds)
		mockPrisma.refund.update.mockResolvedValue({})
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)
		)
	})

	// --------------------------------------------------------------------------
	// Auth
	// --------------------------------------------------------------------------

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" }
		mockRequireAdminWithUser.mockResolvedValue({ error: authError })

		const result = await bulkApproveRefunds(undefined, makeFormData())

		expect(result).toEqual(authError)
		expect(mockPrisma.refund.findMany).not.toHaveBeenCalled()
	})

	// --------------------------------------------------------------------------
	// Rate limit
	// --------------------------------------------------------------------------

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" }
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError })

		const result = await bulkApproveRefunds(undefined, makeFormData())

		expect(result).toEqual(rateLimitError)
		expect(mockPrisma.refund.findMany).not.toHaveBeenCalled()
	})

	// --------------------------------------------------------------------------
	// JSON parsing
	// --------------------------------------------------------------------------

	it("should return error for malformed JSON ids", async () => {
		const formData = createMockFormData({ ids: "not-valid-json" })

		const result = await bulkApproveRefunds(undefined, formData)

		expect(result.status).toBe(ActionStatus.ERROR)
		expect(result.message).toContain("invalide")
	})

	// --------------------------------------------------------------------------
	// Validation
	// --------------------------------------------------------------------------

	it("should return validation error when validateInput fails", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "IDs invalides" }
		mockValidateInput.mockReturnValue({ error: validationError })

		const result = await bulkApproveRefunds(undefined, makeFormData())

		expect(result).toEqual(validationError)
		expect(mockPrisma.refund.findMany).not.toHaveBeenCalled()
	})

	// --------------------------------------------------------------------------
	// No eligible refunds
	// --------------------------------------------------------------------------

	it("should return error when no PENDING refunds exist", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS } })
		mockPrisma.refund.findMany.mockResolvedValue([])

		const result = await bulkApproveRefunds(undefined, makeFormData())

		expect(result.status).toBe(ActionStatus.ERROR)
		expect(result.message).toContain("éligible")
		expect(mockPrisma.$transaction).not.toHaveBeenCalled()
	})

	// --------------------------------------------------------------------------
	// Approval transaction
	// --------------------------------------------------------------------------

	it("should approve refunds within a transaction and return SUCCESS", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: [VALID_CUID] } })
		mockPrisma.refund.findMany.mockResolvedValue([createMockRefund({ id: VALID_CUID })])
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)
		)

		const result = await bulkApproveRefunds(undefined, makeFormData([VALID_CUID]))

		expect(mockPrisma.$transaction).toHaveBeenCalled()
		expect(result.status).toBe(ActionStatus.SUCCESS)
	})

	it("should set status to APPROVED for each refund in transaction", async () => {
		const mockTxRefund = { update: vi.fn().mockResolvedValue({}) }
		const mockTx = { refund: mockTxRefund }
		mockValidateInput.mockReturnValue({ data: { ids: [VALID_CUID] } })
		mockPrisma.refund.findMany.mockResolvedValue([createMockRefund({ id: VALID_CUID })])
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: unknown) => Promise<unknown>) => fn(mockTx)
		)

		await bulkApproveRefunds(undefined, makeFormData([VALID_CUID]))

		expect(mockTxRefund.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: VALID_CUID, status: "PENDING" }),
				data: { status: "APPROVED" },
			})
		)
	})

	// --------------------------------------------------------------------------
	// Only PENDING refunds are processed
	// --------------------------------------------------------------------------

	it("should only query refunds with PENDING status and notDeleted", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS } })

		await bulkApproveRefunds(undefined, makeFormData())

		expect(mockPrisma.refund.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: { in: VALID_IDS },
					status: "PENDING",
					deletedAt: null,
				}),
			})
		)
	})

	// --------------------------------------------------------------------------
	// Cache invalidation
	// --------------------------------------------------------------------------

	it("should invalidate orders list, admin badges and dashboard tags", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS } })
		mockPrisma.refund.findMany.mockResolvedValue([createMockRefund()])

		await bulkApproveRefunds(undefined, makeFormData())

		expect(mockUpdateTag).toHaveBeenCalledWith("orders-list")
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges")
		expect(mockUpdateTag).toHaveBeenCalledWith("dashboard-kpis")
		expect(mockUpdateTag).toHaveBeenCalledWith("dashboard-revenue-chart")
		expect(mockUpdateTag).toHaveBeenCalledWith("dashboard-recent-orders")
	})

	it("should invalidate per-order refund cache", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS } })
		mockPrisma.refund.findMany.mockResolvedValue([
			createMockRefund({ order: { id: ORDER_ID, orderNumber: "SYN-001", total: 4999, user: { id: VALID_USER_ID, email: "a@b.com", name: "A" } } }),
			createMockRefund({ id: VALID_CUID_2, order: { id: ORDER_ID_2, orderNumber: "SYN-002", total: 3999, user: { id: "user-2", email: "b@b.com", name: "B" } } }),
		])

		await bulkApproveRefunds(undefined, makeFormData())

		expect(mockUpdateTag).toHaveBeenCalledWith(`order-refunds-${ORDER_ID}`)
		expect(mockUpdateTag).toHaveBeenCalledWith(`order-refunds-${ORDER_ID_2}`)
		expect(mockUpdateTag).toHaveBeenCalledWith(`orders-user-${VALID_USER_ID}`)
		expect(mockUpdateTag).toHaveBeenCalledWith("orders-user-user-2")
	})

	it("should deduplicate unique order and user IDs for cache invalidation", async () => {
		// Two refunds for the same order and user
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS } })
		mockPrisma.refund.findMany.mockResolvedValue([
			createMockRefund({ id: VALID_CUID, order: { id: ORDER_ID, orderNumber: "SYN-001", total: 4999, user: { id: VALID_USER_ID, email: "a@b.com", name: "A" } } }),
			createMockRefund({ id: VALID_CUID_2, order: { id: ORDER_ID, orderNumber: "SYN-001", total: 4999, user: { id: VALID_USER_ID, email: "a@b.com", name: "A" } } }),
		])

		await bulkApproveRefunds(undefined, makeFormData())

		const refundCacheCallCount = (mockUpdateTag.mock.calls as string[][]).filter(
			(args) => args[0] === `order-refunds-${ORDER_ID}`
		).length
		expect(refundCacheCallCount).toBe(1)
	})

	// --------------------------------------------------------------------------
	// Email (non-blocking)
	// --------------------------------------------------------------------------

	it("should send approval email to customer", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: [VALID_CUID] } })
		mockPrisma.refund.findMany.mockResolvedValue([
			createMockRefund({ order: { id: ORDER_ID, orderNumber: "SYN-001", total: 4999, user: { id: VALID_USER_ID, email: "client@example.com", name: "Marie" } } }),
		])

		await bulkApproveRefunds(undefined, makeFormData([VALID_CUID]))

		expect(mockSendRefundApprovedEmail).toHaveBeenCalledWith(
			expect.objectContaining({ to: "client@example.com" })
		)
	})

	it("should set isPartialRefund correctly when refund is less than order total", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: [VALID_CUID] } })
		mockPrisma.refund.findMany.mockResolvedValue([
			createMockRefund({ amount: 1000, order: { id: ORDER_ID, orderNumber: "SYN-001", total: 4999, user: { id: VALID_USER_ID, email: "client@example.com", name: "Marie" } } }),
		])

		await bulkApproveRefunds(undefined, makeFormData([VALID_CUID]))

		expect(mockSendRefundApprovedEmail).toHaveBeenCalledWith(
			expect.objectContaining({ isPartialRefund: true })
		)
	})

	it("should set isPartialRefund false when refund equals order total", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: [VALID_CUID] } })
		mockPrisma.refund.findMany.mockResolvedValue([
			createMockRefund({ amount: 4999, order: { id: ORDER_ID, orderNumber: "SYN-001", total: 4999, user: { id: VALID_USER_ID, email: "client@example.com", name: "Marie" } } }),
		])

		await bulkApproveRefunds(undefined, makeFormData([VALID_CUID]))

		expect(mockSendRefundApprovedEmail).toHaveBeenCalledWith(
			expect.objectContaining({ isPartialRefund: false })
		)
	})

	it("should not send email when user has no email", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: [VALID_CUID] } })
		mockPrisma.refund.findMany.mockResolvedValue([
			createMockRefund({ order: { id: ORDER_ID, orderNumber: "SYN-001", total: 4999, user: null } }),
		])

		await bulkApproveRefunds(undefined, makeFormData([VALID_CUID]))

		expect(mockSendRefundApprovedEmail).not.toHaveBeenCalled()
	})

	// --------------------------------------------------------------------------
	// Success message
	// --------------------------------------------------------------------------

	it("should return success message with count and total amount in euros", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS } })
		mockPrisma.refund.findMany.mockResolvedValue([
			createMockRefund({ id: VALID_CUID, amount: 2500 }),
			createMockRefund({ id: VALID_CUID_2, amount: 5000 }),
		])

		const result = await bulkApproveRefunds(undefined, makeFormData())

		expect(result.status).toBe(ActionStatus.SUCCESS)
		expect(result.message).toContain("2 remboursements")
		expect(result.message).toContain("75.00 €")
	})

	it("should include skipped count when some IDs had non-PENDING refunds", async () => {
		// 2 IDs given but only 1 refund returned → 1 skipped
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS } })
		mockPrisma.refund.findMany.mockResolvedValue([
			createMockRefund({ id: VALID_CUID, amount: 2500 }),
		])

		const result = await bulkApproveRefunds(undefined, makeFormData())

		expect(result.message).toContain("ignoré")
	})

	it("should use singular form for one refund approved", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: [VALID_CUID] } })
		mockPrisma.refund.findMany.mockResolvedValue([createMockRefund({ amount: 1000 })])

		const result = await bulkApproveRefunds(undefined, makeFormData([VALID_CUID]))

		expect(result.message).toContain("1 remboursement")
	})

	// --------------------------------------------------------------------------
	// Error handling
	// --------------------------------------------------------------------------

	it("should call handleActionError on unexpected exception", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS } })
		mockPrisma.refund.findMany.mockRejectedValue(new Error("DB crash"))

		const result = await bulkApproveRefunds(undefined, makeFormData())

		expect(mockHandleActionError).toHaveBeenCalled()
		expect(result.status).toBe(ActionStatus.ERROR)
	})
})
