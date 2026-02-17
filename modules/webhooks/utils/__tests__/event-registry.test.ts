import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

// ============================================================================
// Hoisted mocks - must be declared before any imports
// ============================================================================

const {
	mockHandleCheckoutSessionCompleted,
	mockHandleCheckoutSessionExpired,
	mockHandlePaymentSuccess,
	mockHandlePaymentFailure,
	mockHandlePaymentCanceled,
	mockHandleChargeRefunded,
	mockHandleRefundUpdated,
	mockHandleRefundFailed,
	mockHandleAsyncPaymentSucceeded,
	mockHandleAsyncPaymentFailed,
	mockHandleDisputeCreated,
	mockHandleDisputeClosed,
} = vi.hoisted(() => ({
	mockHandleCheckoutSessionCompleted: vi.fn(),
	mockHandleCheckoutSessionExpired: vi.fn(),
	mockHandlePaymentSuccess: vi.fn(),
	mockHandlePaymentFailure: vi.fn(),
	mockHandlePaymentCanceled: vi.fn(),
	mockHandleChargeRefunded: vi.fn(),
	mockHandleRefundUpdated: vi.fn(),
	mockHandleRefundFailed: vi.fn(),
	mockHandleAsyncPaymentSucceeded: vi.fn(),
	mockHandleAsyncPaymentFailed: vi.fn(),
	mockHandleDisputeCreated: vi.fn(),
	mockHandleDisputeClosed: vi.fn(),
}));

vi.mock("@/modules/webhooks/handlers/checkout-handlers", () => ({
	handleCheckoutSessionCompleted: mockHandleCheckoutSessionCompleted,
	handleCheckoutSessionExpired: mockHandleCheckoutSessionExpired,
}));

vi.mock("@/modules/webhooks/handlers/payment-handlers", () => ({
	handlePaymentSuccess: mockHandlePaymentSuccess,
	handlePaymentFailure: mockHandlePaymentFailure,
	handlePaymentCanceled: mockHandlePaymentCanceled,
}));

vi.mock("@/modules/webhooks/handlers/refund-handlers", () => ({
	handleChargeRefunded: mockHandleChargeRefunded,
	handleRefundUpdated: mockHandleRefundUpdated,
	handleRefundFailed: mockHandleRefundFailed,
}));

vi.mock("@/modules/webhooks/handlers/async-payment-handlers", () => ({
	handleAsyncPaymentSucceeded: mockHandleAsyncPaymentSucceeded,
	handleAsyncPaymentFailed: mockHandleAsyncPaymentFailed,
}));

vi.mock("@/modules/webhooks/handlers/dispute-handlers", () => ({
	handleDisputeCreated: mockHandleDisputeCreated,
	handleDisputeClosed: mockHandleDisputeClosed,
}));

import { dispatchEvent, isEventSupported } from "../event-registry";

// ============================================================================
// Helpers
// ============================================================================

function makeEvent(type: string, dataObject: Record<string, unknown> = {}): Stripe.Event {
	return {
		id: `evt_test_${type.replace(/\./g, "_")}`,
		type,
		data: { object: dataObject },
	} as unknown as Stripe.Event;
}

const mockResult = { success: true, tasks: [] };

// ============================================================================
// dispatchEvent - checkout handlers
// ============================================================================

