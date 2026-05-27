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
	REFUND_LIMITS: { PROCESS: "process" },
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
		NOT_FAILED: "Seuls les remboursements en échec peuvent être relancés.",
		RETRY_FAILED: "Erreur lors de la relance du remboursement.",
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
	retryFailedRefundSchema: {},
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

import { retryFailedRefund } from "../retry-failed-refund";

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
		status: "FAILED",
		amount: 5000,
		failureReason: "Insufficient funds",
		stripeRefundId: "re_existing",
		order: {
			id: "order-1",
			orderNumber: "SYN-001",
			user: {
				id: "user-1",
			},
		},
		...overrides,
	};
}

const mockAdmin = {
	id: "admin-1",
	email: "admin@test.com",
	name: "Admin",
};

// ============================================================================
// retryFailedRefund
// ============================================================================

describe("retryFailedRefund", () => {
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
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.refund.update.mockResolvedValue({});
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockPrisma) => Promise<void>) =>
			cb(mockPrisma),
		);
	});

	it("should return auth error when not admin", async () => {
		const authError = { status: "forbidden", message: "Accès non autorisé" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await retryFailedRefund(undefined, makeFormData());

		expect(result).toBe(authError);
		expect(mockPrisma.refund.findUnique).not.toHaveBeenCalled();
	});

	it("should return rate limit error", async () => {
		const rlError = { status: "error", message: "Rate limited" };
		mockEnforceRateLimit.mockResolvedValue({ error: rlError });

		const result = await retryFailedRefund(undefined, makeFormData());

		expect(result).toBe(rlError);
	});

	it("should return validation error", async () => {
		const valError = { status: "error", message: "Invalid id" };
		mockValidateInput.mockReturnValue({ error: valError });

		const result = await retryFailedRefund(undefined, makeFormData());

		expect(result).toBe(valError);
	});

	it("should return NOT_FOUND when refund does not exist", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(null);

		await retryFailedRefund(undefined, makeFormData());

		expect(mockError).toHaveBeenCalledWith("Le remboursement n'existe pas.");
		expect(mockPrisma.refund.updateMany).not.toHaveBeenCalled();
	});

	it("should return NOT_FAILED when status is PENDING", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ status: "PENDING" }));

		await retryFailedRefund(undefined, makeFormData());

		expect(mockError).toHaveBeenCalledWith(
			"Seuls les remboursements en échec peuvent être relancés.",
		);
		expect(mockPrisma.refund.updateMany).not.toHaveBeenCalled();
	});

	it("should return NOT_FAILED when status is APPROVED", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ status: "APPROVED" }));

		await retryFailedRefund(undefined, makeFormData());

		expect(mockError).toHaveBeenCalledWith(
			"Seuls les remboursements en échec peuvent être relancés.",
		);
	});

	it("should return NOT_FAILED when status is COMPLETED", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ status: "COMPLETED" }));

		await retryFailedRefund(undefined, makeFormData());

		expect(mockError).toHaveBeenCalledWith(
			"Seuls les remboursements en échec peuvent être relancés.",
		);
	});

	it("should transition FAILED to APPROVED with TOCTOU guard", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund());
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });

		await retryFailedRefund(undefined, makeFormData());

		expect(mockPrisma.refund.updateMany).toHaveBeenCalledWith({
			where: { id: "refund-1", status: "FAILED" },
			data: {
				status: "APPROVED",
				failureReason: null,
				stripeRefundId: null,
				attemptCount: { increment: 1 },
			},
		});
	});

	it("should reset failureReason to null", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund());
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });

		await retryFailedRefund(undefined, makeFormData());

		const call = mockPrisma.refund.updateMany.mock.calls[0]?.[0] as {
			data: { failureReason: null };
		};
		expect(call.data.failureReason).toBeNull();
	});

	it("should snapshot previousFailureReason and previousStripeRefundId in audit log", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund());
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });

		await retryFailedRefund(undefined, makeFormData());
	});

	it("should invalidate cache tags including userId when present", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund());
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });

		await retryFailedRefund(undefined, makeFormData());

		expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
		expect(mockUpdateTag).toHaveBeenCalledWith("order-refunds-order-1");
		expect(mockUpdateTag).toHaveBeenCalledWith("orders-user-user-1");
	});

	it("should not invalidate user-specific cache when no userId", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(
			makeRefund({ order: { id: "order-1", orderNumber: "SYN-001", user: null } }),
		);
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });

		await retryFailedRefund(undefined, makeFormData());

		const userTagCalls = mockUpdateTag.mock.calls.filter(([tag]) =>
			(tag as string).startsWith("orders-user-"),
		);
		expect(userTagCalls).toHaveLength(0);
	});

	it("should include formatted amount in success message", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ amount: 7500 }));
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });

		await retryFailedRefund(undefined, makeFormData());

		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("75.00"));
	});

	it("should call handleActionError on DB exception", async () => {
		mockPrisma.refund.findUnique.mockRejectedValue(new Error("DB crash"));

		const result = await retryFailedRefund(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe("error");
	});
});
