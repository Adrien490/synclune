import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import {
	createMockFormData,
	createMockOrder,
	VALID_ORDER_ID,
	VALID_USER_ID,
} from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockGetOrderInvalidationTags,
	mockCreateOrderAuditTx,
	mockSendDeliveryEmail,
	mockScheduleReviewEmails,
	mockBuildUrl,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: {
			findMany: vi.fn(),
			updateMany: vi.fn(),
		},
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockGetOrderInvalidationTags: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockSendDeliveryEmail: vi.fn(),
	mockScheduleReviewEmails: vi.fn(),
	mockBuildUrl: vi.fn(),
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
	ADMIN_ORDER_LIMITS: { BULK_OPERATIONS: "admin-order-bulk" },
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
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: (message: string) => ({ status: ActionStatus.SUCCESS, message }),
	error: (message: string) => ({ status: ActionStatus.ERROR, message }),
}));

vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
	ORDERS_CACHE_TAGS: {
		HISTORY: (orderId: string) => `order-history-${orderId}`,
	},
}));

vi.mock("../../utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

vi.mock("@/modules/emails/services/order-emails", () => ({
	sendDeliveryConfirmationEmail: mockSendDeliveryEmail,
}));

vi.mock("@/modules/webhooks/services/review-request.service", () => ({
	scheduleReviewRequestEmailsBulk: mockScheduleReviewEmails,
}));

vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: { ACCOUNT: { ORDER_DETAIL: (n: string) => `/compte/commandes/${n}` } },
}));

vi.mock("../../schemas/order.schemas", () => ({
	bulkMarkAsDeliveredSchema: {},
}));

vi.mock("../../utils/customer-name", () => ({
	extractCustomerFirstName: (_name: string, firstName: string) => firstName,
}));

import { bulkMarkAsDelivered } from "../bulk-mark-as-delivered";

// ============================================================================
// HELPERS
// ============================================================================

const VALID_IDS = [VALID_ORDER_ID, "order_cm9876543210zyxwv"];

function makeFormData(ids: string[] = VALID_IDS, sendEmail?: string) {
	return createMockFormData({
		ids: JSON.stringify(ids),
		...(sendEmail !== undefined ? { sendEmail } : {}),
	});
}

function createShippedOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		id: VALID_ORDER_ID,
		userId: VALID_USER_ID,
		status: "SHIPPED",
		customerEmail: "client@example.com",
		customerName: "Marie Dupont",
		shippingFirstName: "Marie",
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkMarkAsDelivered", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin Test" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list", "admin-badges"]);
		mockCreateOrderAuditTx.mockResolvedValue(undefined);
		mockSendDeliveryEmail.mockResolvedValue(undefined);
		mockScheduleReviewEmails.mockResolvedValue(undefined);
		mockBuildUrl.mockReturnValue("https://synclune.fr/compte/commandes/SYN-2026-0001");
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));

		mockValidateInput.mockImplementation((_schema: unknown, data: unknown) => ({
			data: { ...(data as object), ids: VALID_IDS, sendEmail: false },
		}));

		const order = createShippedOrder();
		mockPrisma.order.findMany.mockResolvedValue([order]);

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
				return fn(mockPrisma);
			},
		);
	});

	// --------------------------------------------------------------------------
	// Auth
	// --------------------------------------------------------------------------

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await bulkMarkAsDelivered(undefined, makeFormData());

		expect(result).toEqual(authError);
		expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Rate limit
	// --------------------------------------------------------------------------

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await bulkMarkAsDelivered(undefined, makeFormData());

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// IDs parsing
	// --------------------------------------------------------------------------

	it("should return error for malformed JSON ids", async () => {
		const formData = createMockFormData({ ids: "not-valid-json" });

		const result = await bulkMarkAsDelivered(undefined, formData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("invalide");
	});

	// --------------------------------------------------------------------------
	// Validation
	// --------------------------------------------------------------------------

	it("should return validation error when validateInput fails", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "IDs invalides" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await bulkMarkAsDelivered(undefined, makeFormData());

		expect(result).toEqual(validationError);
		expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// No eligible orders
	// --------------------------------------------------------------------------

	it("should return error when no eligible SHIPPED orders found", async () => {
		mockPrisma.order.findMany.mockResolvedValue([]);

		const result = await bulkMarkAsDelivered(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("SHIPPED");
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Order status update
	// --------------------------------------------------------------------------

	it("should update eligible SHIPPED orders to DELIVERED status", async () => {
		const order = createShippedOrder();
		mockPrisma.order.findMany.mockResolvedValue([order]);

		const result = await bulkMarkAsDelivered(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: { in: [order.id] } },
				data: expect.objectContaining({
					status: "DELIVERED",
					fulfillmentStatus: "DELIVERED",
				}),
			}),
		);
	});

	it("should set actualDelivery date during the update", async () => {
		const order = createShippedOrder();
		mockPrisma.order.findMany.mockResolvedValue([order]);

		await bulkMarkAsDelivered(undefined, makeFormData());

		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					actualDelivery: expect.any(Date),
				}),
			}),
		);
	});

	// --------------------------------------------------------------------------
	// Audit trail
	// --------------------------------------------------------------------------

	it("should create an audit trail entry for each delivered order", async () => {
		const order1 = createShippedOrder({ id: "order-1" });
		const order2 = createShippedOrder({ id: "order-2", orderNumber: "SYN-2026-0002" });
		mockPrisma.order.findMany.mockResolvedValue([order1, order2]);

		await bulkMarkAsDelivered(undefined, makeFormData());

		expect(mockCreateOrderAuditTx).toHaveBeenCalledTimes(2);
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				orderId: "order-1",
				action: "DELIVERED",
				previousStatus: "SHIPPED",
				newStatus: "DELIVERED",
				authorId: "admin-1",
				authorName: "Admin Test",
				metadata: expect.objectContaining({ bulk: true }),
			}),
		);
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				orderId: "order-2",
				action: "DELIVERED",
			}),
		);
	});

	it("should include deliveryDate in audit metadata", async () => {
		const order = createShippedOrder();
		mockPrisma.order.findMany.mockResolvedValue([order]);

		await bulkMarkAsDelivered(undefined, makeFormData());

		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				metadata: expect.objectContaining({
					deliveryDate: expect.any(String),
				}),
			}),
		);
	});

	// --------------------------------------------------------------------------
	// Email sending
	// --------------------------------------------------------------------------

	it("should send delivery confirmation emails when sendEmail is true", async () => {
		mockValidateInput.mockImplementation((_schema: unknown, data: unknown) => ({
			data: { ...(data as object), ids: VALID_IDS, sendEmail: true },
		}));
		const order = createShippedOrder({ customerEmail: "client@example.com" });
		mockPrisma.order.findMany.mockResolvedValue([order]);

		await bulkMarkAsDelivered(undefined, makeFormData(VALID_IDS, "true"));

		expect(mockSendDeliveryEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "client@example.com",
				orderNumber: order.orderNumber,
				customerName: "Marie",
			}),
		);
	});

	it("should not send emails when sendEmail is false", async () => {
		mockValidateInput.mockImplementation((_schema: unknown, data: unknown) => ({
			data: { ...(data as object), ids: VALID_IDS, sendEmail: false },
		}));
		const order = createShippedOrder({ customerEmail: "client@example.com" });
		mockPrisma.order.findMany.mockResolvedValue([order]);

		await bulkMarkAsDelivered(undefined, makeFormData(VALID_IDS, "false"));

		expect(mockSendDeliveryEmail).not.toHaveBeenCalled();
	});

	it("should not send email for orders with no customerEmail", async () => {
		mockValidateInput.mockImplementation((_schema: unknown, data: unknown) => ({
			data: { ...(data as object), ids: VALID_IDS, sendEmail: true },
		}));
		const order = createShippedOrder({ customerEmail: null });
		mockPrisma.order.findMany.mockResolvedValue([order]);

		await bulkMarkAsDelivered(undefined, makeFormData(VALID_IDS, "true"));

		expect(mockSendDeliveryEmail).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Review request emails
	// --------------------------------------------------------------------------

	it("should schedule review request emails for all delivered orders", async () => {
		const order = createShippedOrder();
		mockPrisma.order.findMany.mockResolvedValue([order]);

		await bulkMarkAsDelivered(undefined, makeFormData());

		expect(mockScheduleReviewEmails).toHaveBeenCalledWith([order.id]);
	});

	// --------------------------------------------------------------------------
	// Cache invalidation
	// --------------------------------------------------------------------------

	it("should invalidate cache tags for each unique userId", async () => {
		const order1 = createShippedOrder({ id: "order-1", userId: "user-1" });
		const order2 = createShippedOrder({
			id: "order-2",
			userId: "user-2",
			orderNumber: "SYN-2026-0002",
		});
		mockPrisma.order.findMany.mockResolvedValue([order1, order2]);

		await bulkMarkAsDelivered(undefined, makeFormData());

		expect(mockGetOrderInvalidationTags).toHaveBeenCalledWith("user-1");
		expect(mockGetOrderInvalidationTags).toHaveBeenCalledWith("user-2");
		// Admin list invalidation (no userId)
		expect(mockGetOrderInvalidationTags).toHaveBeenCalledWith();
	});

	it("should invalidate order history tag for each delivered order", async () => {
		const order = createShippedOrder({ id: "order-hist-42" });
		mockPrisma.order.findMany.mockResolvedValue([order]);

		await bulkMarkAsDelivered(undefined, makeFormData());

		expect(mockUpdateTag).toHaveBeenCalledWith("order-history-order-hist-42");
	});

	it("should always invalidate the admin list even if orders have no userId", async () => {
		const order = createShippedOrder({ userId: null });
		mockPrisma.order.findMany.mockResolvedValue([order]);

		await bulkMarkAsDelivered(undefined, makeFormData());

		expect(mockGetOrderInvalidationTags).toHaveBeenCalledWith();
		expect(mockGetOrderInvalidationTags).not.toHaveBeenCalledWith(null);
	});

	// --------------------------------------------------------------------------
	// Success message
	// --------------------------------------------------------------------------

	it("should return success message with count of delivered orders", async () => {
		const order1 = createShippedOrder({ id: "order-1" });
		const order2 = createShippedOrder({ id: "order-2", orderNumber: "SYN-2026-0002" });
		mockPrisma.order.findMany.mockResolvedValue([order1, order2]);

		const result = await bulkMarkAsDelivered(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("2");
		expect(result.message).toContain("livree");
	});

	it("should use singular form for a single delivered order", async () => {
		const order = createShippedOrder();
		mockPrisma.order.findMany.mockResolvedValue([order]);

		const result = await bulkMarkAsDelivered(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("1");
	});

	// --------------------------------------------------------------------------
	// Error handling
	// --------------------------------------------------------------------------

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.order.findMany.mockRejectedValue(new Error("DB crash"));

		const result = await bulkMarkAsDelivered(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should call handleActionError when transaction fails", async () => {
		mockPrisma.order.findMany.mockResolvedValue([createShippedOrder()]);
		mockPrisma.$transaction.mockRejectedValue(new Error("Transaction failed"));

		const result = await bulkMarkAsDelivered(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