describe("dispatchEvent - checkout handlers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should route checkout.session.completed to handleCheckoutSessionCompleted with session object", async () => {
		const session = { id: "cs_test_1", payment_status: "paid" };
		const event = makeEvent("checkout.session.completed", session);
		mockHandleCheckoutSessionCompleted.mockResolvedValue(mockResult);

		const result = await dispatchEvent(event);

		expect(mockHandleCheckoutSessionCompleted).toHaveBeenCalledOnce();
		expect(mockHandleCheckoutSessionCompleted).toHaveBeenCalledWith(session);
		expect(result).toEqual(mockResult);
	});

	it("should route checkout.session.expired to handleCheckoutSessionExpired with session object", async () => {
		const session = { id: "cs_test_expired", metadata: { orderId: "order-1" } };
		const event = makeEvent("checkout.session.expired", session);
		mockHandleCheckoutSessionExpired.mockResolvedValue(mockResult);

		const result = await dispatchEvent(event);

		expect(mockHandleCheckoutSessionExpired).toHaveBeenCalledOnce();
		expect(mockHandleCheckoutSessionExpired).toHaveBeenCalledWith(session);
		expect(result).toEqual(mockResult);
	});

	it("should route checkout.session.async_payment_succeeded to handleAsyncPaymentSucceeded with session object", async () => {
		const session = { id: "cs_test_async_success", payment_status: "paid" };
		const event = makeEvent("checkout.session.async_payment_succeeded", session);
		mockHandleAsyncPaymentSucceeded.mockResolvedValue(mockResult);

		const result = await dispatchEvent(event);

		expect(mockHandleAsyncPaymentSucceeded).toHaveBeenCalledOnce();
		expect(mockHandleAsyncPaymentSucceeded).toHaveBeenCalledWith(session);
		expect(result).toEqual(mockResult);
	});

	it("should route checkout.session.async_payment_failed to handleAsyncPaymentFailed with session object", async () => {
		const session = { id: "cs_test_async_fail", payment_status: "unpaid" };
		const event = makeEvent("checkout.session.async_payment_failed", session);
		mockHandleAsyncPaymentFailed.mockResolvedValue(mockResult);

		const result = await dispatchEvent(event);

		expect(mockHandleAsyncPaymentFailed).toHaveBeenCalledOnce();
		expect(mockHandleAsyncPaymentFailed).toHaveBeenCalledWith(session);
		expect(result).toEqual(mockResult);
	});
});

// ============================================================================
// dispatchEvent - payment_intent handlers
// ============================================================================

describe("dispatchEvent - payment_intent handlers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should route payment_intent.succeeded to handlePaymentSuccess with payment intent object", async () => {
		const paymentIntent = { id: "pi_test_1", metadata: { order_id: "order-1" } };
		const event = makeEvent("payment_intent.succeeded", paymentIntent);
		mockHandlePaymentSuccess.mockResolvedValue(undefined);

		const result = await dispatchEvent(event);

		expect(mockHandlePaymentSuccess).toHaveBeenCalledOnce();
		expect(mockHandlePaymentSuccess).toHaveBeenCalledWith(paymentIntent);
		expect(result).toBeNull();
	});

	it("should route payment_intent.payment_failed to handlePaymentFailure with payment intent object", async () => {
		const paymentIntent = { id: "pi_test_failed", metadata: { order_id: "order-2" } };
		const event = makeEvent("payment_intent.payment_failed", paymentIntent);
		mockHandlePaymentFailure.mockResolvedValue(mockResult);

		const result = await dispatchEvent(event);

		expect(mockHandlePaymentFailure).toHaveBeenCalledOnce();
		expect(mockHandlePaymentFailure).toHaveBeenCalledWith(paymentIntent);
		expect(result).toEqual(mockResult);
	});

	it("should route payment_intent.canceled to handlePaymentCanceled with payment intent object", async () => {
		const paymentIntent = { id: "pi_test_canceled", metadata: { order_id: "order-3" } };
		const event = makeEvent("payment_intent.canceled", paymentIntent);
		mockHandlePaymentCanceled.mockResolvedValue(mockResult);

		const result = await dispatchEvent(event);

		expect(mockHandlePaymentCanceled).toHaveBeenCalledOnce();
		expect(mockHandlePaymentCanceled).toHaveBeenCalledWith(paymentIntent);
		expect(result).toEqual(mockResult);
	});
});

// ============================================================================
// dispatchEvent - refund handlers
// ============================================================================

