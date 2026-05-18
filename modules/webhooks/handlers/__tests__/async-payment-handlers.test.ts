import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

const {
	mockPrisma,
	mockTx,
	mockHandleCheckoutSessionCompleted,
	mockCaptureWebhookError,
	mockGetBaseUrl,
	mockROUTES,
} = vi.hoisted(() => {
	const tx = {
		order: { findUnique: vi.fn(), update: vi.fn() },
		discountUsage: { findMany: vi.fn(), deleteMany: vi.fn() },
		discount: { update: vi.fn() },
	};
	return {
		mockTx: tx,
		mockPrisma: {
			$transaction: vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
		},
		mockHandleCheckoutSessionCompleted: vi.fn(),
		mockCaptureWebhookError: vi.fn(),
		mockGetBaseUrl: vi.fn(() => "https://example.test"),
		mockROUTES: { SHOP: { CHECKOUT: "/paiement" } },
	};
});

vi.mock("@/app/generated/prisma/client", () => ({
	PaymentStatus: {
		PAID: "PAID",
		FAILED: "FAILED",
		REFUNDED: "REFUNDED",
		PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
		EXPIRED: "EXPIRED",
		PENDING: "PENDING",
	},
}));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	TX_TIMEOUT_LONG: 10_000,
	TX_MAX_WAIT_LONG: 5_000,
}));
vi.mock("@/modules/webhooks/handlers/checkout-handlers", () => ({
	handleCheckoutSessionCompleted: mockHandleCheckoutSessionCompleted,
}));
vi.mock("@/modules/webhooks/utils/capture-webhook-error", () => ({
	captureWebhookError: mockCaptureWebhookError,
}));
vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: mockGetBaseUrl,
	ROUTES: mockROUTES,
}));

import { handleAsyncPaymentSucceeded, handleAsyncPaymentFailed } from "../async-payment-handlers";

function makeSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
	return {
		id: "cs_async_1",
		payment_status: "unpaid",
		...overrides,
	} as unknown as Stripe.Checkout.Session;
}

beforeEach(() => {
	vi.clearAllMocks();
	mockTx.discountUsage.findMany.mockResolvedValue([]);
	mockTx.discountUsage.deleteMany.mockResolvedValue({ count: 0 });
});

describe("handleAsyncPaymentSucceeded", () => {
	it("forwards to handleCheckoutSessionCompleted with payment_status forced to 'paid'", async () => {
		const session = makeSession();
		mockHandleCheckoutSessionCompleted.mockResolvedValue({ success: true, tasks: [] });

		await handleAsyncPaymentSucceeded(session);

		expect(mockHandleCheckoutSessionCompleted).toHaveBeenCalledOnce();
		const forwarded = mockHandleCheckoutSessionCompleted.mock
			.calls[0]?.[0] as Stripe.Checkout.Session;
		expect(forwarded.payment_status).toBe("paid");
		expect(forwarded.id).toBe("cs_async_1");
	});

	it("captures and re-throws if checkout handler fails", async () => {
		const session = makeSession();
		const err = new Error("downstream failure");
		mockHandleCheckoutSessionCompleted.mockRejectedValue(err);

		await expect(handleAsyncPaymentSucceeded(session)).rejects.toThrow("downstream failure");
		expect(mockCaptureWebhookError).toHaveBeenCalledWith(err, {
			handler: "handleAsyncPaymentSucceeded",
			eventType: "checkout.session.async_payment_succeeded",
			checkoutSessionId: "cs_async_1",
		});
	});
});

describe("handleAsyncPaymentFailed", () => {
	it("skips with no_order_yet when no order exists for the session", async () => {
		const session = makeSession();
		mockTx.order.findUnique.mockResolvedValue(null);

		const result = await handleAsyncPaymentFailed(session);

		expect(result).toEqual({ success: true, skipped: true, reason: "no_order_yet" });
		expect(mockTx.order.update).not.toHaveBeenCalled();
	});

	it.each([
		["PAID", "already_PAID"],
		["REFUNDED", "already_REFUNDED"],
		["PARTIALLY_REFUNDED", "already_PARTIALLY_REFUNDED"],
		["EXPIRED", "already_EXPIRED"],
	])("skips when order paymentStatus is already %s", async (status, expectedReason) => {
		mockTx.order.findUnique.mockResolvedValue({
			id: "order_1",
			orderNumber: "ORD-001",
			paymentStatus: status,
			customerEmail: "x@x.test",
			customerName: "X",
		});

		const result = await handleAsyncPaymentFailed(makeSession());

		expect(result.success).toBe(true);
		expect(result.skipped).toBe(true);
		expect(result.reason).toBe(expectedReason);
		expect(mockTx.order.update).not.toHaveBeenCalled();
	});

	it("marks PENDING order as FAILED + CANCELLED and releases discount usages", async () => {
		mockTx.order.findUnique.mockResolvedValue({
			id: "order_1",
			orderNumber: "ORD-001",
			paymentStatus: "PENDING",
			customerEmail: "buyer@example.test",
			customerName: "Jane",
		});
		mockTx.discountUsage.findMany.mockResolvedValue([{ id: "usage_1", discountId: "discount_1" }]);
		mockTx.order.update.mockResolvedValue({
			id: "order_1",
			orderNumber: "ORD-001",
			customerEmail: "buyer@example.test",
			customerName: "Jane",
		});

		const result = await handleAsyncPaymentFailed(makeSession());

		expect(result.success).toBe(true);
		expect(result.skipped).toBeUndefined();
		expect(mockTx.discount.update).toHaveBeenCalledWith({
			where: { id: "discount_1" },
			data: { usageCount: { decrement: 1 } },
		});
		expect(mockTx.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "order_1" },
				data: { paymentStatus: "FAILED", status: "CANCELLED" },
			}),
		);

		const cacheTask = result.tasks?.find((t) => t.type === "INVALIDATE_CACHE");
		expect(cacheTask?.tags).toContain("orders-list");
		expect(cacheTask?.tags).toContain("discount-usage-discount_1");

		const emailTask = result.tasks?.find((t) => t.type === "PAYMENT_FAILED_EMAIL");
		expect(emailTask).toBeDefined();
		if (emailTask?.type !== "PAYMENT_FAILED_EMAIL") throw new Error("type guard");
		expect(emailTask.data.to).toBe("buyer@example.test");
		expect(emailTask.data.retryUrl).toBe("https://example.test/paiement");
	});

	it("does not emit PAYMENT_FAILED_EMAIL when customerEmail is empty", async () => {
		mockTx.order.findUnique.mockResolvedValue({
			id: "order_1",
			orderNumber: "ORD-001",
			paymentStatus: "PENDING",
			customerEmail: "",
			customerName: "X",
		});
		mockTx.order.update.mockResolvedValue({
			id: "order_1",
			orderNumber: "ORD-001",
			customerEmail: "",
			customerName: "X",
		});

		const result = await handleAsyncPaymentFailed(makeSession());

		expect(result.tasks?.find((t) => t.type === "PAYMENT_FAILED_EMAIL")).toBeUndefined();
	});

	it("captures and re-throws on transaction failure", async () => {
		const err = new Error("tx boom");
		mockPrisma.$transaction.mockRejectedValueOnce(err);

		await expect(handleAsyncPaymentFailed(makeSession())).rejects.toThrow("tx boom");
		expect(mockCaptureWebhookError).toHaveBeenCalledWith(err, {
			handler: "handleAsyncPaymentFailed",
			eventType: "checkout.session.async_payment_failed",
			checkoutSessionId: "cs_async_1",
		});
	});
});
