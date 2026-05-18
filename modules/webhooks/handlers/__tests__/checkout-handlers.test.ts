import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

const {
	mockPrisma,
	mockRetrieve,
	mockCreateOrder,
	mockBuildTasks,
	mockCancelExpiredOrder,
	mockCaptureWebhookError,
	mockSendAdminOrderProcessingFailedAlert,
} = vi.hoisted(() => ({
	mockPrisma: {
		user: { findUnique: vi.fn() },
		orderNote: { create: vi.fn() },
	},
	mockRetrieve: vi.fn(),
	mockCreateOrder: vi.fn(),
	mockBuildTasks: vi.fn(),
	mockCancelExpiredOrder: vi.fn(),
	mockCaptureWebhookError: vi.fn(),
	mockSendAdminOrderProcessingFailedAlert: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/webhooks/services/checkout.service", () => ({
	retrieveCheckoutSessionForOrder: mockRetrieve,
	createOrderFromCheckoutSession: mockCreateOrder,
	buildPostCheckoutTasks: mockBuildTasks,
	cancelExpiredOrder: mockCancelExpiredOrder,
}));
vi.mock("@/modules/webhooks/utils/capture-webhook-error", () => ({
	captureWebhookError: mockCaptureWebhookError,
}));
vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminOrderProcessingFailedAlert: mockSendAdminOrderProcessingFailedAlert,
}));

import { handleCheckoutSessionCompleted, handleCheckoutSessionExpired } from "../checkout-handlers";

function makeSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
	return {
		id: "cs_test_1",
		payment_status: "paid",
		payment_intent: "pi_test_1",
		customer_details: { email: "buyer@example.test", name: "Jane Doe" },
		customer_email: null,
		metadata: {},
		...overrides,
	} as unknown as Stripe.Checkout.Session;
}

beforeEach(() => {
	vi.clearAllMocks();
	mockBuildTasks.mockReturnValue([]);
	mockSendAdminOrderProcessingFailedAlert.mockResolvedValue(undefined);
});