describe("dispatchEvent - refund/charge handlers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should route charge.refunded to handleChargeRefunded with charge object", async () => {
		const charge = { id: "ch_test_1", amount_refunded: 5000 };
		const event = makeEvent("charge.refunded", charge);
		mockHandleChargeRefunded.mockResolvedValue(mockResult);

		const result = await dispatchEvent(event);

		expect(mockHandleChargeRefunded).toHaveBeenCalledOnce();
		expect(mockHandleChargeRefunded).toHaveBeenCalledWith(charge);
		expect(result).toEqual(mockResult);
	});

	it("should route refund.created to handleRefundUpdated with refund object", async () => {
		const refund = { id: "re_test_created", status: "succeeded" };
		const event = makeEvent("refund.created", refund);
		mockHandleRefundUpdated.mockResolvedValue(mockResult);

		const result = await dispatchEvent(event);

		expect(mockHandleRefundUpdated).toHaveBeenCalledOnce();
		expect(mockHandleRefundUpdated).toHaveBeenCalledWith(refund);
		expect(result).toEqual(mockResult);
	});

	it("should route refund.updated to handleRefundUpdated with refund object", async () => {
		const refund = { id: "re_test_updated", status: "pending" };
		const event = makeEvent("refund.updated", refund);
		mockHandleRefundUpdated.mockResolvedValue(mockResult);

		const result = await dispatchEvent(event);

		expect(mockHandleRefundUpdated).toHaveBeenCalledOnce();
		expect(mockHandleRefundUpdated).toHaveBeenCalledWith(refund);
		expect(result).toEqual(mockResult);
	});

	it("should route refund.failed to handleRefundFailed with refund object", async () => {
		const refund = { id: "re_test_failed", status: "failed" };
		const event = makeEvent("refund.failed", refund);
		mockHandleRefundFailed.mockResolvedValue(mockResult);

		const result = await dispatchEvent(event);

		expect(mockHandleRefundFailed).toHaveBeenCalledOnce();
		expect(mockHandleRefundFailed).toHaveBeenCalledWith(refund);
		expect(result).toEqual(mockResult);
	});
});

// ============================================================================
// dispatchEvent - dispute handlers
// ============================================================================

describe("dispatchEvent - dispute handlers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should route charge.dispute.created to handleDisputeCreated with dispute object", async () => {
		const dispute = { id: "dp_test_1", reason: "fraudulent" };
		const event = makeEvent("charge.dispute.created", dispute);
		mockHandleDisputeCreated.mockResolvedValue(mockResult);

		const result = await dispatchEvent(event);

		expect(mockHandleDisputeCreated).toHaveBeenCalledOnce();
		expect(mockHandleDisputeCreated).toHaveBeenCalledWith(dispute);
		expect(result).toEqual(mockResult);
	});

	it("should route charge.dispute.closed to handleDisputeClosed with dispute object", async () => {
		const dispute = { id: "dp_test_2", status: "won" };
		const event = makeEvent("charge.dispute.closed", dispute);
		mockHandleDisputeClosed.mockResolvedValue(mockResult);

		const result = await dispatchEvent(event);

		expect(mockHandleDisputeClosed).toHaveBeenCalledOnce();
		expect(mockHandleDisputeClosed).toHaveBeenCalledWith(dispute);
		expect(result).toEqual(mockResult);
	});
});

// ============================================================================
// dispatchEvent - unsupported events
// ============================================================================

describe("dispatchEvent - unsupported events", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return a skipped result for unknown event types", async () => {
		const event = makeEvent("customer.created");

		const result = await dispatchEvent(event);

		expect(result).toEqual({
			success: true,
			skipped: true,
			reason: "Unsupported event: customer.created",
		});
	});

	it("should not call any handler for unsupported events", async () => {
		const event = makeEvent("invoice.paid");

		await dispatchEvent(event);

		expect(mockHandleCheckoutSessionCompleted).not.toHaveBeenCalled();
		expect(mockHandleCheckoutSessionExpired).not.toHaveBeenCalled();
		expect(mockHandlePaymentSuccess).not.toHaveBeenCalled();
		expect(mockHandlePaymentFailure).not.toHaveBeenCalled();
		expect(mockHandlePaymentCanceled).not.toHaveBeenCalled();
		expect(mockHandleChargeRefunded).not.toHaveBeenCalled();
		expect(mockHandleRefundUpdated).not.toHaveBeenCalled();
		expect(mockHandleRefundFailed).not.toHaveBeenCalled();
		expect(mockHandleAsyncPaymentSucceeded).not.toHaveBeenCalled();
		expect(mockHandleAsyncPaymentFailed).not.toHaveBeenCalled();
		expect(mockHandleDisputeCreated).not.toHaveBeenCalled();
		expect(mockHandleDisputeClosed).not.toHaveBeenCalled();
	});

	it("should include the event type in the skipped reason message", async () => {
		const event = makeEvent("product.created");

		const result = await dispatchEvent(event);

		expect(result?.skipped).toBe(true);
		expect(result?.reason).toContain("product.created");
	});
});

