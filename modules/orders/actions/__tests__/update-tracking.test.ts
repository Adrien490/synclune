import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, createMockOrder, VALID_CUID, VALID_USER_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockHandleActionError,
	mockUpdateTag,
	mockSendTrackingEmail,
	mockCreateOrderAuditTx,
	mockGetOrderMetadataInvalidationTags,
	mockGetCarrierLabel,
	mockGetTrackingUrl,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn(), update: vi.fn() },
		orderHistory: { create: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockSendTrackingEmail: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockGetOrderMetadataInvalidationTags: vi.fn(),
	mockGetCarrierLabel: vi.fn(),
	mockGetTrackingUrl: vi.fn(),
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
	ADMIN_ORDER_LIMITS: { SINGLE_OPERATIONS: "admin-order-single" },
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: (schema: { safeParse: (data: unknown) => unknown }, data: unknown) => {
		const result = schema.safeParse(data) as {
			success: boolean;
			data?: unknown;
			error?: { issues: { message: string }[] };
		};
		if (!result.success) {
			return {
				error: {
					status: ActionStatus.VALIDATION_ERROR,
					message: result.error?.issues[0]?.message ?? "Donnees invalides",
				},
			};
		}
		return { data: result.data };
	},
	success: (msg: string, data?: unknown) => ({ status: ActionStatus.SUCCESS, message: msg, data }),
	error: (msg: string) => ({ status: ActionStatus.ERROR, message: msg }),
	handleActionError: mockHandleActionError,
}));

vi.mock("@/modules/emails/services/order-emails", () => ({
	sendTrackingUpdateEmail: mockSendTrackingEmail,
}));

vi.mock("../../utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

vi.mock("../../constants/cache", () => ({
	getOrderMetadataInvalidationTags: mockGetOrderMetadataInvalidationTags,
}));

vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOT_FOUND: "La commande n'existe pas.",
	},
}));

vi.mock("@/modules/orders/utils/carrier.utils", () => ({
	getCarrierLabel: mockGetCarrierLabel,
	getTrackingUrl: mockGetTrackingUrl,
}));

vi.mock("../../schemas/order.schemas", () => ({
	updateTrackingSchema: {
		safeParse: vi.fn().mockReturnValue({
			success: true,
			data: {
				id: VALID_CUID,
				trackingNumber: "1Z999AA10123456784",
				trackingUrl: undefined,
				carrier: "colissimo",
				estimatedDelivery: undefined,
				sendEmail: true,
			},
		}),
	},
}));

import { updateTracking } from "../update-tracking";
import { updateTrackingSchema } from "../../schemas/order.schemas";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({
	id: VALID_CUID,
	trackingNumber: "1Z999AA10123456784",
	sendEmail: "true",
});

function createShippedOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		userId: VALID_USER_ID,
		status: "SHIPPED",
		paymentStatus: "PAID",
		fulfillmentStatus: "SHIPPED",
		trackingNumber: null,
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("updateTracking", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockCreateOrderAuditTx.mockResolvedValue(undefined);
		mockSendTrackingEmail.mockResolvedValue(undefined);
		mockGetCarrierLabel.mockReturnValue("Colissimo");
		mockGetTrackingUrl.mockReturnValue("https://tracking.colissimo.fr/1Z999AA10123456784");
		mockGetOrderMetadataInvalidationTags.mockReturnValue([
			"orders-list",
			`orders-user-${VALID_USER_ID}`,
		]);

		vi.mocked(updateTrackingSchema.safeParse).mockReturnValue({
			success: true,
			data: {
				id: VALID_CUID,
				trackingNumber: "1Z999AA10123456784",
				trackingUrl: undefined,
				carrier: "colissimo",
				estimatedDelivery: undefined,
				sendEmail: true,
			},
		} as never);

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.order.findUnique.mockResolvedValue(createShippedOrder());
		mockPrisma.order.update.mockResolvedValue({});

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	// Auth
	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await updateTracking(undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// Rate limit
	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await updateTracking(undefined, validFormData);

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// Validation
	it("should return validation error for invalid data", async () => {
		vi.mocked(updateTrackingSchema.safeParse).mockReturnValue({
			success: false,
			error: { issues: [{ message: "Le numero de suivi est requis" }] },
		} as never);

		const result = await updateTracking(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(result.message).toContain("suivi");
	});

	// Order not found
	it("should return error when order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);

		const result = await updateTracking(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("commande");
	});

	// Order not SHIPPED/DELIVERED
	it("should return error when order is not SHIPPED or DELIVERED", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createShippedOrder({ status: "PROCESSING" }));

		const result = await updateTracking(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("expediee");
	});

	// Success: updates tracking and creates audit
	it("should update tracking and create audit trail", async () => {
		const result = await updateTracking(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: VALID_CUID },
				data: expect.objectContaining({
					trackingNumber: "1Z999AA10123456784",
				}),
			}),
		);
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				orderId: VALID_CUID,
				action: "TRACKING_UPDATED",
				authorId: "admin-1",
			}),
		);
	});

	// Cache invalidation
	it("should invalidate order metadata cache tags", async () => {
		await updateTracking(undefined, validFormData);

		expect(mockGetOrderMetadataInvalidationTags).toHaveBeenCalledWith(
			VALID_USER_ID,
			expect.any(String),
		);
		expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
	});

	// Auto-generates tracking URL when not provided
	it("should auto-generate tracking URL when trackingUrl is not provided", async () => {
		vi.mocked(updateTrackingSchema.safeParse).mockReturnValue({
			success: true,
			data: {
				id: VALID_CUID,
				trackingNumber: "1Z999AA10123456784",
				trackingUrl: undefined,
				carrier: "colissimo",
				estimatedDelivery: undefined,
				sendEmail: false,
			},
		} as never);
		mockGetTrackingUrl.mockReturnValue("https://tracking.colissimo.fr/1Z999AA10123456784");

		await updateTracking(undefined, validFormData);

		expect(mockGetTrackingUrl).toHaveBeenCalledWith("colissimo", "1Z999AA10123456784");
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					trackingUrl: "https://tracking.colissimo.fr/1Z999AA10123456784",
				}),
			}),
		);
	});

	// Uses provided trackingUrl when given
	it("should use provided trackingUrl instead of auto-generating", async () => {
		vi.mocked(updateTrackingSchema.safeParse).mockReturnValue({
			success: true,
			data: {
				id: VALID_CUID,
				trackingNumber: "1Z999AA10123456784",
				trackingUrl: "https://custom-tracking.fr/1Z999",
				carrier: "colissimo",
				estimatedDelivery: undefined,
				sendEmail: false,
			},
		} as never);

		await updateTracking(undefined, validFormData);

		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					trackingUrl: "https://custom-tracking.fr/1Z999",
				}),
			}),
		);
	});

	// Sends email when sendEmail=true and succeeds
	it("should send tracking email when sendEmail is true", async () => {
		const result = await updateTracking(undefined, validFormData);

		expect(mockSendTrackingEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				orderNumber: "SYN-2026-0001",
				trackingNumber: "1Z999AA10123456784",
			}),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("Email");
	});

	// Returns WARNING when email fails
	it("should return WARNING status when email send fails", async () => {
		mockSendTrackingEmail.mockRejectedValue(new Error("SMTP error"));

		const result = await updateTracking(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.WARNING);
		expect(result.message).toContain("email");
	});

	// No email sent when sendEmail=false
	it("should not send email when sendEmail is false", async () => {
		vi.mocked(updateTrackingSchema.safeParse).mockReturnValue({
			success: true,
			data: {
				id: VALID_CUID,
				trackingNumber: "1Z999AA10123456784",
				trackingUrl: undefined,
				carrier: "colissimo",
				estimatedDelivery: undefined,
				sendEmail: false,
			},
		} as never);

		const result = await updateTracking(undefined, validFormData);

		expect(mockSendTrackingEmail).not.toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// Also succeeds for DELIVERED orders
	it("should succeed when order is DELIVERED", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createShippedOrder({ status: "DELIVERED" }));

		const result = await updateTracking(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// handleActionError on unexpected exception
	it("should call handleActionError on unexpected transaction failure", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));

		const result = await updateTracking(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
