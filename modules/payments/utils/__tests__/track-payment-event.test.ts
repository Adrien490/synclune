import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockPostHog } = vi.hoisted(() => ({
	mockPostHog: {
		capture: vi.fn(),
	},
}));

vi.mock("@/shared/lib/posthog", () => ({
	getPostHog: vi.fn(() => mockPostHog),
}));

import { trackPaymentError } from "../track-payment-event";

describe("trackPaymentError", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("captures payment_error event with full properties", () => {
		trackPaymentError({
			type: "card_error",
			code: "card_declined",
			message: "Your card was declined",
			phase: "confirm-payment",
		});

		expect(mockPostHog.capture).toHaveBeenCalledTimes(1);
		expect(mockPostHog.capture).toHaveBeenCalledWith("payment_error", {
			type: "card_error",
			code: "card_declined",
			message: "Your card was declined",
			phase: "confirm-payment",
		});
	});

	it("captures minimal payload (type + phase only)", () => {
		trackPaymentError({ type: "unknown", phase: "exception" });

		expect(mockPostHog.capture).toHaveBeenCalledWith("payment_error", {
			type: "unknown",
			phase: "exception",
		});
	});

	it("does nothing if PostHog is not initialized", async () => {
		const { getPostHog } = await import("@/shared/lib/posthog");
		vi.mocked(getPostHog).mockReturnValueOnce(null);

		expect(() => trackPaymentError({ type: "card_error", phase: "elements-submit" })).not.toThrow();
	});
});