// ============================================================================
// dispatchEvent - error propagation
// ============================================================================

describe("dispatchEvent - error propagation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should propagate errors thrown by a handler", async () => {
		const handlerError = new Error("Checkout processing failed");
		const event = makeEvent("checkout.session.completed", { id: "cs_test_err" });
		mockHandleCheckoutSessionCompleted.mockRejectedValue(handlerError);

		await expect(dispatchEvent(event)).rejects.toThrow("Checkout processing failed");
	});

	it("should propagate errors from payment handlers", async () => {
		const handlerError = new Error("No order_id in payment intent metadata");
		const event = makeEvent("payment_intent.payment_failed", { id: "pi_no_order" });
		mockHandlePaymentFailure.mockRejectedValue(handlerError);

		await expect(dispatchEvent(event)).rejects.toThrow("No order_id in payment intent metadata");
	});

	it("should propagate errors from refund handlers", async () => {
		const handlerError = new Error("Refund processing failed");
		const event = makeEvent("refund.failed", { id: "re_err" });
		mockHandleRefundFailed.mockRejectedValue(handlerError);

		await expect(dispatchEvent(event)).rejects.toThrow("Refund processing failed");
	});

	it("should propagate errors from dispute handlers", async () => {
		const handlerError = new Error("Dispute handler error");
		const event = makeEvent("charge.dispute.created", { id: "dp_err" });
		mockHandleDisputeCreated.mockRejectedValue(handlerError);

		await expect(dispatchEvent(event)).rejects.toThrow("Dispute handler error");
	});
});

// ============================================================================
// dispatchEvent - payment_intent.succeeded returns null
// ============================================================================

describe("dispatchEvent - payment_intent.succeeded always returns null", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return null even when handler resolves successfully", async () => {
		const event = makeEvent("payment_intent.succeeded", { id: "pi_success" });
		mockHandlePaymentSuccess.mockResolvedValue(undefined);

		const result = await dispatchEvent(event);

		expect(result).toBeNull();
	});

	it("should return null regardless of what the handler returns", async () => {
		const event = makeEvent("payment_intent.succeeded", { id: "pi_success_2" });
		// Even if the handler somehow returns a result, the registry discards it and returns null
		mockHandlePaymentSuccess.mockResolvedValue({ success: true, tasks: [] });

		const result = await dispatchEvent(event);

		expect(result).toBeNull();
	});
});

// ============================================================================
// isEventSupported
// ============================================================================

describe("isEventSupported", () => {
	it("should return true for all 13 supported event types", () => {
		const supportedEvents = [
			"checkout.session.completed",
			"checkout.session.expired",
			"payment_intent.succeeded",
			"payment_intent.payment_failed",
			"payment_intent.canceled",
			"charge.refunded",
			"refund.created",
			"refund.updated",
			"refund.failed",
			"checkout.session.async_payment_succeeded",
			"checkout.session.async_payment_failed",
			"charge.dispute.created",
			"charge.dispute.closed",
		];

		for (const eventType of supportedEvents) {
			expect(isEventSupported(eventType), `Expected ${eventType} to be supported`).toBe(true);
		}
	});

	it("should return false for unknown event types", () => {
		expect(isEventSupported("customer.created")).toBe(false);
		expect(isEventSupported("invoice.paid")).toBe(false);
		expect(isEventSupported("product.created")).toBe(false);
		expect(isEventSupported("price.updated")).toBe(false);
	});

	it("should return false for empty string", () => {
		expect(isEventSupported("")).toBe(false);
	});

	it("should return false for partial event type names", () => {
		expect(isEventSupported("checkout")).toBe(false);
		expect(isEventSupported("payment_intent")).toBe(false);
		expect(isEventSupported("refund")).toBe(false);
	});

	it("should act as a type guard (TypeScript narrowing)", () => {
		const eventType: string = "checkout.session.completed";

		if (isEventSupported(eventType)) {
			// TypeScript narrows eventType to SupportedStripeEvent here
			// This test verifies the narrowing works at runtime
			expect(eventType).toBe("checkout.session.completed");
		} else {
			throw new Error("Expected isEventSupported to return true");
		}
	});
});
