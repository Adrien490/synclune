import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockStripe, MockStripeError, mockStripeErrorClasses, mockLogger, mockSentry } = vi.hoisted(
	() => {
		class MockStripeError extends Error {
			code?: string;
			constructor(message: string) {
				super(message);
				this.name = "StripeError";
			}
		}
		// Sous-classes réelles requises : classifyStripeError (importé par
		// stripe-refund) fait des instanceof sur chacune — un mock partiel
		// (`errors: { StripeError }` seul) donnerait `instanceof undefined`.
		class MockStripeCardError extends MockStripeError {}
		class MockStripeRateLimitError extends MockStripeError {}
		class MockStripeConnectionError extends MockStripeError {}
		class MockStripeAPIError extends MockStripeError {}
		class MockStripeAuthenticationError extends MockStripeError {}
		class MockStripePermissionError extends MockStripeError {}
		class MockStripeIdempotencyError extends MockStripeError {}
		class MockStripeInvalidRequestError extends MockStripeError {}

		return {
			mockStripe: {
				paymentIntents: {
					retrieve: vi.fn(),
				},
				refunds: {
					create: vi.fn(),
					list: vi.fn(),
					retrieve: vi.fn(),
				},
			},
			MockStripeError,
			mockStripeErrorClasses: {
				StripeError: MockStripeError,
				StripeCardError: MockStripeCardError,
				StripeRateLimitError: MockStripeRateLimitError,
				StripeConnectionError: MockStripeConnectionError,
				StripeAPIError: MockStripeAPIError,
				StripeAuthenticationError: MockStripeAuthenticationError,
				StripePermissionError: MockStripePermissionError,
				StripeIdempotencyError: MockStripeIdempotencyError,
				StripeInvalidRequestError: MockStripeInvalidRequestError,
			},
			mockLogger: {
				info: vi.fn(),
				warn: vi.fn(),
				error: vi.fn(),
				debug: vi.fn(),
			},
			mockSentry: {
				withScope: vi.fn((cb: (scope: unknown) => void) =>
					cb({
						setLevel: vi.fn(),
						setTag: vi.fn(),
						setFingerprint: vi.fn(),
						setContext: vi.fn(),
					}),
				),
				captureMessage: vi.fn(),
			},
		};
	},
);

vi.mock("@/shared/lib/stripe", () => ({
	stripe: mockStripe,
}));

vi.mock("stripe", () => ({
	default: class Stripe {
		static errors = mockStripeErrorClasses;
	},
}));

vi.mock("@sentry/nextjs", () => mockSentry);

vi.mock("@/shared/lib/circuit-breaker", () => ({
	stripeCircuitBreaker: {
		execute: <T>(fn: () => Promise<T>) => fn(),
	},
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: mockLogger,
}));

import { createStripeRefund, getStripeRefundStatus } from "../stripe-refund";

// ============================================================================
// Helpers
// ============================================================================

function makeStripeError(code: string, message: string) {
	const err = new MockStripeError(message);
	err.code = code;
	return err;
}

// ============================================================================
// createStripeRefund
// ============================================================================

