import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockGetSession,
	mockGetOrCreateCartSessionId,
	mockCheckRateLimit,
	mockGetClientIp,
	mockGetRateLimitIdentifier,
	mockHeaders,
	mockGetSkuDetails,
	mockCalculateShipping,
	mockGetOrCreateStripeCustomer,
	mockStripe,
	mockSentryStartSpan,
	mockSentryCaptureException,
	MockCircuitBreakerError,
} = vi.hoisted(() => {
	class MockCircuitBreakerError extends Error {
		constructor(name: string) {
			super(`Circuit breaker OPEN for ${name}`);
			this.name = "CircuitBreakerError";
		}
	}

	return {
		mockPrisma: {
			user: { findUnique: vi.fn() },
		},
		mockGetSession: vi.fn(),
		mockGetOrCreateCartSessionId: vi.fn(),
		mockCheckRateLimit: vi.fn(),
		mockGetClientIp: vi.fn(),
		mockGetRateLimitIdentifier: vi.fn(),
		mockHeaders: vi.fn(),
		mockGetSkuDetails: vi.fn(),
		mockCalculateShipping: vi.fn(),
		mockGetOrCreateStripeCustomer: vi.fn(),
		mockStripe: {
			paymentIntents: { create: vi.fn() },
		},
		mockSentryStartSpan: vi.fn(),
		mockSentryCaptureException: vi.fn(),
		MockCircuitBreakerError,
	};
});

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("@/modules/cart/lib/cart-session", () => ({
	getOrCreateCartSessionId: mockGetOrCreateCartSessionId,
}));

vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
	getClientIp: mockGetClientIp,
	getRateLimitIdentifier: mockGetRateLimitIdentifier,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	PAYMENT_LIMITS: { CREATE_SESSION: "create-session" },
}));

vi.mock("next/headers", () => ({
	headers: mockHeaders,
}));

vi.mock("@/modules/cart/services/sku-validation.service", () => ({
	getSkuDetails: mockGetSkuDetails,
}));

vi.mock("@/modules/orders/services/shipping.service", () => ({
	calculateShipping: mockCalculateShipping,
}));

vi.mock("@/modules/payments/services/stripe-customer.service", () => ({
	getOrCreateStripeCustomer: mockGetOrCreateStripeCustomer,
}));

vi.mock("@/shared/lib/stripe", () => ({
	stripe: mockStripe,
	CircuitBreakerError: MockCircuitBreakerError,
}));

vi.mock("@/shared/constants/currency", () => ({
	DEFAULT_CURRENCY: "EUR",
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: {
		error: vi.fn(),
		warn: vi.fn(),
	},
}));

vi.mock("@sentry/nextjs", () => ({
	startSpan: mockSentryStartSpan,
	captureException: mockSentryCaptureException,
}));

import { initializePayment } from "../initialize-payment";

// ============================================================================
// TEST DATA
// ============================================================================

const VALID_CART_ITEMS = [{ skuId: "sku-001", quantity: 2, priceAtAdd: 4500 }];

const MOCK_SKU_RESULT = {
	success: true,
	data: {
		sku: {
			id: "sku-001",
			priceInclTax: 4500,
		},
	},
};

const MOCK_PAYMENT_INTENT = {
	id: "pi_test_123",
	client_secret: "pi_test_secret_abc",
};

// ============================================================================
// HELPERS
// ============================================================================

function setupDefaults() {
	// Sentry: execute the callback directly
	mockSentryStartSpan.mockImplementation((_ctx: unknown, fn: () => Promise<unknown>) => fn());

	// Auth: authenticated user with existing Stripe customer
	mockGetSession.mockResolvedValue({
		user: { id: "user-123", email: "marie@example.com" },
	});
	mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_existing" });

	// Guest session (not used when authenticated)
	mockGetOrCreateCartSessionId.mockResolvedValue("session-guest-abc");

	// Rate limit
	mockHeaders.mockResolvedValue(new Headers());
	mockGetClientIp.mockResolvedValue("192.168.1.1");
	mockGetRateLimitIdentifier.mockReturnValue("fallback-id");
	mockCheckRateLimit.mockResolvedValue({ success: true });

	// SKU details
	mockGetSkuDetails.mockResolvedValue(MOCK_SKU_RESULT);

	// Shipping: 600 centimes for France Standard
	mockCalculateShipping.mockReturnValue(600);

	// Stripe customer: returns existing customer id
	mockGetOrCreateStripeCustomer.mockResolvedValue({ customerId: "cus_existing" });

	// Stripe Payment Intent
	mockStripe.paymentIntents.create.mockResolvedValue(MOCK_PAYMENT_INTENT);
}

