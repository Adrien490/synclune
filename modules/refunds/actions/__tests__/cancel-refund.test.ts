import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockPrisma,
	mockUpdateTag,
	mockCreateOrderAuditTx,
} = vi.hoisted(() => ({
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockPrisma: {
		$transaction: vi.fn(),
		refund: {
			findUnique: vi.fn(),
			update: vi.fn(),
			updateMany: vi.fn(),
		},
		orderNote: {
			create: vi.fn(),
		},
		orderHistory: {
			create: vi.fn(),
		},
	},
	mockUpdateTag: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdminWithUser,
	requireAdminWithUser: mockRequireAdminWithUser,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	REFUND_LIMITS: { SINGLE_OPERATION: "single_operation" },
}));

vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));

vi.mock("../../constants/refund.constants", () => ({
	REFUND_ERROR_MESSAGES: {
		NOT_FOUND: "Le remboursement n'existe pas.",
		CANNOT_CANCEL: "Ce remboursement ne peut plus être annulé (déjà traité ou refusé).",
		CANCEL_FAILED: "Erreur lors de l'annulation du remboursement.",
	},
}));

vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		LIST: "orders-list",
		USER_ORDERS: (userId: string) => `orders-user-${userId}`,
		REFUNDS: (orderId: string) => `order-refunds-${orderId}`,
	},
	REFUNDS_CACHE_TAGS: {
		LIST: "refunds-list",
		DETAIL: (id: string) => `refund-${id}`,
	},
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_BADGES: "admin-badges",
	},
}));

vi.mock("@/modules/dashboard/constants/cache", () => ({
	DASHBOARD_CACHE_TAGS: {
		KPIS: "dashboard-kpis",
		REVENUE_CHART: "dashboard-revenue-chart",
		RECENT_ORDERS: "dashboard-recent-orders",
	},
}));

vi.mock("../../schemas/refund.schemas", () => ({
	cancelRefundSchema: {},
}));

vi.mock("@/app/generated/prisma/client", () => ({
	RefundStatus: {
		PENDING: "PENDING",
		APPROVED: "APPROVED",
		COMPLETED: "COMPLETED",
		REJECTED: "REJECTED",
		FAILED: "FAILED",
		CANCELLED: "CANCELLED",
	},
	HistorySource: { ADMIN: "ADMIN", WEBHOOK: "WEBHOOK", SYSTEM: "SYSTEM", CUSTOMER: "CUSTOMER" },
	OrderAction: {
		REFUND_CREATED: "REFUND_CREATED",
		REFUND_COMPLETED: "REFUND_COMPLETED",
		REFUND_FAILED: "REFUND_FAILED",
	},
}));

