import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

// ============================================================================
// Hoisted mocks - must be declared before any imports
// ============================================================================

const {
	mockHandleCheckoutSessionCompleted,
	mockHandleCheckoutSessionExpired,
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

function makeEvent(type: string, dataObject: Record<string, unknown> = {}): Stripe.Event {
	return {
		id: `evt_test_${type.replace(/\./g, "_")}`,
		type,
		data: { object: dataObject },
	} as unknown as Stripe.Event;
}

const mockResult = { success: true, tasks: [] };

describe("dispatchEvent - checkout handlers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("routes checkout.session.completed", async () => {
		const session = { id: "cs_test_1", payment_status: "paid" };
		const event = makeEvent("checkout.session.completed", session);
		mockHandleCheckoutSessionCompleted.mockResolvedValue(mockResult);

		const result = await dispatchEvent(event);

		expect(mockHandleCheckoutSessionCompleted).toHaveBeenCalledOnce();
		expect(mockHandleCheckoutSessionCompleted).toHaveBeenCalledWith(session);
		expect(result).toEqual(mockResult);
	});

	it("routes checkout.session.expired", async () => {
		const session = { id: "cs_test_expired" };
		const event = makeEvent("checkout.session.expired", session);
		mockHandleCheckoutSessionExpired.mockResolvedValue(mockResult);

		const result = await dispatchEvent(event);

		expect(mockHandleCheckoutSessionExpired).toHaveBeenCalledOnce();
		expect(mockHandleCheckoutSessionExpired).toHaveBeenCalledWith(session);
		expect(result).toEqual(mockResult);
	});

	it("routes checkout.session.async_payment_succeeded", async () => {
		const session = { id: "cs_test_async_success", payment_status: "paid" };
		const event = makeEvent("checkout.session.async_payment_succeeded", session);
		mockHandleAsyncPaymentSucceeded.mockResolvedValue(mockResult);

		const result = await dispatchEvent(event);

		expect(mockHandleAsyncPaymentSucceeded).toHaveBeenCalledOnce();
		expect(mockHandleAsyncPaymentSucceeded).toHaveBeenCalledWith(session);
		expect(result).toEqual(mockResult);
	});

	it("routes checkout.session.async_payment_failed", async () => {
		const session = { id: "cs_test_async_fail", payment_status: "unpaid" };
		const event = makeEvent("checkout.session.async_payment_failed", session);
		mockHandleAsyncPaymentFailed.mockResolvedValue(mockResult);

		const result = await dispatchEvent(event);

		expect(mockHandleAsyncPaymentFailed).toHaveBeenCalledOnce();
		expect(mockHandleAsyncPaymentFailed).toHaveBeenCalledWith(session);
		expect(result).toEqual(mockResult);
	});
});

describe("dispatchEvent - refund/charge handlers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("routes charge.refunded", async () => {
		const charge = { id: "ch_test_1", amount_refunded: 5000 };
		const event = makeEvent("charge.refunded", charge);
		mockHandleChargeRefunded.mockResolvedValue(mockResult);

		const result = await dispatchEvent(event);

		expect(mockHandleChargeRefunded).toHaveBeenCalledWith(charge);
		expect(result).toEqual(mockResult);
	});

	it("routes refund.created and refund.updated through handleRefundUpdated", async () => {
		const refund = { id: "re_test", status: "succeeded" };
		mockHandleRefundUpdated.mockResolvedValue(mockResult);

		await dispatchEvent(makeEvent("refund.created", refund));
		await dispatchEvent(makeEvent("refund.updated", refund));

		expect(mockHandleRefundUpdated).toHaveBeenCalledTimes(2);
	});

	it("routes refund.failed", async () => {
		const refund = { id: "re_test_failed", status: "failed" };
		const event = makeEvent("refund.failed", refund);
		mockHandleRefundFailed.mockResolvedValue(mockResult);

		const result = await dispatchEvent(event);

		expect(mockHandleRefundFailed).toHaveBeenCalledWith(refund);
		expect(result).toEqual(mockResult);
	});
});

describe("dispatchEvent - dispute handlers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("routes charge.dispute.created and charge.dispute.closed", async () => {
		const dispute = { id: "dp_test", reason: "fraudulent" };
		mockHandleDisputeCreated.mockResolvedValue(mockResult);
		mockHandleDisputeClosed.mockResolvedValue(mockResult);

		await dispatchEvent(makeEvent("charge.dispute.created", dispute));
		await dispatchEvent(makeEvent("charge.dispute.closed", dispute));

		expect(mockHandleDisputeCreated).toHaveBeenCalledOnce();
		expect(mockHandleDisputeClosed).toHaveBeenCalledOnce();
	});
});

describe("isEventSupported", () => {
	it("returns true for all supported event types post Checkout-Sessions migration", () => {
		const supportedEvents = [
			"checkout.session.completed",
			"checkout.session.expired",
			"checkout.session.async_payment_succeeded",
			"checkout.session.async_payment_failed",
			"charge.refunded",
			"refund.created",
			"refund.updated",
			"refund.failed",
			"charge.dispute.created",
			"charge.dispute.closed",
		];

		for (const eventType of supportedEvents) {
			expect(isEventSupported(eventType), `Expected ${eventType} to be supported`).toBe(true);
		}
	});

	it("returns false for the removed payment_intent.* events", () => {
		expect(isEventSupported("payment_intent.succeeded")).toBe(false);
		expect(isEventSupported("payment_intent.payment_failed")).toBe(false);
		expect(isEventSupported("payment_intent.canceled")).toBe(false);
		expect(isEventSupported("invoice.payment_failed")).toBe(false);
	});

	it("returns false for unknown event types", () => {
		expect(isEventSupported("customer.created")).toBe(false);
		expect(isEventSupported("")).toBe(false);
	});
});