// ============================================================================
// TESTS
// ============================================================================

describe("initializePayment", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		setupDefaults();
	});

	// ──────────────────────────────────────────────────────────────
	// Happy path — authenticated user
	// ──────────────────────────────────────────────────────────────

	describe("happy path (authenticated user)", () => {
		it("should return success with correct amounts for authenticated user", async () => {
			const result = await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(result.success).toBe(true);
			if (!result.success) return;

			// subtotal = 4500 * 2 = 9000; shipping = 600; total = 9600
			expect(result.subtotal).toBe(9000);
			expect(result.shipping).toBe(600);
			expect(result.total).toBe(9600);
		});

		it("should return clientSecret and paymentIntentId from Stripe", async () => {
			const result = await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(result.success).toBe(true);
			if (!result.success) return;

			expect(result.clientSecret).toBe("pi_test_secret_abc");
			expect(result.paymentIntentId).toBe("pi_test_123");
		});

		it("should use user session to build rate limit identifier", async () => {
			await initializePayment({ cartItems: VALID_CART_ITEMS });

			// Should not call getOrCreateCartSessionId for authenticated users
			expect(mockGetOrCreateCartSessionId).not.toHaveBeenCalled();
			// checkRateLimit called with user:<userId> composite id
			expect(mockCheckRateLimit).toHaveBeenCalledWith(
				"user:user-123",
				"create-session",
				"192.168.1.1",
			);
		});

		it("should create Payment Intent with automatic_payment_methods enabled", async () => {
			await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
				expect.objectContaining({
					automatic_payment_methods: { enabled: true },
				}),
			);
		});

		it("should attach existing Stripe customer to Payment Intent", async () => {
			await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
				expect.objectContaining({
					customer: "cus_existing",
				}),
			);
		});

		it("should include userId in Payment Intent metadata", async () => {
			await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: expect.objectContaining({ userId: "user-123" }),
				}),
			);
		});

		it("should not include guestSessionId in metadata for authenticated user", async () => {
			await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: expect.not.objectContaining({ guestSessionId: expect.anything() }),
				}),
			);
		});

		it("should use userEmail when no email param is passed", async () => {
			await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(mockGetOrCreateStripeCustomer).toHaveBeenCalledWith(
				"cus_existing",
				expect.objectContaining({ email: "marie@example.com" }),
			);
		});

		it("should calculate shipping for France by default", async () => {
			await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(mockCalculateShipping).toHaveBeenCalledWith("FR");
		});

		it("should fall back to 499 shipping when calculateShipping returns null", async () => {
			mockCalculateShipping.mockReturnValue(null);

			const result = await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.shipping).toBe(499);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Happy path — guest checkout
	// ──────────────────────────────────────────────────────────────

	describe("happy path (guest with email)", () => {
		beforeEach(() => {
			mockGetSession.mockResolvedValue(null);
			mockGetOrCreateCartSessionId.mockResolvedValue("session-guest-abc");
			mockPrisma.user.findUnique.mockResolvedValue(null);
			mockGetOrCreateStripeCustomer.mockResolvedValue({ customerId: "cus_new_guest" });
		});

		it("should return success for guest with email", async () => {
			const result = await initializePayment({
				cartItems: VALID_CART_ITEMS,
				email: "guest@example.com",
			});

			expect(result.success).toBe(true);
		});

		it("should create a cart session for guest rate limit identifier", async () => {
			await initializePayment({
				cartItems: VALID_CART_ITEMS,
				email: "guest@example.com",
			});

			expect(mockGetOrCreateCartSessionId).toHaveBeenCalled();
		});

		it("should use composite guest rate limit id (email + ip) when both are available", async () => {
			await initializePayment({
				cartItems: VALID_CART_ITEMS,
				email: "guest@example.com",
			});

			expect(mockCheckRateLimit).toHaveBeenCalledWith(
				"guest:guest@example.com:192.168.1.1",
				"create-session",
				"192.168.1.1",
			);
		});

		it("should include guestSessionId in Payment Intent metadata", async () => {
			await initializePayment({
				cartItems: VALID_CART_ITEMS,
				email: "guest@example.com",
			});

			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: expect.objectContaining({
						userId: "guest",
						guestSessionId: "session-guest-abc",
					}),
				}),
			);
		});

		it("should use guest email to get or create Stripe customer", async () => {
			await initializePayment({
				cartItems: VALID_CART_ITEMS,
				email: "guest@example.com",
			});

			expect(mockGetOrCreateStripeCustomer).toHaveBeenCalledWith(
				null,
				expect.objectContaining({ email: "guest@example.com" }),
			);
		});

		it("should skip Stripe customer creation when guest has no email", async () => {
			const result = await initializePayment({ cartItems: VALID_CART_ITEMS });

			// No email, no Stripe customer attempted
			expect(mockGetOrCreateStripeCustomer).not.toHaveBeenCalled();
			// Should still succeed — PI created without customer
			expect(result.success).toBe(true);
		});

		it("should create Payment Intent without customer when guest has no email", async () => {
			await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
				expect.not.objectContaining({ customer: expect.anything() }),
			);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Rate limiting
	// ──────────────────────────────────────────────────────────────

	describe("rate limiting", () => {
		it("should return error when rate limited", async () => {
			mockCheckRateLimit.mockResolvedValue({
				success: false,
				error: "Trop de tentatives. Veuillez réessayer plus tard.",
				retryAfter: 60,
			});

			const result = await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toBe("Trop de tentatives. Veuillez réessayer plus tard.");
		});

		it("should use fallback error message when rate limit error is undefined", async () => {
			mockCheckRateLimit.mockResolvedValue({
				success: false,
				error: undefined,
			});

			const result = await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toBe("Trop de tentatives. Veuillez réessayer plus tard.");
		});

		it("should not call Stripe when rate limited", async () => {
			mockCheckRateLimit.mockResolvedValue({ success: false, error: "Rate limited" });

			await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();
		});

		it("should not validate cart items when rate limited", async () => {
			mockCheckRateLimit.mockResolvedValue({ success: false, error: "Rate limited" });

			await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(mockGetSkuDetails).not.toHaveBeenCalled();
		});
	});

	// ──────────────────────────────────────────────────────────────
	// SKU validation
	// ──────────────────────────────────────────────────────────────

	describe("cart item validation", () => {
		it("should return error when a SKU is unavailable", async () => {
			mockGetSkuDetails.mockResolvedValue({ success: false, error: "SKU not found" });

			const result = await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toBe("Certains articles ne sont plus disponibles.");
		});

		it("should return error when any SKU among multiple is unavailable", async () => {
			const cartItems = [
				{ skuId: "sku-001", quantity: 1, priceAtAdd: 4500 },
				{ skuId: "sku-002", quantity: 1, priceAtAdd: 3000 },
			];

			mockGetSkuDetails
				.mockResolvedValueOnce(MOCK_SKU_RESULT)
				.mockResolvedValueOnce({ success: false, error: "Out of stock" });

			const result = await initializePayment({ cartItems });

			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toContain("articles ne sont plus disponibles");
		});

		it("should call getSkuDetails for each cart item in parallel", async () => {
			const cartItems = [
				{ skuId: "sku-001", quantity: 1, priceAtAdd: 4500 },
				{ skuId: "sku-002", quantity: 1, priceAtAdd: 3000 },
			];

			mockGetSkuDetails.mockResolvedValueOnce(MOCK_SKU_RESULT).mockResolvedValueOnce({
				success: true,
				data: { sku: { id: "sku-002", priceInclTax: 3000 } },
			});

			await initializePayment({ cartItems });

			expect(mockGetSkuDetails).toHaveBeenCalledTimes(2);
			expect(mockGetSkuDetails).toHaveBeenCalledWith({ skuId: "sku-001" });
			expect(mockGetSkuDetails).toHaveBeenCalledWith({ skuId: "sku-002" });
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Price verification
	// ──────────────────────────────────────────────────────────────

	describe("price verification", () => {
		it("should return error when price changed since item was added to cart", async () => {
			mockGetSkuDetails.mockResolvedValue({
				success: true,
				data: {
					sku: {
						id: "sku-001",
						priceInclTax: 5000, // Price changed from 4500
					},
				},
			});

			const result = await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toBe(
				"Les prix de certains articles ont changé. Actualisez votre panier.",
			);
		});

		it("should not return price error when prices match exactly", async () => {
			// Default mock returns priceInclTax: 4500 which matches priceAtAdd: 4500
			const result = await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(result.success).toBe(true);
		});

		it("should not call Stripe when a price mismatch is detected", async () => {
			mockGetSkuDetails.mockResolvedValue({
				success: true,
				data: { sku: { id: "sku-001", priceInclTax: 9999 } },
			});

			await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Subtotal calculation
	// ──────────────────────────────────────────────────────────────

	describe("subtotal calculation", () => {
		it("should calculate subtotal as sum of priceAtAdd * quantity", async () => {
			const cartItems = [
				{ skuId: "sku-001", quantity: 3, priceAtAdd: 2000 },
				{ skuId: "sku-002", quantity: 1, priceAtAdd: 5000 },
			];

			mockGetSkuDetails
				.mockResolvedValueOnce({
					success: true,
					data: { sku: { id: "sku-001", priceInclTax: 2000 } },
				})
				.mockResolvedValueOnce({
					success: true,
					data: { sku: { id: "sku-002", priceInclTax: 5000 } },
				});

			const result = await initializePayment({ cartItems });

			expect(result.success).toBe(true);
			if (!result.success) return;
			// (2000 * 3) + (5000 * 1) = 6000 + 5000 = 11000
			expect(result.subtotal).toBe(11000);
		});

		it("should pass correct total (subtotal + shipping) to Stripe", async () => {
			// VALID_CART_ITEMS: 4500 * 2 = 9000 subtotal, shipping = 600
			const result = await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.total).toBe(9600);

			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
				expect.objectContaining({ amount: 9600 }),
			);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Stripe customer creation failure
	// ──────────────────────────────────────────────────────────────

	describe("Stripe customer creation failure", () => {
		it("should still create Payment Intent when getOrCreateStripeCustomer returns error", async () => {
			mockGetOrCreateStripeCustomer.mockResolvedValue({
				customerId: null,
				error: "Email invalide",
			});

			const result = await initializePayment({
				cartItems: VALID_CART_ITEMS,
				email: "bad@example.com",
			});

			// Should proceed without Stripe customer
			expect(result.success).toBe(true);
			expect(mockStripe.paymentIntents.create).toHaveBeenCalled();
		});

		it("should not attach customer to Payment Intent when customer creation fails", async () => {
			mockGetOrCreateStripeCustomer.mockResolvedValue({ customerId: null });

			await initializePayment({
				cartItems: VALID_CART_ITEMS,
				email: "failing@example.com",
			});

			// Payment Intent created without customer key
			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
				expect.not.objectContaining({ customer: expect.anything() }),
			);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Payment Intent creation failure
	// ──────────────────────────────────────────────────────────────

	describe("Payment Intent creation failure", () => {
		it("should return generic error when stripe.paymentIntents.create throws", async () => {
			mockStripe.paymentIntents.create.mockRejectedValue(new Error("Stripe API down"));

			const result = await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toBe("Une erreur est survenue lors de l'initialisation du paiement.");
		});

		it("should capture exception with Sentry on unexpected error", async () => {
			const boom = new Error("Stripe API down");
			mockStripe.paymentIntents.create.mockRejectedValue(boom);

			await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(mockSentryCaptureException).toHaveBeenCalledWith(boom);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// CircuitBreakerError
	// ──────────────────────────────────────────────────────────────

	describe("CircuitBreakerError handling", () => {
		it("should return service unavailable error on CircuitBreakerError", async () => {
			mockStripe.paymentIntents.create.mockRejectedValue(new MockCircuitBreakerError("stripe"));

			const result = await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toBe("Le service de paiement est temporairement indisponible.");
		});

		it("should not capture CircuitBreakerError with Sentry", async () => {
			mockStripe.paymentIntents.create.mockRejectedValue(new MockCircuitBreakerError("stripe"));

			await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(mockSentryCaptureException).not.toHaveBeenCalled();
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Missing client_secret
	// ──────────────────────────────────────────────────────────────

	describe("missing client_secret on Payment Intent", () => {
		it("should return generic error when client_secret is null", async () => {
			mockStripe.paymentIntents.create.mockResolvedValue({
				id: "pi_test_123",
				client_secret: null,
			});

			const result = await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toBe("Une erreur est survenue lors de l'initialisation du paiement.");
		});

		it("should capture the missing client_secret error with Sentry", async () => {
			mockStripe.paymentIntents.create.mockResolvedValue({
				id: "pi_test_123",
				client_secret: null,
			});

			await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(mockSentryCaptureException).toHaveBeenCalled();
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Prisma / DB errors
	// ──────────────────────────────────────────────────────────────

	describe("database errors", () => {
		it("should return generic error when user lookup throws", async () => {
			mockPrisma.user.findUnique.mockRejectedValue(new Error("DB connection lost"));

			const result = await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toBe("Une erreur est survenue lors de l'initialisation du paiement.");
		});

		it("should capture DB error with Sentry", async () => {
			const dbError = new Error("DB connection lost");
			mockPrisma.user.findUnique.mockRejectedValue(dbError);

			await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(mockSentryCaptureException).toHaveBeenCalledWith(dbError);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Currency
	// ──────────────────────────────────────────────────────────────

	describe("currency", () => {
		it("should pass currency in lowercase to Stripe", async () => {
			await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
				expect.objectContaining({ currency: "eur" }),
			);
		});
	});
});