describe("handleCheckoutSessionCompleted", () => {
	it("returns null and skips processing when payment_status is 'unpaid' (async payment)", async () => {
		const session = makeSession({ payment_status: "unpaid" });

		const result = await handleCheckoutSessionCompleted(session);

		expect(result).toBeNull();
		expect(mockRetrieve).not.toHaveBeenCalled();
		expect(mockCreateOrder).not.toHaveBeenCalled();
	});

	it("creates order and returns success with post-checkout tasks for paid session", async () => {
		const session = makeSession();
		const fullSession = { ...session, line_items: { data: [] } };
		const order = { id: "order_1", userId: null };
		mockRetrieve.mockResolvedValue(fullSession);
		mockCreateOrder.mockResolvedValue(order);
		mockBuildTasks.mockReturnValue([{ type: "INVALIDATE_CACHE", tags: ["orders-list"] }]);

		const result = await handleCheckoutSessionCompleted(session);

		expect(mockRetrieve).toHaveBeenCalledWith("cs_test_1");
		expect(mockCreateOrder).toHaveBeenCalledWith(fullSession);
		expect(mockBuildTasks).toHaveBeenCalledWith(order, fullSession);
		expect(result).toEqual({
			success: true,
			tasks: [{ type: "INVALIDATE_CACHE", tags: ["orders-list"] }],
		});
	});

	it("creates anti-fraud OrderNote when Stripe email differs from user account email", async () => {
		const session = makeSession({
			customer_details: { email: "stripe@example.test" } as NonNullable<
				Stripe.Checkout.Session["customer_details"]
			>,
		});
		const fullSession = { ...session };
		mockRetrieve.mockResolvedValue(fullSession);
		mockCreateOrder.mockResolvedValue({ id: "order_1", userId: "user_1" });
		mockPrisma.user.findUnique.mockResolvedValue({ email: "account@example.test" });

		const result = await handleCheckoutSessionCompleted(session);

		expect(mockPrisma.orderNote.create).toHaveBeenCalledOnce();
		const noteCall = mockPrisma.orderNote.create.mock.calls[0]?.[0];
		expect(noteCall.data.orderId).toBe("order_1");
		expect(noteCall.data.content).toContain("ALERTE EMAIL");
		expect(noteCall.data.content).toContain("stripe@example.test");
		expect(noteCall.data.content).toContain("account@example.test");
		expect(result?.tasks?.some((t) => t.type === "INVALIDATE_CACHE")).toBe(true);
	});

	it("does not create OrderNote when emails match (case-insensitive)", async () => {
		const session = makeSession({
			customer_details: { email: "Buyer@Example.Test" } as NonNullable<
				Stripe.Checkout.Session["customer_details"]
			>,
		});
		mockRetrieve.mockResolvedValue(session);
		mockCreateOrder.mockResolvedValue({ id: "order_1", userId: "user_1" });
		mockPrisma.user.findUnique.mockResolvedValue({ email: "buyer@example.test" });

		await handleCheckoutSessionCompleted(session);

		expect(mockPrisma.orderNote.create).not.toHaveBeenCalled();
	});

	it("does not lookup user when order is guest (userId=null)", async () => {
		const session = makeSession();
		mockRetrieve.mockResolvedValue(session);
		mockCreateOrder.mockResolvedValue({ id: "order_1", userId: null });

		await handleCheckoutSessionCompleted(session);

		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("captures error, fires admin alert non-blocking, and re-throws on createOrder failure", async () => {
		const session = makeSession();
		const err = new Error("DB transaction failed");
		mockRetrieve.mockResolvedValue(session);
		mockCreateOrder.mockRejectedValue(err);

		await expect(handleCheckoutSessionCompleted(session)).rejects.toThrow("DB transaction failed");

		expect(mockCaptureWebhookError).toHaveBeenCalledWith(err, {
			handler: "handleCheckoutSessionCompleted",
			eventType: "checkout.session.completed",
			checkoutSessionId: "cs_test_1",
			paymentIntentId: "pi_test_1",
		});
		expect(mockSendAdminOrderProcessingFailedAlert).toHaveBeenCalledOnce();
		const alertArg = mockSendAdminOrderProcessingFailedAlert.mock.calls[0]?.[0];
		expect(alertArg.errorMessage).toBe("DB transaction failed");
	});

	it("does NOT await the admin alert email — failure to send must not block response", async () => {
		const session = makeSession();
		const err = new Error("boom");
		mockRetrieve.mockResolvedValue(session);
		mockCreateOrder.mockRejectedValue(err);
		// Simulate slow/failing email service
		let alertResolved = false;
		mockSendAdminOrderProcessingFailedAlert.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					setTimeout(() => {
						alertResolved = true;
						resolve();
					}, 100);
				}),
		);

		await expect(handleCheckoutSessionCompleted(session)).rejects.toThrow("boom");

		// Handler must throw BEFORE the alert email resolves (fire-and-forget pattern).
		expect(alertResolved).toBe(false);
	});

	it("swallows admin alert email rejection without re-throwing", async () => {
		const session = makeSession();
		mockRetrieve.mockResolvedValue(session);
		mockCreateOrder.mockRejectedValue(new Error("primary error"));
		mockSendAdminOrderProcessingFailedAlert.mockRejectedValue(new Error("Resend down"));

		// The handler throws "primary error", NOT "Resend down".
		await expect(handleCheckoutSessionCompleted(session)).rejects.toThrow("primary error");

		// Give the unhandled rejection time to settle and be caught by .catch()
		await new Promise((r) => setTimeout(r, 10));
	});
});

describe("handleCheckoutSessionExpired", () => {
	it("calls cancelExpiredOrder and returns success with cache invalidation tasks", async () => {
		const session = { id: "cs_expired_1" } as Stripe.Checkout.Session;
		mockCancelExpiredOrder.mockResolvedValue({ cancelled: false });

		const result = await handleCheckoutSessionExpired(session);

		expect(mockCancelExpiredOrder).toHaveBeenCalledWith("cs_expired_1");
		expect(result.success).toBe(true);
		const cacheTask = result.tasks?.[0];
		expect(cacheTask?.type).toBe("INVALIDATE_CACHE");
		if (cacheTask?.type !== "INVALIDATE_CACHE") throw new Error("type guard");
		expect(cacheTask.tags).toContain("orders-list");
	});

	it("captures error and re-throws on cancellation failure", async () => {
		const session = { id: "cs_expired_err" } as Stripe.Checkout.Session;
		const err = new Error("cancel failed");
		mockCancelExpiredOrder.mockRejectedValue(err);

		await expect(handleCheckoutSessionExpired(session)).rejects.toThrow("cancel failed");
		expect(mockCaptureWebhookError).toHaveBeenCalledWith(err, {
			handler: "handleCheckoutSessionExpired",
			eventType: "checkout.session.expired",
			checkoutSessionId: "cs_expired_err",
		});
	});
});
