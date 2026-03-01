import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, createMockOrder, VALID_CUID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockHandleActionError,
	mockSendOrderConfirmationEmail,
	mockCreateOrderAuditTx,
	mockBuildUrl,
	mockGetOrderInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn(), update: vi.fn() },
		productSku: { updateMany: vi.fn() },
		orderHistory: { create: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSendOrderConfirmationEmail: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockBuildUrl: vi.fn(),
	mockGetOrderInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ORDER_LIMITS: { MARK_AS_PAID: "admin-mark-paid" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({ handleActionError: mockHandleActionError }));
vi.mock("@/modules/emails/services/order-emails", () => ({
	sendOrderConfirmationEmail: mockSendOrderConfirmationEmail,
}));
vi.mock("../../utils/order-audit", () => ({ createOrderAuditTx: mockCreateOrderAuditTx }));
vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: { ACCOUNT: { ORDER_DETAIL: (n: string) => `/compte/commandes/${n}` } },
}));
vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOT_FOUND: "La commande n'existe pas.",
		ALREADY_PAID: "Cette commande est deja payee.",
		CANNOT_PAY_CANCELLED: "Une commande annulee ne peut pas etre marquee comme payee.",
		MARK_AS_PAID_FAILED: "Erreur lors du marquage.",
	},
}));
vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));
vi.mock("../../schemas/order.schemas", () => ({
	markAsPaidSchema: {
		safeParse: vi.fn().mockReturnValue({ success: true, data: { id: "test", note: undefined } }),
	},
}));

import { markAsPaid } from "../mark-as-paid";
import { markAsPaidSchema } from "../../schemas/order.schemas";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ id: VALID_CUID });

function createPendingOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		status: "PENDING",
		paymentStatus: "PENDING",
		stripeCheckoutSessionId: null,
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("markAsPaid", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockCreateOrderAuditTx.mockResolvedValue(undefined);
		mockSendOrderConfirmationEmail.mockReturnValue(Promise.resolve());
		mockBuildUrl.mockReturnValue("https://synclune.fr/tracking");
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list"]);

		const order = createPendingOrder();
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockPrisma.order.update.mockResolvedValue({});
		mockPrisma.productSku.updateMany.mockResolvedValue({ count: 1 });

		vi.mocked(markAsPaidSchema.safeParse).mockReturnValue({
			success: true,
			data: { id: VALID_CUID, note: undefined },
		} as never);

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await markAsPaid(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await markAsPaid(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		vi.mocked(markAsPaidSchema.safeParse).mockReturnValue({
			success: false,
			error: { issues: [{ message: "ID invalide" }] },
		} as never);
		const result = await markAsPaid(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return NOT_FOUND when order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		const result = await markAsPaid(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should return error when order is already paid", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createPendingOrder({ paymentStatus: "PAID" }));
		const result = await markAsPaid(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("payee");
	});

	it("should return error when order is cancelled", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createPendingOrder({ status: "CANCELLED" }));
		const result = await markAsPaid(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should decrement stock for orders without Stripe session", async () => {
		const result = await markAsPaid(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.productSku.updateMany).toHaveBeenCalled();
	});

	it("should skip stock decrement when Stripe session exists", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createPendingOrder({ stripeCheckoutSessionId: "cs_test_123" }),
		);
		const result = await markAsPaid(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.productSku.updateMany).not.toHaveBeenCalled();
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await markAsPaid(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