vi.mock("@/modules/orders/utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

import { cancelRefund } from "../cancel-refund";

// ============================================================================
// Fixtures
// ============================================================================

function makeFormData(id = "refund-1") {
	const fd = new FormData();
	fd.set("id", id);
	return fd;
}

function makeRefund(overrides: Record<string, unknown> = {}) {
	return {
		id: "refund-1",
		status: "PENDING",
		amount: 5000,
		order: {
			id: "order-1",
			orderNumber: "SYN-001",
			user: {
				id: "user-1",
				email: "client@example.com",
				name: "Marie Dupont",
			},
		},
		...overrides,
	};
}

const mockAdmin = {
	id: "admin-1",
	email: "admin@test.com",
	name: "Admin",
	role: "ADMIN",
	image: null,
	firstName: "Admin",
	lastName: "Test",
	emailVerified: true,
	stripeCustomerId: null,
};

// ============================================================================
// cancelRefund
// ============================================================================

describe("cancelRefund", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAdminWithUser.mockResolvedValue({ user: mockAdmin });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ success: true, data: { id: "refund-1" } });
		mockSuccess.mockImplementation((msg: string) => ({ status: "success", message: msg }));
		mockError.mockImplementation((msg: string) => ({ status: "error", message: msg }));
		mockHandleActionError.mockImplementation((_e: unknown, msg: string) => ({
			status: "error",
			message: msg,
		}));
		mockPrisma.orderNote.create.mockResolvedValue({});
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.refund.updateMany.mockResolvedValue({});
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockPrisma) => Promise<void>) =>
			cb(mockPrisma),
		);
	});

	it("should return auth error when not admin", async () => {
		const authError = { status: "forbidden", message: "Accès non autorisé" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await cancelRefund(undefined, makeFormData());

		expect(result).toBe(authError);
	});

	it("should return rate limit error", async () => {
		const rlError = { status: "error", message: "Rate limited" };
		mockEnforceRateLimit.mockResolvedValue({ error: rlError });

		const result = await cancelRefund(undefined, makeFormData());

		expect(result).toBe(rlError);
	});

	it("should return validation error when id is invalid", async () => {
		const valError = { status: "error", message: "Invalid id" };
		mockValidateInput.mockReturnValue({ error: valError });

		const result = await cancelRefund(undefined, makeFormData("bad"));

		expect(result).toBe(valError);
	});

	it("should return NOT_FOUND when refund does not exist", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(null);

		await cancelRefund(undefined, makeFormData());

		expect(mockError).toHaveBeenCalledWith("Le remboursement n'existe pas.");
	});

	it("should cancel a PENDING refund", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ status: "PENDING" }));
		mockPrisma.refund.updateMany.mockResolvedValue({});

		await cancelRefund(undefined, makeFormData());

		expect(mockPrisma.refund.updateMany).toHaveBeenCalled();
		expect(mockSuccess).toHaveBeenCalled();
	});

	it("should cancel an APPROVED refund", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ status: "APPROVED" }));
		mockPrisma.refund.updateMany.mockResolvedValue({});

		await cancelRefund(undefined, makeFormData());

		expect(mockPrisma.refund.updateMany).toHaveBeenCalled();
		expect(mockSuccess).toHaveBeenCalled();
	});

	it("should return CANNOT_CANCEL when status is COMPLETED", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ status: "COMPLETED" }));

		await cancelRefund(undefined, makeFormData());

		expect(mockError).toHaveBeenCalledWith(
			"Ce remboursement ne peut plus être annulé (déjà traité ou refusé).",
		);
		expect(mockPrisma.refund.updateMany).not.toHaveBeenCalled();
	});

	it("should return CANNOT_CANCEL when status is REJECTED", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ status: "REJECTED" }));

		await cancelRefund(undefined, makeFormData());

		expect(mockError).toHaveBeenCalledWith(
			"Ce remboursement ne peut plus être annulé (déjà traité ou refusé).",
		);
	});

	it("should return CANNOT_CANCEL when status is FAILED", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ status: "FAILED" }));

		await cancelRefund(undefined, makeFormData());

		expect(mockError).toHaveBeenCalledWith(
			"Ce remboursement ne peut plus être annulé (déjà traité ou refusé).",
		);
	});

	it("should update refund with CANCELLED status and set deletedAt", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ status: "PENDING" }));
		mockPrisma.refund.updateMany.mockResolvedValue({});

		await cancelRefund(undefined, makeFormData());

		expect(mockPrisma.refund.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					status: "CANCELLED",
					deletedAt: expect.any(Date),
				}),
			}),
		);
	});

	it("should use TOCTOU protection by including current status in where clause", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ status: "PENDING" }));
		mockPrisma.refund.updateMany.mockResolvedValue({});

		await cancelRefund(undefined, makeFormData());

		expect(mockPrisma.refund.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "refund-1", status: "PENDING" },
			}),
		);
	});

	it("should use TOCTOU protection when cancelling an APPROVED refund", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ status: "APPROVED" }));
		mockPrisma.refund.updateMany.mockResolvedValue({});

		await cancelRefund(undefined, makeFormData());

		expect(mockPrisma.refund.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "refund-1", status: "APPROVED" },
			}),
		);
	});

	it("should invalidate all 6 cache tags when order has a user", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund());
		mockPrisma.refund.updateMany.mockResolvedValue({});

		await cancelRefund(undefined, makeFormData());

		expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("refunds-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("refund-refund-1");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
		expect(mockUpdateTag).toHaveBeenCalledWith("order-refunds-order-1");
		expect(mockUpdateTag).toHaveBeenCalledWith("orders-user-user-1");
		expect(mockUpdateTag).toHaveBeenCalledTimes(6);
	});

	it("should invalidate user-specific cache tag when order has a user", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund());
		mockPrisma.refund.updateMany.mockResolvedValue({});

		await cancelRefund(undefined, makeFormData());

		expect(mockUpdateTag).toHaveBeenCalledWith("orders-user-user-1");
	});

	it("should not invalidate user-specific cache tag when order has no user", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(
			makeRefund({ order: { id: "order-1", orderNumber: "SYN-001", user: null } }),
		);
		mockPrisma.refund.updateMany.mockResolvedValue({});

		await cancelRefund(undefined, makeFormData());

		const userTagCalls = mockUpdateTag.mock.calls.filter(([tag]) =>
			(tag as string).startsWith("orders-user-"),
		);
		expect(userTagCalls).toHaveLength(0);
	});

	it("should return formatted success message with amount and order number", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ amount: 5000 }));
		mockPrisma.refund.updateMany.mockResolvedValue({});

		await cancelRefund(undefined, makeFormData());

		expect(mockSuccess).toHaveBeenCalledWith(
			"Remboursement de 50.00 € annulé pour la commande SYN-001",
		);
	});

	it("should format fractional amounts correctly in success message", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ amount: 7599 }));
		mockPrisma.refund.updateMany.mockResolvedValue({});

		await cancelRefund(undefined, makeFormData());

		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("75.99"));
	});

	it("should delegate unexpected errors to handleActionError", async () => {
		const dbError = new Error("DB connection lost");
		mockPrisma.refund.findUnique.mockRejectedValue(dbError);

		await cancelRefund(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalledWith(
			dbError,
			"Erreur lors de l'annulation du remboursement.",
		);
	});
});
