import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID, VALID_CUID_2, VALID_USER_ID } from "@/test/factories";

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
	mockSanitizeText,
	mockSendRefundRejectedEmail,
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
	mockSanitizeText: vi.fn((text: string) => text),
	mockSendRefundRejectedEmail: vi.fn(),
	mockBuildUrl: vi.fn((path: string) => `https://synclune.fr${path}`),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	REFUND_LIMITS: { BULK_OPERATION: "refund-bulk" },
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	error: (message: string) => ({ status: ActionStatus.ERROR, message }),
}));

vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: mockSanitizeText,
}));

vi.mock("@/modules/emails/services/refund-emails", () => ({
	sendRefundRejectedEmail: mockSendRefundRejectedEmail,
}));

vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: {
		ACCOUNT: {
			ORDER_DETAIL: (id: string) => `/compte/commandes/${id}`,
		},
	},
}));

vi.mock("../../constants/refund.constants", () => ({
	REFUND_ERROR_MESSAGES: {
		REJECT_FAILED: "Erreur lors du rejet du remboursement.",
	},
}));

vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		LIST: "orders-list",
		REFUNDS: (orderId: string) => `order-refunds-${orderId}`,
		USER_ORDERS: (userId: string) => `orders-user-${userId}`,
	},
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_BADGES: "admin-badges" },
}));

vi.mock("@/modules/dashboard/constants/cache", () => ({
	DASHBOARD_CACHE_TAGS: {
		KPIS: "dashboard-kpis",
		REVENUE_CHART: "dashboard-revenue-chart",
		RECENT_ORDERS: "dashboard-recent-orders",
	},
}));

vi.mock("../../schemas/refund.schemas", () => ({
	bulkRejectRefundsSchema: {},
}));

vi.mock("@/app/generated/prisma/client", async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...(actual as object),
		RefundStatus: {
			PENDING: "PENDING",
			REJECTED: "REJECTED",
			APPROVED: "APPROVED",
			COMPLETED: "COMPLETED",
		},
	};
});

import { bulkRejectRefunds } from "../bulk-reject-refunds";

// ============================================================================
// HELPERS
// ============================================================================

const VALID_IDS = [VALID_CUID, VALID_CUID_2];
const ORDER_ID = "order_cm1234567890abcde";
const ORDER_ID_2 = "order_cm9876543210zyxwv";

function makeFormData(ids: string[] = VALID_IDS, reason?: string) {
	return createMockFormData({
		ids: JSON.stringify(ids),
		...(reason !== undefined ? { reason } : {}),
	});
}

