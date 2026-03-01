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
	mockSendRevertShippingNotificationEmail,
	mockCreateOrderAuditTx,
	mockBuildUrl,
	mockGetOrderInvalidationTags,
	mockCanRevertToProcessing,
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
	mockSendRevertShippingNotificationEmail: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockBuildUrl: vi.fn(),
	mockGetOrderInvalidationTags: vi.fn(),
	mockCanRevertToProcessing: vi.fn(),
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
	sendRevertShippingNotificationEmail: mockSendRevertShippingNotificationEmail,
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
	canRevertToProcessing: mockCanRevertToProcessing,
}));
vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOT_FOUND: "La commande n'existe pas.",
		CANNOT_REVERT_NOT_SHIPPED: "Seule une commande expediee peut etre remise en preparation.",
		REVERT_TO_PROCESSING_FAILED: "Erreur lors de l'annulation de l'expedition.",
	},
}));
vi.mock("../../schemas/order.schemas", () => ({
	revertToProcessingSchema: {
		safeParse: vi
			.fn()
			.mockReturnValue({ success: true, data: { id: VALID_CUID, reason: "Erreur transporteur" } }),
	},
}));

import { revertToProcessing } from "../revert-to-processing";
import { revertToProcessingSchema } from "../../schemas/order.schemas";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ id: VALID_CUID, reason: "Erreur transporteur" });
const invalidFormData = createMockFormData({ id: VALID_CUID });

function createShippedOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		status: "SHIPPED",
		paymentStatus: "PAID",
		fulfillmentStatus: "SHIPPED",
		trackingNumber: "1Z999AA1012345678",
		trackingUrl: "https://tracking.example.com/1Z999AA1012345678",
		customerEmail: "client@example.com",
		customerName: "Marie Dupont",
		shippingFirstName: "Marie",
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("revertToProcessing", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({ user: { id: "admin-1", name: "Admin Test" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockCreateOrderAuditTx.mockResolvedValue(undefined);
		mockSendRevertShippingNotificationEmail.mockResolvedValue(undefined);
		mockBuildUrl.mockReturnValue("https://synclune.fr/compte/commandes/SYN-2026-0001");
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list"]);
		mockCanRevertToProcessing.mockReturnValue({ canRevert: true });

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.order.findUnique.mockResolvedValue(createShippedOrder());
		mockPrisma.order.update.mockResolvedValue({});

		vi.mocked(revertToProcessingSchema.safeParse).mockReturnValue({
			success: true,
			data: { id: VALID_CUID, reason: "Erreur transporteur" },
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
		const result = await revertToProcessing(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error when rate limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de requetes" },
		});
		const result = await revertToProcessing(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error when reason is missing", async () => {
		vi.mocked(revertToProcessingSchema.safeParse).mockReturnValue({
			success: false,
			error: { issues: [{ message: "La raison est obligatoire" }] },
		} as never);
		const result = await revertToProcessing(undefined, invalidFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(result.message).toBe("La raison est obligatoire");
	});

	it("should return validation error for invalid ID", async () => {
		vi.mocked(revertToProcessingSchema.safeParse).mockReturnValue({
			success: false,
			error: { issues: [{ message: "ID invalide" }] },
		} as never);
		const result = await revertToProcessing(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(result.message).toBe("ID invalide");
	});

	it("should return NOT_FOUND when order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		const result = await revertToProcessing(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(result.message).toBe("La commande n'existe pas.");
	});

	it("should return error not_shipped via canRevertToProcessing service", async () => {
		mockCanRevertToProcessing.mockReturnValue({ canRevert: false, reason: "not_shipped" });
		mockPrisma.order.findUnique.mockResolvedValue(createShippedOrder({ status: "PROCESSING" }));
		const result = await revertToProcessing(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("expediee");
	});

	it("should successfully revert a SHIPPED order to PROCESSING", async () => {
		const result = await revertToProcessing(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("SYN-2026-0001");
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					status: "PROCESSING",
					fulfillmentStatus: "PROCESSING",
				}),
			}),
		);
	});

	it("should clear tracking info on revert", async () => {
		await revertToProcessing(undefined, validFormData);
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					trackingNumber: null,
					trackingUrl: null,
					shippingCarrier: null,
					shippedAt: null,
				}),
			}),
		);
	});

	it("should create audit trail with reason and previous tracking info", async () => {
		const order = createShippedOrder();
		mockPrisma.order.findUnique.mockResolvedValue(order);

		await revertToProcessing(undefined, validFormData);

		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				action: "STATUS_REVERTED",
				newStatus: "PROCESSING",
				newFulfillmentStatus: "PROCESSING",
				note: "Erreur transporteur",
				metadata: expect.objectContaining({
					previousTrackingNumber: order.trackingNumber,
					previousTrackingUrl: order.trackingUrl,
				}),
			}),
		);
	});

	it("should send revert notification email on success", async () => {
		const result = await revertToProcessing(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSendRevertShippingNotificationEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "client@example.com",
				orderNumber: "SYN-2026-0001",
				reason: "Erreur transporteur",
			}),
		);
		expect(result.message).toContain("Email");
	});

	it("should report email failure without failing the action", async () => {
		mockSendRevertShippingNotificationEmail.mockRejectedValue(new Error("SMTP error"));
		const result = await revertToProcessing(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("chec envoi email");
	});

	it("should not send email when customerEmail is missing", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createShippedOrder({ customerEmail: null }));
		const result = await revertToProcessing(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSendRevertShippingNotificationEmail).not.toHaveBeenCalled();
	});

	it("should include previous tracking number in success message when present", async () => {
		const result = await revertToProcessing(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("1Z999AA1012345678");
	});

	it("should not include tracking info in success message when absent", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createShippedOrder({ trackingNumber: null }));
		const result = await revertToProcessing(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).not.toContain("suivi");
	});

	it("should invalidate cache tags with orderId on success", async () => {
		const order = createShippedOrder();
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list", `order-${order.id}`]);

		await revertToProcessing(undefined, validFormData);

		expect(mockGetOrderInvalidationTags).toHaveBeenCalledWith(order.userId, order.id);
		expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
		expect(mockUpdateTag).toHaveBeenCalledWith(`order-${order.id}`);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await revertToProcessing(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
