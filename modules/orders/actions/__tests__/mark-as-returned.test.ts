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
	mockSendReturnConfirmationEmail,
	mockCreateOrderAuditTx,
	mockBuildUrl,
	mockGetOrderInvalidationTags,
	mockCanMarkAsReturned,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn(), update: vi.fn() },
		orderHistory: { create: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSendReturnConfirmationEmail: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockBuildUrl: vi.fn(),
	mockGetOrderInvalidationTags: vi.fn(),
	mockCanMarkAsReturned: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ORDER_LIMITS: { SINGLE_OPERATIONS: "admin-order-single" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({ handleActionError: mockHandleActionError }));
vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: (text: string) => text }));
vi.mock("@/modules/emails/services/status-emails", () => ({
	sendReturnConfirmationEmail: mockSendReturnConfirmationEmail,
}));
vi.mock("../../utils/order-audit", () => ({ createOrderAuditTx: mockCreateOrderAuditTx }));
vi.mock("../../utils/customer-name", () => ({
	extractCustomerFirstName: (_name: string, firstName: string) => firstName,
}));
vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: { ACCOUNT: { ORDER_DETAIL: (n: string) => `/compte/commandes/${n}` } },
}));
vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));
vi.mock("../../services/order-status-validation.service", () => ({
	canMarkAsReturned: mockCanMarkAsReturned,
}));
vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOT_FOUND: "La commande n'existe pas.",
		ALREADY_RETURNED: "Cette commande est deja marquee comme retournee.",
		CANNOT_RETURN_NOT_DELIVERED: "Seule une commande livree peut etre marquee comme retournee.",
		MARK_AS_RETURNED_FAILED: "Erreur lors du marquage comme retourne.",
	},
}));
vi.mock("../../schemas/order.schemas", () => ({
	markAsReturnedSchema: {
		safeParse: vi
			.fn()
			.mockReturnValue({ success: true, data: { id: VALID_CUID, reason: undefined } }),
	},
}));

import { markAsReturned } from "../mark-as-returned";
import { markAsReturnedSchema } from "../../schemas/order.schemas";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ id: VALID_CUID });
const validFormDataWithReason = createMockFormData({
	id: VALID_CUID,
	reason: "Produit defectueux",
});

function createDeliveredOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		status: "DELIVERED",
		paymentStatus: "PAID",
		fulfillmentStatus: "DELIVERED",
		total: 4999,
		customerEmail: "client@example.com",
		customerName: "Marie Dupont",
		shippingFirstName: "Marie",
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("markAsReturned", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({ user: { id: "admin-1", name: "Admin Test" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockCreateOrderAuditTx.mockResolvedValue(undefined);
		mockSendReturnConfirmationEmail.mockResolvedValue(undefined);
		mockBuildUrl.mockReturnValue("https://synclune.fr/compte/commandes/SYN-2026-0001");
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list"]);
		mockCanMarkAsReturned.mockReturnValue({ canReturn: true });

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.order.findUnique.mockResolvedValue(createDeliveredOrder());
		mockPrisma.order.update.mockResolvedValue({});

		vi.mocked(markAsReturnedSchema.safeParse).mockReturnValue({
			success: true,
			data: { id: VALID_CUID, reason: undefined },
		} as never);

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" },
		});
		const result = await markAsReturned(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error when rate limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de requetes" },
		});
		const result = await markAsReturned(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid ID", async () => {
		vi.mocked(markAsReturnedSchema.safeParse).mockReturnValue({
			success: false,
			error: { issues: [{ message: "ID invalide" }] },
		} as never);
		const result = await markAsReturned(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(result.message).toBe("ID invalide");
	});

	it("should return NOT_FOUND when order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		const result = await markAsReturned(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(result.message).toBe("La commande n'existe pas.");
	});

	it("should return error already_returned when fulfillmentStatus is RETURNED", async () => {
		mockCanMarkAsReturned.mockReturnValue({ canReturn: false, reason: "already_returned" });
		mockPrisma.order.findUnique.mockResolvedValue(
			createDeliveredOrder({ fulfillmentStatus: "RETURNED" }),
		);
		const result = await markAsReturned(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("retournee");
	});

	it("should return error not_delivered when order is not DELIVERED", async () => {
		mockCanMarkAsReturned.mockReturnValue({ canReturn: false, reason: "not_delivered" });
		mockPrisma.order.findUnique.mockResolvedValue(createDeliveredOrder({ status: "SHIPPED" }));
		const result = await markAsReturned(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("livree");
	});

	it("should successfully mark a DELIVERED order as RETURNED (fulfillmentStatus only)", async () => {
		const result = await markAsReturned(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("SYN-2026-0001");
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					fulfillmentStatus: "RETURNED",
				}),
			}),
		);
		// OrderStatus must NOT be changed
		expect(mockPrisma.order.update).not.toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: expect.anything() }),
			}),
		);
	});

	it("should create audit trail with reason when provided", async () => {
		vi.mocked(markAsReturnedSchema.safeParse).mockReturnValue({
			success: true,
			data: { id: VALID_CUID, reason: "Produit defectueux" },
		} as never);

		await markAsReturned(undefined, validFormDataWithReason);

		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				action: "RETURNED",
				newFulfillmentStatus: "RETURNED",
				note: "Produit defectueux",
			}),
		);
	});

	it("should create audit trail without reason when not provided", async () => {
		await markAsReturned(undefined, validFormData);
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				action: "RETURNED",
				note: undefined,
			}),
		);
	});

	it("should send return confirmation email on success", async () => {
		const result = await markAsReturned(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSendReturnConfirmationEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "client@example.com",
				orderNumber: "SYN-2026-0001",
			}),
		);
		expect(result.message).toContain("Email");
	});

	it("should report email failure without failing the action", async () => {
		mockSendReturnConfirmationEmail.mockRejectedValue(new Error("SMTP error"));
		const result = await markAsReturned(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("chec envoi email");
	});

	it("should not send email when customerEmail is missing", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createDeliveredOrder({ customerEmail: null }));
		const result = await markAsReturned(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSendReturnConfirmationEmail).not.toHaveBeenCalled();
	});

	it("should invalidate cache tags with orderId on success", async () => {
		const order = createDeliveredOrder();
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list", `order-${order.id}`]);

		await markAsReturned(undefined, validFormData);

		expect(mockGetOrderInvalidationTags).toHaveBeenCalledWith(order.userId, order.id);
		expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
		expect(mockUpdateTag).toHaveBeenCalledWith(`order-${order.id}`);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await markAsReturned(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
