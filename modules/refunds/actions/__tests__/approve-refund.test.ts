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
	mockSendRefundApprovedEmail,
	mockLogFailedEmail,
	mockBuildUrl,
} = vi.hoisted(() => ({
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockPrisma: {
		refund: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
	},
	mockUpdateTag: vi.fn(),
	mockSendRefundApprovedEmail: vi.fn(),
	mockLogFailedEmail: vi.fn(),
	mockBuildUrl: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	REFUND_LIMITS: { SINGLE_OPERATION: "single_operation" },
}));

vi.mock("@/shared/lib/actions", () => ({
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

vi.mock("@/modules/emails/services/refund-emails", () => ({
	sendRefundApprovedEmail: mockSendRefundApprovedEmail,
}));

vi.mock("@/modules/emails/services/log-failed-email", () => ({
	logFailedEmail: mockLogFailedEmail,
}));

vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: {
		ACCOUNT: {
			ORDER_DETAIL: (id: string) => `/commandes/${id}`,
		},
	},
}));

vi.mock("../../constants/refund.constants", () => ({
	REFUND_ERROR_MESSAGES: {
		NOT_FOUND: "Le remboursement n'existe pas.",
		ALREADY_APPROVED: "Ce remboursement est déjà approuvé.",
		ALREADY_PROCESSED: "Ce remboursement a déjà été traité.",
		APPROVE_FAILED: "Erreur lors de l'approbation du remboursement.",
	},
}));

vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		LIST: "orders-list",
		USER_ORDERS: (userId: string) => `orders-user-${userId}`,
		REFUNDS: (orderId: string) => `order-refunds-${orderId}`,
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
	approveRefundSchema: {},
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
}));

import { approveRefund } from "../approve-refund";

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
		reason: "CUSTOMER_REQUEST",
		order: {
			id: "order-1",
			orderNumber: "SYN-001",
			total: 10000,
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
// approveRefund
// ============================================================================

describe("approveRefund", () => {
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
		mockBuildUrl.mockImplementation((path: string) => `https://synclune.fr${path}`);
	});

	it("should return auth error when not admin", async () => {
		const authError = { status: "forbidden", message: "Accès non autorisé" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await approveRefund(undefined, makeFormData());

		expect(result).toBe(authError);
	});

	it("should return rate limit error", async () => {
		const rlError = { status: "error", message: "Rate limited" };
		mockEnforceRateLimit.mockResolvedValue({ error: rlError });

		const result = await approveRefund(undefined, makeFormData());

		expect(result).toBe(rlError);
	});

	it("should return validation error", async () => {
		const valError = { status: "error", message: "Invalid id" };
		mockValidateInput.mockReturnValue({ error: valError });

		const result = await approveRefund(undefined, makeFormData());

		expect(result).toBe(valError);
	});

	it("should return NOT_FOUND when refund does not exist", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(null);

		const result = await approveRefund(undefined, makeFormData());

		expect(mockError).toHaveBeenCalledWith("Le remboursement n'existe pas.");
	});

	it("should return ALREADY_APPROVED when status is APPROVED", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ status: "APPROVED" }));

		const result = await approveRefund(undefined, makeFormData());

		expect(mockError).toHaveBeenCalledWith("Ce remboursement est déjà approuvé.");
	});

	it("should return ALREADY_PROCESSED when status is not PENDING", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ status: "COMPLETED" }));

		const result = await approveRefund(undefined, makeFormData());

		expect(mockError).toHaveBeenCalledWith("Ce remboursement a déjà été traité.");
	});

	it("should update PENDING to APPROVED with atomic WHERE", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund());
		mockPrisma.refund.update.mockResolvedValue({});
		mockSendRefundApprovedEmail.mockResolvedValue(undefined);

		await approveRefund(undefined, makeFormData());

		expect(mockPrisma.refund.update).toHaveBeenCalledWith({
			where: { id: "refund-1", status: "PENDING" },
			data: { status: "APPROVED" },
		});
	});

	it("should invalidate cache tags including userId when present", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund());
		mockPrisma.refund.update.mockResolvedValue({});
		mockSendRefundApprovedEmail.mockResolvedValue(undefined);

		await approveRefund(undefined, makeFormData());

		expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
		expect(mockUpdateTag).toHaveBeenCalledWith("order-refunds-order-1");
		expect(mockUpdateTag).toHaveBeenCalledWith("orders-user-user-1");
	});

	it("should not invalidate user-specific cache when no userId", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(
			makeRefund({ order: { id: "order-1", orderNumber: "SYN-001", total: 10000, user: null } }),
		);
		mockPrisma.refund.update.mockResolvedValue({});

		await approveRefund(undefined, makeFormData());

		const userTagCalls = mockUpdateTag.mock.calls.filter(
			([tag]: [string]) => tag.startsWith("orders-user-"),
		);
		expect(userTagCalls).toHaveLength(0);
	});

	it("should send refund approved email with correct data", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund());
		mockPrisma.refund.update.mockResolvedValue({});
		mockSendRefundApprovedEmail.mockResolvedValue(undefined);

		await approveRefund(undefined, makeFormData());

		expect(mockSendRefundApprovedEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "client@example.com",
				orderNumber: "SYN-001",
				customerName: "Marie Dupont",
				refundAmount: 5000,
				originalOrderTotal: 10000,
				isPartialRefund: true,
				reason: "CUSTOMER_REQUEST",
			}),
		);
	});

	it("should call logFailedEmail on email failure but still succeed", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund());
		mockPrisma.refund.update.mockResolvedValue({});
		mockSendRefundApprovedEmail.mockRejectedValue(new Error("SMTP error"));
		mockLogFailedEmail.mockResolvedValue(undefined);

		const result = await approveRefund(undefined, makeFormData());

		expect(mockLogFailedEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "client@example.com",
				template: "refund-approved",
				orderId: "order-1",
			}),
		);
		// Action should still succeed
		expect(mockSuccess).toHaveBeenCalled();
	});

	it("should not send email when user has no email", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(
			makeRefund({
				order: {
					id: "order-1",
					orderNumber: "SYN-001",
					total: 10000,
					user: { id: "user-1", email: null, name: "Client" },
				},
			}),
		);
		mockPrisma.refund.update.mockResolvedValue({});

		await approveRefund(undefined, makeFormData());

		expect(mockSendRefundApprovedEmail).not.toHaveBeenCalled();
	});

	it("should include formatted amount in success message", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ amount: 7500 }));
		mockPrisma.refund.update.mockResolvedValue({});
		mockSendRefundApprovedEmail.mockResolvedValue(undefined);

		await approveRefund(undefined, makeFormData());

		expect(mockSuccess).toHaveBeenCalledWith(
			expect.stringContaining("75.00"),
		);
	});
});
