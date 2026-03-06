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
	mockSanitizeText,
	mockSendRefundRejectedEmail,
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
		orderNote: {
			create: vi.fn(),
		},
	},
	mockUpdateTag: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockSendRefundRejectedEmail: vi.fn(),
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

vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: mockSanitizeText,
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
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
		NOT_FOUND: "Le remboursement n'existe pas.",
		ALREADY_REJECTED: "Ce remboursement a déjà été refusé.",
		ALREADY_PROCESSED: "Ce remboursement a déjà été traité.",
		REJECT_FAILED: "Erreur lors du rejet du remboursement.",
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
	rejectRefundSchema: {},
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

import { rejectRefund } from "../reject-refund";

// ============================================================================
// Fixtures
// ============================================================================

function makeFormData(fields: { id?: string; reason?: string } = {}) {
	const fd = new FormData();
	fd.set("id", fields.id ?? "refund-1");
	if (fields.reason !== undefined) {
		fd.set("reason", fields.reason);
	}
	return fd;
}

function makeRefund(overrides: Record<string, unknown> = {}) {
	return {
		id: "refund-1",
		status: "PENDING",
		amount: 5000,
		note: null,
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
// rejectRefund
// ============================================================================

describe("rejectRefund", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAdminWithUser.mockResolvedValue({ user: mockAdmin });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ success: true, data: { id: "refund-1", reason: null } });
		mockSuccess.mockImplementation((msg: string) => ({ status: "success", message: msg }));
		mockError.mockImplementation((msg: string) => ({ status: "error", message: msg }));
		mockHandleActionError.mockImplementation((_e: unknown, msg: string) => ({
			status: "error",
			message: msg,
		}));
		mockSanitizeText.mockImplementation((text: string) => text);
		mockBuildUrl.mockImplementation((path: string) => `https://synclune.fr${path}`);
		mockSendRefundRejectedEmail.mockResolvedValue(undefined);
	});

	it("should return auth error when not admin", async () => {
		const authError = { status: "forbidden", message: "Accès non autorisé" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await rejectRefund(undefined, makeFormData());

		expect(result).toBe(authError);
	});

	it("should return rate limit error", async () => {
		const rlError = { status: "error", message: "Rate limited" };
		mockEnforceRateLimit.mockResolvedValue({ error: rlError });

		const result = await rejectRefund(undefined, makeFormData());

		expect(result).toBe(rlError);
	});

	it("should return validation error when id is invalid", async () => {
		const valError = { status: "error", message: "Invalid id" };
		mockValidateInput.mockReturnValue({ error: valError });

		const result = await rejectRefund(undefined, makeFormData({ id: "bad" }));

		expect(result).toBe(valError);
	});

	it("should return NOT_FOUND when refund does not exist", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(null);

		await rejectRefund(undefined, makeFormData());

		expect(mockError).toHaveBeenCalledWith("Le remboursement n'existe pas.");
	});

	it("should return ALREADY_REJECTED when status is REJECTED", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ status: "REJECTED" }));

		await rejectRefund(undefined, makeFormData());

		expect(mockError).toHaveBeenCalledWith("Ce remboursement a déjà été refusé.");
		expect(mockPrisma.refund.update).not.toHaveBeenCalled();
	});

	it("should return ALREADY_PROCESSED when status is APPROVED", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ status: "APPROVED" }));

		await rejectRefund(undefined, makeFormData());

		expect(mockError).toHaveBeenCalledWith("Ce remboursement a déjà été traité.");
		expect(mockPrisma.refund.update).not.toHaveBeenCalled();
	});

	it("should return ALREADY_PROCESSED when status is COMPLETED", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ status: "COMPLETED" }));

		await rejectRefund(undefined, makeFormData());

		expect(mockError).toHaveBeenCalledWith("Ce remboursement a déjà été traité.");
	});

	it("should append sanitized reason to note with [REFUSÉ] prefix when no existing note", async () => {
		mockValidateInput.mockReturnValue({
			success: true,
			data: { id: "refund-1", reason: "Délai dépassé" },
		});
		mockSanitizeText.mockReturnValue("Délai dépassé");
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ note: null }));
		mockPrisma.refund.update.mockResolvedValue({});

		await rejectRefund(undefined, makeFormData({ reason: "Délai dépassé" }));

		expect(mockPrisma.refund.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					note: "[REFUSÉ] Délai dépassé",
				}),
			}),
		);
	});

	it("should append reason to existing note with double newline separator", async () => {
		mockValidateInput.mockReturnValue({
			success: true,
			data: { id: "refund-1", reason: "Délai dépassé" },
		});
		mockSanitizeText.mockReturnValue("Délai dépassé");
		mockPrisma.refund.findUnique.mockResolvedValue(
			makeRefund({ note: "Note initiale de l'admin" }),
		);
		mockPrisma.refund.update.mockResolvedValue({});

		await rejectRefund(undefined, makeFormData({ reason: "Délai dépassé" }));

		expect(mockPrisma.refund.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					note: "Note initiale de l'admin\n\n[REFUSÉ] Délai dépassé",
				}),
			}),
		);
	});

	it("should keep original note unchanged when no reason is provided", async () => {
		mockValidateInput.mockReturnValue({
			success: true,
			data: { id: "refund-1", reason: null },
		});
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ note: "Note existante" }));
		mockPrisma.refund.update.mockResolvedValue({});

		await rejectRefund(undefined, makeFormData());

		expect(mockPrisma.refund.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					note: "Note existante",
				}),
			}),
		);
	});

	it("should use TOCTOU protection by including PENDING status in where clause", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund());
		mockPrisma.refund.update.mockResolvedValue({});

		await rejectRefund(undefined, makeFormData());

		expect(mockPrisma.refund.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "refund-1", status: "PENDING" },
			}),
		);
	});

	it("should set status to REJECTED in the update", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund());
		mockPrisma.refund.update.mockResolvedValue({});

		await rejectRefund(undefined, makeFormData());

		expect(mockPrisma.refund.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					status: "REJECTED",
				}),
			}),
		);
	});

	it("should invalidate all 7 cache tags when order has a user", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund());
		mockPrisma.refund.update.mockResolvedValue({});

		await rejectRefund(undefined, makeFormData());

		expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
		expect(mockUpdateTag).toHaveBeenCalledWith("order-refunds-order-1");
		expect(mockUpdateTag).toHaveBeenCalledWith("dashboard-kpis");
		expect(mockUpdateTag).toHaveBeenCalledWith("dashboard-revenue-chart");
		expect(mockUpdateTag).toHaveBeenCalledWith("dashboard-recent-orders");
		expect(mockUpdateTag).toHaveBeenCalledWith("orders-user-user-1");
	});

	it("should not invalidate user-specific cache tag when order has no user", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(
			makeRefund({ order: { id: "order-1", orderNumber: "SYN-001", user: null } }),
		);
		mockPrisma.refund.update.mockResolvedValue({});

		await rejectRefund(undefined, makeFormData());

		const userTagCalls = mockUpdateTag.mock.calls.filter(([tag]) =>
			(tag as string).startsWith("orders-user-"),
		);
		expect(userTagCalls).toHaveLength(0);
	});

	it("should send rejection email to customer with correct data", async () => {
		mockValidateInput.mockReturnValue({
			success: true,
			data: { id: "refund-1", reason: "Délai dépassé" },
		});
		mockSanitizeText.mockReturnValue("Délai dépassé");
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund());
		mockPrisma.refund.update.mockResolvedValue({});
		mockBuildUrl.mockReturnValue("https://synclune.fr/compte/commandes/order-1");

		await rejectRefund(undefined, makeFormData({ reason: "Délai dépassé" }));

		expect(mockSendRefundRejectedEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "client@example.com",
				orderNumber: "SYN-001",
				customerName: "Marie Dupont",
				refundAmount: 5000,
				reason: "Délai dépassé",
				orderDetailsUrl: "https://synclune.fr/compte/commandes/order-1",
			}),
		);
	});

	it("should use fallback customer name when user has no name", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(
			makeRefund({
				order: {
					id: "order-1",
					orderNumber: "SYN-001",
					user: { id: "user-1", email: "client@example.com", name: null },
				},
			}),
		);
		mockPrisma.refund.update.mockResolvedValue({});

		await rejectRefund(undefined, makeFormData());

		expect(mockSendRefundRejectedEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				customerName: "Client",
			}),
		);
	});

	it("should still succeed when email sending fails", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund());
		mockPrisma.refund.update.mockResolvedValue({});
		mockSendRefundRejectedEmail.mockRejectedValue(new Error("SMTP error"));

		await rejectRefund(undefined, makeFormData());

		expect(mockSuccess).toHaveBeenCalled();
	});

	it("should not send email when order user has no email", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(
			makeRefund({
				order: {
					id: "order-1",
					orderNumber: "SYN-001",
					user: { id: "user-1", email: null, name: "Marie Dupont" },
				},
			}),
		);
		mockPrisma.refund.update.mockResolvedValue({});

		await rejectRefund(undefined, makeFormData());

		expect(mockSendRefundRejectedEmail).not.toHaveBeenCalled();
	});

	it("should not send email when order has no user", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(
			makeRefund({ order: { id: "order-1", orderNumber: "SYN-001", user: null } }),
		);
		mockPrisma.refund.update.mockResolvedValue({});

		await rejectRefund(undefined, makeFormData());

		expect(mockSendRefundRejectedEmail).not.toHaveBeenCalled();
	});

	it("should return formatted success message with amount and order number", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ amount: 5000 }));
		mockPrisma.refund.update.mockResolvedValue({});

		await rejectRefund(undefined, makeFormData());

		expect(mockSuccess).toHaveBeenCalledWith(
			"Remboursement de 50.00 € refusé pour la commande SYN-001",
		);
	});

	it("should format fractional amounts correctly in success message", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefund({ amount: 12345 }));
		mockPrisma.refund.update.mockResolvedValue({});

		await rejectRefund(undefined, makeFormData());

		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("123.45"));
	});

	it("should delegate unexpected errors to handleActionError", async () => {
		const dbError = new Error("DB connection lost");
		mockPrisma.refund.findUnique.mockRejectedValue(dbError);

		await rejectRefund(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalledWith(
			dbError,
			"Erreur lors du rejet du remboursement.",
		);
	});
});