describe("createStripeRefund", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockStripe.paymentIntents.retrieve.mockResolvedValue({ currency: "eur" });
	});

	it("should return success when Stripe returns succeeded", async () => {
		mockStripe.refunds.create.mockResolvedValue({
			id: "re_123",
			status: "succeeded",
		});

		const result = await createStripeRefund({
			paymentIntentId: "pi_123",
			amount: 5000,
		});

		expect(result).toEqual({
			success: true,
			pending: false,
			refundId: "re_123",
			status: "succeeded",
		});
	});

	it("should return pending when Stripe returns pending", async () => {
		mockStripe.refunds.create.mockResolvedValue({
			id: "re_456",
			status: "pending",
		});

		const result = await createStripeRefund({
			paymentIntentId: "pi_123",
			amount: 3000,
		});

		expect(result).toEqual({
			success: false,
			pending: true,
			refundId: "re_456",
			status: "pending",
		});
	});

	it("should return error when neither paymentIntentId nor chargeId provided", async () => {
		const result = await createStripeRefund({ amount: 5000 });

		expect(result).toEqual({
			success: false,
			error: "Un PaymentIntent ID ou Charge ID est requis pour le remboursement",
		});
		expect(mockStripe.refunds.create).not.toHaveBeenCalled();
	});

	it("should prioritize paymentIntentId over chargeId", async () => {
		mockStripe.refunds.create.mockResolvedValue({ id: "re_789", status: "succeeded" });

		await createStripeRefund({
			paymentIntentId: "pi_123",
			chargeId: "ch_456",
			amount: 5000,
		});

		const callArgs = mockStripe.refunds.create.mock.calls[0]![0];
		expect(callArgs.payment_intent).toBe("pi_123");
		expect(callArgs.charge).toBeUndefined();
	});

	it("should use chargeId when paymentIntentId is not provided", async () => {
		mockStripe.refunds.create.mockResolvedValue({ id: "re_789", status: "succeeded" });

		await createStripeRefund({
			chargeId: "ch_456",
			amount: 5000,
		});

		const callArgs = mockStripe.refunds.create.mock.calls[0]![0];
		expect(callArgs.charge).toBe("ch_456");
		expect(callArgs.payment_intent).toBeUndefined();
	});

	it("should pass idempotency key in request options", async () => {
		mockStripe.refunds.create.mockResolvedValue({ id: "re_123", status: "succeeded" });

		await createStripeRefund({
			paymentIntentId: "pi_123",
			amount: 5000,
			idempotencyKey: "refund_abc",
		});

		expect(mockStripe.refunds.create).toHaveBeenCalledWith(expect.any(Object), {
			idempotencyKey: "refund_abc",
		});
	});

	it("should not pass idempotency key when not provided", async () => {
		mockStripe.refunds.create.mockResolvedValue({ id: "re_123", status: "succeeded" });

		await createStripeRefund({
			paymentIntentId: "pi_123",
			amount: 5000,
		});

		expect(mockStripe.refunds.create).toHaveBeenCalledWith(expect.any(Object), {});
	});

	it("should map FRAUD reason to fraudulent", async () => {
		mockStripe.refunds.create.mockResolvedValue({ id: "re_123", status: "succeeded" });

		await createStripeRefund({
			paymentIntentId: "pi_123",
			amount: 5000,
			reason: "FRAUD",
		});

		expect(mockStripe.refunds.create).toHaveBeenCalledWith(
			expect.objectContaining({ reason: "fraudulent" }),
			expect.any(Object),
		);
	});

	it("should map CUSTOMER_REQUEST reason to requested_by_customer", async () => {
		mockStripe.refunds.create.mockResolvedValue({ id: "re_123", status: "succeeded" });

		await createStripeRefund({
			paymentIntentId: "pi_123",
			amount: 5000,
			reason: "CUSTOMER_REQUEST",
		});

		expect(mockStripe.refunds.create).toHaveBeenCalledWith(
			expect.objectContaining({ reason: "requested_by_customer" }),
			expect.any(Object),
		);
	});

	it("should default to requested_by_customer for unknown reason", async () => {
		mockStripe.refunds.create.mockResolvedValue({ id: "re_123", status: "succeeded" });

		await createStripeRefund({
			paymentIntentId: "pi_123",
			amount: 5000,
			reason: "SOME_UNKNOWN_REASON",
		});

		expect(mockStripe.refunds.create).toHaveBeenCalledWith(
			expect.objectContaining({ reason: "requested_by_customer" }),
			expect.any(Object),
		);
	});

	// ==========================================================================
	// charge_already_refunded idempotence
	// ==========================================================================

	describe("charge_already_refunded handling", () => {
		it("should match by metadata refund_id (highest priority)", async () => {
			mockStripe.refunds.create.mockRejectedValue(
				makeStripeError("charge_already_refunded", "Charge already refunded"),
			);
			mockStripe.refunds.list.mockResolvedValue({
				data: [
					{ id: "re_other", amount: 5000, metadata: {} },
					{ id: "re_match", amount: 5000, metadata: { refund_id: "my-refund" } },
				],
			});

			const result = await createStripeRefund({
				paymentIntentId: "pi_123",
				amount: 5000,
				metadata: { refund_id: "my-refund" },
			});

			expect(result).toEqual({ success: true, pending: false, refundId: "re_match" });
		});

		it("should match by amount + recent timestamp (medium priority)", async () => {
			mockStripe.refunds.create.mockRejectedValue(
				makeStripeError("charge_already_refunded", "Charge already refunded"),
			);
			const now = Math.floor(Date.now() / 1000);
			mockStripe.refunds.list.mockResolvedValue({
				data: [
					{ id: "re_recent", amount: 5000, created: now - 100, metadata: {} },
					{ id: "re_old", amount: 5000, created: now - 7200, metadata: {} },
				],
			});

			const result = await createStripeRefund({
				paymentIntentId: "pi_123",
				amount: 5000,
			});

			// Multiple candidates by amount → fail hard, no refundId
			expect(result.success).toBe(true);
			expect(result.refundId).toBeUndefined();
		});

		it("should match by amount only when single candidate", async () => {
			mockStripe.refunds.create.mockRejectedValue(
				makeStripeError("charge_already_refunded", "Charge already refunded"),
			);
			const now = Math.floor(Date.now() / 1000);
			mockStripe.refunds.list.mockResolvedValue({
				data: [
					{ id: "re_diff_amount", amount: 3000, created: now - 100, metadata: {} },
					{ id: "re_same_amount", amount: 5000, created: now - 7200, metadata: {} },
				],
			});

			const result = await createStripeRefund({
				paymentIntentId: "pi_123",
				amount: 5000,
			});

			expect(result.success).toBe(true);
			expect(result.refundId).toBe("re_same_amount");
		});

		it("should NOT adopt an unrelated refund of a different amount (no first-refund fallback)", async () => {
			// Un refund d'un montant différent (ex: full refund Dashboard) ne doit
			// jamais servir d'anchor : stripeRefundId @unique lèverait P2002 s'il
			// est déjà lié, et la traçabilité serait fausse. On finalise sans
			// anchor + alerte Sentry pour vérification manuelle.
			mockStripe.refunds.create.mockRejectedValue(
				makeStripeError("charge_already_refunded", "Charge already refunded"),
			);
			mockStripe.refunds.list.mockResolvedValue({
				data: [
					{
						id: "re_first",
						amount: 3000,
						created: Math.floor(Date.now() / 1000) - 7200,
						metadata: {},
					},
				],
			});

			const result = await createStripeRefund({
				paymentIntentId: "pi_123",
				amount: 5000,
			});

			expect(result.success).toBe(true);
			expect(result.refundId).toBeUndefined();
			expect(mockSentry.captureMessage).toHaveBeenCalledWith(
				expect.stringContaining("sans anchor"),
				"warning",
			);
		});

		it("should warn when matching via fallback (no metadata)", async () => {
			mockStripe.refunds.create.mockRejectedValue(
				makeStripeError("charge_already_refunded", "Charge already refunded"),
			);
			const now = Math.floor(Date.now() / 1000);
			mockStripe.refunds.list.mockResolvedValue({
				data: [{ id: "re_fallback", amount: 5000, created: now - 100, metadata: {} }],
			});

			await createStripeRefund({
				paymentIntentId: "pi_123",
				amount: 5000,
			});

			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining("Recovered refund via fallback"),
				expect.any(Object),
			);
		});

		it("should handle stripe.refunds.list failure in recovery", async () => {
			mockStripe.refunds.create.mockRejectedValue(
				makeStripeError("charge_already_refunded", "Charge already refunded"),
			);
			mockStripe.refunds.list.mockRejectedValue(new Error("List failed"));

			const result = await createStripeRefund({
				paymentIntentId: "pi_123",
				amount: 5000,
			});

			expect(result).toEqual({ success: true, pending: false, refundId: undefined });
			expect(mockLogger.warn).toHaveBeenCalledWith(
				"Could not recover existing refund ID",
				expect.any(Object),
			);
			expect(mockSentry.captureMessage).toHaveBeenCalledWith(
				expect.stringContaining("sans anchor"),
				"warning",
			);
		});

		it("should fail hard when multiple candidates match by amount without metadata", async () => {
			mockStripe.refunds.create.mockRejectedValue(
				makeStripeError("charge_already_refunded", "Charge already refunded"),
			);
			const now = Math.floor(Date.now() / 1000);
			mockStripe.refunds.list.mockResolvedValue({
				data: [
					{ id: "re_1", amount: 5000, created: now - 100, metadata: {} },
					{ id: "re_2", amount: 5000, created: now - 200, metadata: {} },
				],
			});

			const result = await createStripeRefund({
				paymentIntentId: "pi_123",
				amount: 5000,
			});

			expect(result.success).toBe(true);
			expect(result.refundId).toBeUndefined();
			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining("Multiple refunds match amount"),
				expect.any(Object),
			);
		});
	});

	it("should return Stripe error message for other StripeErrors", async () => {
		mockStripe.refunds.create.mockRejectedValue(
			makeStripeError("card_declined", "Card was declined"),
		);

		const result = await createStripeRefund({
			paymentIntentId: "pi_123",
			amount: 5000,
		});

		expect(result).toEqual({
			success: false,
			error: "Card was declined",
			// Instance de base StripeError (aucune sous-classe) → "unknown".
			errorKind: "unknown",
			retryable: false,
		});
	});

	it("should classify a connection error as transient/retryable", async () => {
		const err = new mockStripeErrorClasses.StripeConnectionError("Connection reset");
		mockStripe.refunds.create.mockRejectedValue(err);

		const result = await createStripeRefund({
			paymentIntentId: "pi_123",
			amount: 5000,
		});

		expect(result.success).toBe(false);
		expect(result.errorKind).toBe("transient");
		expect(result.retryable).toBe(true);
	});

	it("should classify an invalid request error as bug/non-retryable", async () => {
		const err = new mockStripeErrorClasses.StripeInvalidRequestError("No such payment_intent");
		mockStripe.refunds.create.mockRejectedValue(err);

		const result = await createStripeRefund({
			paymentIntentId: "pi_123",
			amount: 5000,
		});

		expect(result.success).toBe(false);
		expect(result.errorKind).toBe("bug");
		expect(result.retryable).toBe(false);
	});

	it("should return generic error for non-Stripe errors", async () => {
		mockStripe.refunds.create.mockRejectedValue(new Error("Network error"));

		const result = await createStripeRefund({
			paymentIntentId: "pi_123",
			amount: 5000,
		});

		expect(result).toEqual({
			success: false,
			error: "Erreur lors de la création du remboursement Stripe",
			errorKind: "unknown",
			retryable: false,
		});
	});
});

// ============================================================================
// getStripeRefundStatus
// ============================================================================

describe("getStripeRefundStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return the refund status", async () => {
		mockStripe.refunds.retrieve.mockResolvedValue({ id: "re_123", status: "succeeded" });

		const status = await getStripeRefundStatus("re_123");

		expect(status).toBe("succeeded");
		expect(mockStripe.refunds.retrieve).toHaveBeenCalledWith("re_123");
	});

	it("should return null on error", async () => {
		mockStripe.refunds.retrieve.mockRejectedValue(new Error("Not found"));

		const status = await getStripeRefundStatus("re_invalid");

		expect(status).toBeNull();
	});
});
