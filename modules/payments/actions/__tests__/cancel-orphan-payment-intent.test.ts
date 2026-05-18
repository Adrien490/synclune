import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockStripePaymentIntentsCancel, mockWithStripeCircuitBreaker, mockLoggerInfo } = vi.hoisted(
	() => ({
		mockStripePaymentIntentsCancel: vi.fn(),
		mockWithStripeCircuitBreaker: vi.fn((fn: () => Promise<unknown>) => fn()),
		mockLoggerInfo: vi.fn(),
	}),
);

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("server-only", () => ({}));

vi.mock("@/shared/lib/stripe", () => ({
	stripe: {
		paymentIntents: {
			cancel: mockStripePaymentIntentsCancel,
		},
	},
	withStripeCircuitBreaker: mockWithStripeCircuitBreaker,
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: {
		info: mockLoggerInfo,
	},
}));

import { cancelOrphanPaymentIntent } from "../cancel-orphan-payment-intent";

// ============================================================================
// TESTS
// ============================================================================

describe("cancelOrphanPaymentIntent", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		// Default: withStripeCircuitBreaker passes through to the fn
		mockWithStripeCircuitBreaker.mockImplementation((fn: () => Promise<unknown>) => fn());
	});

	// ─── Early return for invalid IDs ─────────────────────────────────────────

	it("returns early without calling Stripe for ID not starting with 'pi_'", async () => {
		await cancelOrphanPaymentIntent("ch_test_abc123");

		expect(mockStripePaymentIntentsCancel).not.toHaveBeenCalled();
		expect(mockWithStripeCircuitBreaker).not.toHaveBeenCalled();
	});

	it("returns early without calling Stripe for empty string", async () => {
		await cancelOrphanPaymentIntent("");

		expect(mockStripePaymentIntentsCancel).not.toHaveBeenCalled();
		expect(mockWithStripeCircuitBreaker).not.toHaveBeenCalled();
	});

	it("returns early without calling Stripe for random string", async () => {
		await cancelOrphanPaymentIntent("some-random-id");

		expect(mockStripePaymentIntentsCancel).not.toHaveBeenCalled();
	});

	// ─── Happy path ───────────────────────────────────────────────────────────

	it("calls stripe.paymentIntents.cancel with correct ID for a valid 'pi_...' ID", async () => {
		mockStripePaymentIntentsCancel.mockResolvedValue({ id: "pi_test_abc123", status: "canceled" });

		await cancelOrphanPaymentIntent("pi_test_abc123");

		expect(mockStripePaymentIntentsCancel).toHaveBeenCalledWith("pi_test_abc123");
		expect(mockStripePaymentIntentsCancel).toHaveBeenCalledTimes(1);
	});

	it("wraps the Stripe call inside withStripeCircuitBreaker", async () => {
		mockStripePaymentIntentsCancel.mockResolvedValue({ id: "pi_test_abc123", status: "canceled" });

		await cancelOrphanPaymentIntent("pi_test_abc123");

		expect(mockWithStripeCircuitBreaker).toHaveBeenCalledTimes(1);
		expect(mockWithStripeCircuitBreaker).toHaveBeenCalledWith(expect.any(Function));
	});

	it("resolves without throwing for a valid ID", async () => {
		mockStripePaymentIntentsCancel.mockResolvedValue({ id: "pi_test_abc123", status: "canceled" });

		await expect(cancelOrphanPaymentIntent("pi_test_abc123")).resolves.toBeUndefined();
	});

	// ─── Error handling ───────────────────────────────────────────────────────

	it("catches Stripe errors and logs them without re-throwing", async () => {
		mockStripePaymentIntentsCancel.mockRejectedValue(
			new Error("StripeInvalidRequestError: PaymentIntent already canceled"),
		);

		// Must not throw — failure is non-critical (fire-and-forget)
		await expect(cancelOrphanPaymentIntent("pi_test_abc123")).resolves.toBeUndefined();
	});

	it("logs via logger.info when Stripe cancel throws", async () => {
		mockStripePaymentIntentsCancel.mockRejectedValue(new Error("already captured"));

		await cancelOrphanPaymentIntent("pi_test_abc123");

		expect(mockLoggerInfo).toHaveBeenCalledTimes(1);
		expect(mockLoggerInfo).toHaveBeenCalledWith(
			"Could not cancel orphan PI (may already be captured/canceled)",
			{
				service: "checkout",
				paymentIntentId: "pi_test_abc123",
			},
		);
	});

	it("does not call logger.info when cancel succeeds", async () => {
		mockStripePaymentIntentsCancel.mockResolvedValue({ id: "pi_test_abc123", status: "canceled" });

		await cancelOrphanPaymentIntent("pi_test_abc123");

		expect(mockLoggerInfo).not.toHaveBeenCalled();
	});

	it("catches CircuitBreakerError from withStripeCircuitBreaker without re-throwing", async () => {
		mockWithStripeCircuitBreaker.mockRejectedValue(
			Object.assign(new Error("Circuit breaker OPEN for Stripe"), {
				name: "CircuitBreakerError",
			}),
		);

		await expect(cancelOrphanPaymentIntent("pi_test_abc123")).resolves.toBeUndefined();
		expect(mockLoggerInfo).toHaveBeenCalledTimes(1);
	});
});