function createMockRefund(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_CUID,
		amount: 2500,
		note: null,
		order: {
			id: ORDER_ID,
			orderNumber: "SYN-2026-0001",
			user: {
				id: VALID_USER_ID,
				email: "client@example.com",
				name: "Marie Dupont",
			},
		},
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkRejectRefunds", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin Test" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSanitizeText.mockImplementation((text: string) => text);
		mockSendRefundRejectedEmail.mockResolvedValue(undefined);
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
		mockValidateInput.mockImplementation((_schema: unknown, data: unknown) => ({
			data: data as { ids: string[]; reason?: string | null },
		}));

		const refunds = [createMockRefund({ id: VALID_CUID }), createMockRefund({ id: VALID_CUID_2 })];
		mockPrisma.refund.findMany.mockResolvedValue(refunds);
		mockPrisma.refund.update.mockResolvedValue({});
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
	});

	// --------------------------------------------------------------------------
	// Auth
	// --------------------------------------------------------------------------

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await bulkRejectRefunds(undefined, makeFormData());

		expect(result).toEqual(authError);
		expect(mockPrisma.refund.findMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Rate limit
	// --------------------------------------------------------------------------

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await bulkRejectRefunds(undefined, makeFormData());

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.refund.findMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// JSON parsing
	// --------------------------------------------------------------------------

	it("should return error for malformed JSON ids", async () => {
		const formData = createMockFormData({ ids: "not-valid-json" });

		const result = await bulkRejectRefunds(undefined, formData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("invalide");
	});

	// --------------------------------------------------------------------------
	// Validation
	// --------------------------------------------------------------------------

	it("should return validation error when validateInput fails", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "IDs invalides" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await bulkRejectRefunds(undefined, makeFormData());

		expect(result).toEqual(validationError);
		expect(mockPrisma.refund.findMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// No eligible refunds
	// --------------------------------------------------------------------------

	it("should return error when no PENDING refunds exist", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS, reason: null } });
		mockPrisma.refund.findMany.mockResolvedValue([]);

		const result = await bulkRejectRefunds(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("éligible");
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Rejection transaction
	// --------------------------------------------------------------------------

	it("should reject refunds within a transaction and return SUCCESS", async () => {
		const refunds = [createMockRefund({ id: VALID_CUID })];
		mockValidateInput.mockReturnValue({ data: { ids: [VALID_CUID], reason: null } });
		mockPrisma.refund.findMany.mockResolvedValue(refunds);
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);

		const result = await bulkRejectRefunds(undefined, makeFormData([VALID_CUID]));

		expect(mockPrisma.$transaction).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should append reason to refund note when reason is provided", async () => {
		const mockTxRefund = { update: vi.fn().mockResolvedValue({}) };
		const mockTx = { refund: mockTxRefund };
		mockValidateInput.mockReturnValue({ data: { ids: [VALID_CUID], reason: "Hors délai" } });
		mockPrisma.refund.findMany.mockResolvedValue([createMockRefund({ note: null })]);
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
			fn(mockTx),
		);

		await bulkRejectRefunds(undefined, makeFormData([VALID_CUID], "Hors délai"));

		expect(mockTxRefund.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ note: expect.stringContaining("REFUSÉ") }),
			}),
		);
	});

	it("should prepend to existing note when refund already has a note", async () => {
		const mockTxRefund = { update: vi.fn().mockResolvedValue({}) };
		const mockTx = { refund: mockTxRefund };
		mockValidateInput.mockReturnValue({ data: { ids: [VALID_CUID], reason: "Raison admin" } });
		mockPrisma.refund.findMany.mockResolvedValue([createMockRefund({ note: "Note initiale" })]);
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
			fn(mockTx),
		);

		await bulkRejectRefunds(undefined, makeFormData([VALID_CUID], "Raison admin"));

		expect(mockTxRefund.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					note: expect.stringContaining("Note initiale"),
				}),
			}),
		);
	});

	// --------------------------------------------------------------------------
	// Cache invalidation
	// --------------------------------------------------------------------------

	it("should invalidate orders list, admin badges and dashboard tags", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS, reason: null } });
		mockPrisma.refund.findMany.mockResolvedValue([
			createMockRefund({
				id: VALID_CUID,
				order: {
					id: ORDER_ID,
					orderNumber: "SYN-001",
					user: { id: VALID_USER_ID, email: "a@b.com", name: "A" },
				},
			}),
		]);

		await bulkRejectRefunds(undefined, makeFormData());

		expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
		expect(mockUpdateTag).toHaveBeenCalledWith("dashboard-kpis");
		expect(mockUpdateTag).toHaveBeenCalledWith("dashboard-revenue-chart");
		expect(mockUpdateTag).toHaveBeenCalledWith("dashboard-recent-orders");
	});

	it("should invalidate per-order and per-user cache tags", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS, reason: null } });
		mockPrisma.refund.findMany.mockResolvedValue([
			createMockRefund({
				id: VALID_CUID,
				order: {
					id: ORDER_ID,
					orderNumber: "SYN-001",
					user: { id: VALID_USER_ID, email: "a@b.com", name: "A" },
				},
			}),
			createMockRefund({
				id: VALID_CUID_2,
				order: {
					id: ORDER_ID_2,
					orderNumber: "SYN-002",
					user: { id: "user-2", email: "b@b.com", name: "B" },
				},
			}),
		]);

		await bulkRejectRefunds(undefined, makeFormData());

		expect(mockUpdateTag).toHaveBeenCalledWith(`order-refunds-${ORDER_ID}`);
		expect(mockUpdateTag).toHaveBeenCalledWith(`order-refunds-${ORDER_ID_2}`);
		expect(mockUpdateTag).toHaveBeenCalledWith(`orders-user-${VALID_USER_ID}`);
		expect(mockUpdateTag).toHaveBeenCalledWith("orders-user-user-2");
	});

	// --------------------------------------------------------------------------
	// Email (non-blocking)
	// --------------------------------------------------------------------------

	it("should send rejection email to customer", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: [VALID_CUID], reason: null } });
		mockPrisma.refund.findMany.mockResolvedValue([
			createMockRefund({
				order: {
					id: ORDER_ID,
					orderNumber: "SYN-001",
					user: { id: VALID_USER_ID, email: "client@example.com", name: "Marie" },
				},
			}),
		]);

		await bulkRejectRefunds(undefined, makeFormData([VALID_CUID]));

		expect(mockSendRefundRejectedEmail).toHaveBeenCalledWith(
			expect.objectContaining({ to: "client@example.com" }),
		);
	});

	it("should not send email when user has no email", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: [VALID_CUID], reason: null } });
		mockPrisma.refund.findMany.mockResolvedValue([
			createMockRefund({ order: { id: ORDER_ID, orderNumber: "SYN-001", user: null } }),
		]);

		await bulkRejectRefunds(undefined, makeFormData([VALID_CUID]));

		expect(mockSendRefundRejectedEmail).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Success message
	// --------------------------------------------------------------------------

	it("should return success message with count and total amount", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS, reason: null } });
		mockPrisma.refund.findMany.mockResolvedValue([
			createMockRefund({ id: VALID_CUID, amount: 2500 }),
			createMockRefund({ id: VALID_CUID_2, amount: 5000 }),
		]);

		const result = await bulkRejectRefunds(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("2 remboursements");
		expect(result.message).toContain("75.00 €");
	});

	it("should include skipped count when some IDs had non-PENDING refunds", async () => {
		// Only 1 refund returned (out of 2 IDs), meaning 1 was skipped
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS, reason: null } });
		mockPrisma.refund.findMany.mockResolvedValue([
			createMockRefund({ id: VALID_CUID, amount: 2500 }),
		]);

		const result = await bulkRejectRefunds(undefined, makeFormData());

		expect(result.message).toContain("ignoré");
	});

	// --------------------------------------------------------------------------
	// Error handling
	// --------------------------------------------------------------------------

	it("should call handleActionError on unexpected exception", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS, reason: null } });
		mockPrisma.refund.findMany.mockRejectedValue(new Error("DB crash"));

		const result = await bulkRejectRefunds(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
