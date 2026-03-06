import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockOrder, VALID_CUID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockHandleActionError,
	mockSendOrderConfirmationEmail,
	mockSendShippingConfirmationEmail,
	mockSendDeliveryConfirmationEmail,
	mockSendReviewRequestEmailInternal,
	mockGetCarrierLabel,
	mockBuildUrl,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSendOrderConfirmationEmail: vi.fn(),
	mockSendShippingConfirmationEmail: vi.fn(),
	mockSendDeliveryConfirmationEmail: vi.fn(),
	mockSendReviewRequestEmailInternal: vi.fn(),
	mockGetCarrierLabel: vi.fn(),
	mockBuildUrl: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdmin,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ORDER_LIMITS: { RESEND_EMAIL: "admin-resend-email" },
}));

vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	handleActionError: mockHandleActionError,
	success: (msg: string, data?: unknown) => ({ status: ActionStatus.SUCCESS, message: msg, data }),
	error: (msg: string) => ({ status: ActionStatus.ERROR, message: msg }),
}));

vi.mock("@/modules/emails/services/order-emails", () => ({
	sendOrderConfirmationEmail: mockSendOrderConfirmationEmail,
	sendShippingConfirmationEmail: mockSendShippingConfirmationEmail,
	sendDeliveryConfirmationEmail: mockSendDeliveryConfirmationEmail,
}));

vi.mock("@/modules/reviews/services/send-review-request-email.service", () => ({
	sendReviewRequestEmailInternal: mockSendReviewRequestEmailInternal,
}));

vi.mock("@/modules/orders/utils/carrier.utils", () => ({
	getCarrierLabel: mockGetCarrierLabel,
}));

vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: { ACCOUNT: { ORDER_DETAIL: (n: string) => `/compte/commandes/${n}` } },
}));

import { resendOrderEmail } from "../resend-order-email";
import type { ResendEmailType } from "../../types/email.types";

// ============================================================================
// HELPERS
// ============================================================================

function createDeliveredOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		status: "DELIVERED",
		fulfillmentStatus: "DELIVERED",
		paymentStatus: "PAID",
		trackingNumber: "1Z999AA10123456784",
		trackingUrl: "https://tracking.example.com/1Z999",
		shippingCarrier: "colissimo",
		actualDelivery: new Date("2026-02-01"),
		...overrides,
	});
}

function createShippedOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		status: "SHIPPED",
		fulfillmentStatus: "SHIPPED",
		paymentStatus: "PAID",
		trackingNumber: "1Z999AA10123456784",
		trackingUrl: "https://tracking.example.com/1Z999",
		shippingCarrier: "colissimo",
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("resendOrderEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@test.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSendOrderConfirmationEmail.mockResolvedValue({ success: true });
		mockSendShippingConfirmationEmail.mockResolvedValue({ success: true });
		mockSendDeliveryConfirmationEmail.mockResolvedValue({ success: true });
		mockSendReviewRequestEmailInternal.mockResolvedValue({
			status: ActionStatus.SUCCESS,
			message: "Email envoye",
		});
		mockGetCarrierLabel.mockReturnValue("Colissimo");
		mockBuildUrl.mockReturnValue("https://synclune.fr/compte/commandes/SYN-2026-0001");
		mockPrisma.order.findUnique.mockResolvedValue(createDeliveredOrder());

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	// Auth
	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await resendOrderEmail(VALID_CUID, "confirmation");

		expect(result).toEqual(authError);
		expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
	});

	// Rate limit
	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await resendOrderEmail(VALID_CUID, "confirmation");

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
	});

	// Invalid orderId
	it("should return error for invalid orderId", async () => {
		const result = await resendOrderEmail("not-a-valid-cuid", "confirmation");

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("invalide");
	});

	// Invalid emailType
	it("should return error for invalid emailType", async () => {
		const result = await resendOrderEmail(VALID_CUID, "invalid-type" as ResendEmailType);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("invalide");
	});

	// Order not found
	it("should return error when order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);

		const result = await resendOrderEmail(VALID_CUID, "confirmation");

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Commande non trouvee");
	});

	// -----------------------------------------------------------------------
	// Confirmation email
	// -----------------------------------------------------------------------

	it("should successfully resend confirmation email", async () => {
		const result = await resendOrderEmail(VALID_CUID, "confirmation");

		expect(mockSendOrderConfirmationEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "client@example.com",
				orderNumber: "SYN-2026-0001",
			}),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("confirmation");
	});

	it("should return error when confirmation email send fails", async () => {
		mockSendOrderConfirmationEmail.mockResolvedValue({ success: false });

		const result = await resendOrderEmail(VALID_CUID, "confirmation");

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("confirmation");
	});

	// -----------------------------------------------------------------------
	// Shipping email
	// -----------------------------------------------------------------------

	it("should successfully resend shipping email for SHIPPED order", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createShippedOrder());

		const result = await resendOrderEmail(VALID_CUID, "shipping");

		expect(mockSendShippingConfirmationEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "client@example.com",
				orderNumber: "SYN-2026-0001",
				trackingNumber: "1Z999AA10123456784",
			}),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("expedition");
	});

	it("should return error for shipping email when order is not SHIPPED or DELIVERED", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createMockOrder({ status: "PROCESSING", fulfillmentStatus: "PROCESSING" }),
		);

		const result = await resendOrderEmail(VALID_CUID, "shipping");

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("expediee");
	});

	it("should return error for shipping email when tracking number is missing", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createShippedOrder({ trackingNumber: null }));

		const result = await resendOrderEmail(VALID_CUID, "shipping");

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("suivi");
	});

	it("should return error when shipping email send fails", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createShippedOrder());
		mockSendShippingConfirmationEmail.mockResolvedValue({ success: false });

		const result = await resendOrderEmail(VALID_CUID, "shipping");

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("expedition");
	});

	// -----------------------------------------------------------------------
	// Delivery email
	// -----------------------------------------------------------------------

	it("should successfully resend delivery email for DELIVERED order", async () => {
		const result = await resendOrderEmail(VALID_CUID, "delivery");

		expect(mockSendDeliveryConfirmationEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "client@example.com",
				orderNumber: "SYN-2026-0001",
			}),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("livraison");
	});

	it("should return error for delivery email when order is not DELIVERED", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createMockOrder({ status: "SHIPPED", fulfillmentStatus: "SHIPPED" }),
		);

		const result = await resendOrderEmail(VALID_CUID, "delivery");

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("livree");
	});

	it("should return error when delivery email send fails", async () => {
		mockSendDeliveryConfirmationEmail.mockResolvedValue({ success: false });

		const result = await resendOrderEmail(VALID_CUID, "delivery");

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("livraison");
	});

	// -----------------------------------------------------------------------
	// Review request email
	// -----------------------------------------------------------------------

	it("should successfully resend review request email for DELIVERED order", async () => {
		const result = await resendOrderEmail(VALID_CUID, "review-request");

		expect(mockSendReviewRequestEmailInternal).toHaveBeenCalledWith(VALID_CUID);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("avis");
	});

	it("should return error for review request when order is not DELIVERED", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createMockOrder({ status: "SHIPPED", fulfillmentStatus: "SHIPPED" }),
		);

		const result = await resendOrderEmail(VALID_CUID, "review-request");

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("livree");
	});

	it("should return error when review request email service fails", async () => {
		mockSendReviewRequestEmailInternal.mockResolvedValue({
			status: ActionStatus.ERROR,
			message: "Service indisponible",
		});

		const result = await resendOrderEmail(VALID_CUID, "review-request");

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	// handleActionError on unexpected exception
	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.order.findUnique.mockRejectedValue(new Error("DB crash"));

		const result = await resendOrderEmail(VALID_CUID, "confirmation");

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
