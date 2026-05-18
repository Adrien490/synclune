import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockWithScope, mockCaptureException, mockScope } = vi.hoisted(() => {
	const scope = {
		setTag: vi.fn(),
		setLevel: vi.fn(),
		setFingerprint: vi.fn(),
		setContext: vi.fn(),
	};
	return {
		mockScope: scope,
		mockWithScope: vi.fn((cb: (s: typeof scope) => void) => cb(scope)),
		mockCaptureException: vi.fn(),
	};
});

vi.mock("@sentry/nextjs", () => ({
	withScope: mockWithScope,
	captureException: mockCaptureException,
}));

import { captureWebhookError } from "../capture-webhook-error";

beforeEach(() => {
	vi.clearAllMocks();
});

describe("captureWebhookError", () => {
	it("tags Sentry scope with webhookHandler and eventType", () => {
		captureWebhookError(new Error("boom"), {
			handler: "handleCheckoutSessionCompleted",
			eventType: "checkout.session.completed",
		});

		expect(mockScope.setTag).toHaveBeenCalledWith(
			"webhookHandler",
			"handleCheckoutSessionCompleted",
		);
		expect(mockScope.setTag).toHaveBeenCalledWith("eventType", "checkout.session.completed");
		expect(mockScope.setLevel).toHaveBeenCalledWith("error");
		expect(mockScope.setFingerprint).toHaveBeenCalledWith([
			"webhook",
			"handleCheckoutSessionCompleted",
		]);
	});

	it("attaches business context excluding handler/eventType", () => {
		captureWebhookError(new Error("boom"), {
			handler: "handleChargeRefunded",
			eventType: "charge.refunded",
			orderId: "order_123",
			stripeRefundId: "re_abc",
			paymentIntentId: "pi_xyz",
		});

		expect(mockScope.setContext).toHaveBeenCalledWith("business", {
			orderId: "order_123",
			stripeRefundId: "re_abc",
			paymentIntentId: "pi_xyz",
		});
	});

	it("skips business context when only handler+eventType provided", () => {
		captureWebhookError(new Error("boom"), {
			handler: "handleDisputeCreated",
			eventType: "charge.dispute.created",
		});

		expect(mockScope.setContext).not.toHaveBeenCalled();
	});

	it("filters out undefined business values", () => {
		captureWebhookError(new Error("boom"), {
			handler: "h",
			eventType: "t",
			orderId: "order_1",
			refundId: undefined,
			orderNumber: "ORD-001",
		});

		expect(mockScope.setContext).toHaveBeenCalledWith("business", {
			orderId: "order_1",
			orderNumber: "ORD-001",
		});
	});

	it("captures Error instance directly", () => {
		const err = new Error("specific");
		captureWebhookError(err, { handler: "h", eventType: "t" });
		expect(mockCaptureException).toHaveBeenCalledWith(err);
	});

	it("wraps non-Error values in Error", () => {
		captureWebhookError("string-error", { handler: "h", eventType: "t" });
		const arg = mockCaptureException.mock.calls[0]?.[0];
		expect(arg).toBeInstanceOf(Error);
		expect((arg as Error).message).toBe("string-error");
	});
});
