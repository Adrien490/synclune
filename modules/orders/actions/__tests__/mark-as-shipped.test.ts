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
	mockSuccess,
	mockError,
	mockNotFound,
	mockValidationError,
	mockSendShippingEmail,
	mockCanMarkAsShipped,
	mockCreateOrderAuditTx,
	mockGetCarrierLabel,
	mockGetTrackingUrl,
	mockGetOrderInvalidationTags,
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
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockNotFound: vi.fn(),
	mockValidationError: vi.fn(),
	mockSendShippingEmail: vi.fn(),
	mockCanMarkAsShipped: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockGetCarrierLabel: vi.fn(),
	mockGetTrackingUrl: vi.fn(),
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
	ADMIN_ORDER_LIMITS: { SINGLE_OPERATIONS: "admin-order-single" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
	notFound: mockNotFound,
	validationError: mockValidationError,
}));
vi.mock("@/modules/emails/services/order-emails", () => ({
	sendShippingConfirmationEmail: mockSendShippingEmail,
}));
vi.mock("../../services/order-status-validation.service", () => ({
	canMarkAsShipped: mockCanMarkAsShipped,
}));
vi.mock("../../utils/order-audit", () => ({ createOrderAuditTx: mockCreateOrderAuditTx }));
vi.mock("@/modules/orders/utils/carrier.utils", () => ({
	getCarrierLabel: mockGetCarrierLabel,
	getTrackingUrl: mockGetTrackingUrl,
}));
vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOT_FOUND: "La commande n'existe pas.",
		ALREADY_SHIPPED: "Cette commande est deja expediee.",
		CANNOT_SHIP_CANCELLED: "Une commande annulee ne peut pas etre expediee.",
		CANNOT_SHIP_UNPAID: "Une commande non payee ne peut pas etre expediee.",
		MARK_AS_SHIPPED_FAILED: "Erreur lors du marquage.",
	},
}));
vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));
vi.mock("../../schemas/order.schemas", () => ({
	markAsShippedSchema: {
		safeParse: vi.fn().mockReturnValue({
			success: true,
			data: {
				id: "test",
				trackingNumber: "1Z999",
				trackingUrl: undefined,
				carrier: undefined,
				sendEmail: true,
			},
		}),
	},
}));

import { markAsShipped } from "../mark-as-shipped";
import { markAsShippedSchema } from "../../schemas/order.schemas";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({
	id: VALID_CUID,
	trackingNumber: "1Z999AA10123456784",
	sendEmail: "true",
});

function createShippableOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		status: "PROCESSING",
		paymentStatus: "PAID",
		fulfillmentStatus: "PROCESSING",
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("markAsShipped", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockCanMarkAsShipped.mockReturnValue({ canShip: true });
		mockCreateOrderAuditTx.mockResolvedValue(undefined);
		mockSendShippingEmail.mockResolvedValue(undefined);
		mockGetCarrierLabel.mockReturnValue("Colissimo");
		mockGetTrackingUrl.mockReturnValue("https://tracking.example.com/1Z999");
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list"]);

		const order = createShippableOrder();
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockPrisma.order.update.mockResolvedValue({});

		vi.mocked(markAsShippedSchema.safeParse).mockReturnValue({
			success: true,
			data: { id: VALID_CUID, trackingNumber: "1Z999", sendEmail: true },
		} as never);

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockNotFound.mockImplementation((resource: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${resource} non trouvé`,
		}));
		mockValidationError.mockImplementation((msg: string) => ({
			status: ActionStatus.VALIDATION_ERROR,
			message: msg,
		}));
	});

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });
		const result = await markAsShipped(undefined, validFormData);
		expect(result).toEqual(authError);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await markAsShipped(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		vi.mocked(markAsShippedSchema.safeParse).mockReturnValue({
			success: false,
			error: { issues: [{ message: "Le numero de suivi est requis" }] },
		} as never);
		const result = await markAsShipped(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return NOT_FOUND when order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		const result = await markAsShipped(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should return error when order is already shipped", async () => {
		mockCanMarkAsShipped.mockReturnValue({ canShip: false, reason: "already_shipped" });
		const result = await markAsShipped(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("expediee");
	});

	it("should return error when order is unpaid", async () => {
		mockCanMarkAsShipped.mockReturnValue({ canShip: false, reason: "unpaid" });
		const result = await markAsShipped(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return error when order is cancelled", async () => {
		mockCanMarkAsShipped.mockReturnValue({ canShip: false, reason: "cancelled" });
		const result = await markAsShipped(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should succeed and include tracking number in message", async () => {
		const result = await markAsShipped(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("1Z999");
	});

	it("should send shipping email when sendEmail is true", async () => {
		const result = await markAsShipped(undefined, validFormData);
		expect(mockSendShippingEmail).toHaveBeenCalledWith(
			expect.objectContaining({ orderNumber: "SYN-2026-0001" }),
		);
		expect(result.message).toContain("Email");
	});

	it("should return WARNING when email fails", async () => {
		mockSendShippingEmail.mockRejectedValue(new Error("SMTP error"));
		const result = await markAsShipped(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.WARNING);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await markAsShipped(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
