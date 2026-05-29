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
	mockAssertStoreOpen,
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
		mockAssertStoreOpen: vi.fn(),
		MockCircuitBreakerError,
	};
});

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

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
	withStripeCircuitBreaker: (fn: () => Promise<unknown>) => fn(),
	CircuitBreakerError: MockCircuitBreakerError,
}));

vi.mock("@/shared/constants/currency", () => ({
	DEFAULT_CURRENCY: "EUR",
}));

vi.mock("@/modules/store-settings/services/store-closure-guard", () => ({
	assertStoreOpen: mockAssertStoreOpen,
}));

const { mockLoggerError, mockLoggerInfo, mockLoggerWarn } = vi.hoisted(() => ({
	mockLoggerError: vi.fn(),
	mockLoggerInfo: vi.fn(),
	mockLoggerWarn: vi.fn(),
}));
vi.mock("@/shared/lib/logger", () => ({
	logger: {
		error: mockLoggerError,
		info: mockLoggerInfo,
		warn: mockLoggerWarn,
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
	// Sentry: execute the callback directly with a stub span.
	mockSentryStartSpan.mockImplementation((_ctx: unknown, fn: (span: unknown) => unknown) =>
		fn({ setAttribute: vi.fn() }),
	);

	// Auth: authenticated user with existing Stripe customer
	mockGetSession.mockResolvedValue({
		user: { id: "user-123", email: "marie@example.com" },
	});
	mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_existing" });

	// Guest session (not used when authenticated)
	mockGetOrCreateCartSessionId.mockResolvedValue("session-guest-abc");

	// Store closure guard: store is open
	mockAssertStoreOpen.mockResolvedValue(null);

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

		it("should create Payment Intent with automatic payment methods (card + wallets + Link, no redirects)", async () => {
			await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
				expect.objectContaining({
					automatic_payment_methods: { enabled: true, allow_redirects: "never" },
				}),
				expect.anything(),
			);
		});

		it("should attach existing Stripe customer to Payment Intent", async () => {
			await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
				expect.objectContaining({
					customer: "cus_existing",
				}),
				expect.anything(),
			);
		});

		it("should include userId in Payment Intent metadata", async () => {
			await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: expect.objectContaining({ userId: "user-123" }),
				}),
				expect.anything(),
			);
		});

		it("should not include guestSessionId in metadata for authenticated user", async () => {
			await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: expect.not.objectContaining({ guestSessionId: expect.anything() }),
				}),
				expect.anything(),
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

		it("returns a failure when default FR shipping is misconfigured", async () => {
			// Audit P2.5: removed silent ?? 499 fallback — surface the misconfig instead.
			mockCalculateShipping.mockReturnValue(null);

			const result = await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(result.success).toBe(false);
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
				expect.anything(),
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
				expect.anything(),
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
				expect.anything(),
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
				expect.anything(),
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

		it("should log exception on unexpected error (Sentry via logger.error)", async () => {
			const boom = new Error("Stripe API down");
			mockStripe.paymentIntents.create.mockRejectedValue(boom);

			await initializePayment({ cartItems: VALID_CART_ITEMS });

			// logger.error captures the error and forwards to Sentry internally.
			expect(mockLoggerError).toHaveBeenCalledWith(
				"Failed to initialize payment",
				boom,
				expect.objectContaining({ service: "checkout" }),
			);
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

		it("should log the missing client_secret error", async () => {
			mockStripe.paymentIntents.create.mockResolvedValue({
				id: "pi_test_123",
				client_secret: null,
			});

			await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(mockLoggerError).toHaveBeenCalled();
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

		it("should log DB error (Sentry via logger.error)", async () => {
			const dbError = new Error("DB connection lost");
			mockPrisma.user.findUnique.mockRejectedValue(dbError);

			await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(mockLoggerError).toHaveBeenCalledWith(
				"Failed to initialize payment",
				dbError,
				expect.objectContaining({ service: "checkout" }),
			);
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
				expect.anything(),
			);
		});
	});

	describe("store closure", () => {
		it("should reject non-admin user when store is closed", async () => {
			mockAssertStoreOpen.mockResolvedValue({
				closed: true,
				message: "La boutique est temporairement fermée.",
			});

			const result = await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toBe("La boutique est temporairement fermée.");
			expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();
		});

		it("should reject guest when store is closed", async () => {
			mockGetSession.mockResolvedValue(null);
			mockAssertStoreOpen.mockResolvedValue({
				closed: true,
				message: "Fermée.",
			});

			const result = await initializePayment({
				cartItems: VALID_CART_ITEMS,
				email: "guest@example.com",
			});

			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toBe("Fermée.");
			expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();
		});

		it("should bypass closure check for ADMIN role", async () => {
			mockGetSession.mockResolvedValue({
				user: { id: "admin-1", email: "admin@example.com", role: "ADMIN" },
			});
			mockAssertStoreOpen.mockResolvedValue({
				closed: true,
				message: "La boutique est temporairement fermée.",
			});

			const result = await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(result.success).toBe(true);
			expect(mockAssertStoreOpen).not.toHaveBeenCalled();
			expect(mockStripe.paymentIntents.create).toHaveBeenCalled();
		});
	});

	describe("account suspension gate (AUTHZ-1)", () => {
		it("rejects an authenticated session whose account is not ACTIVE — no PaymentIntent created", async () => {
			mockGetSession.mockResolvedValue({
				user: { id: "user-123", email: "marie@example.com" },
			});
			// DB filter (suspendedAt/accountStatus) excludes the row → gate rejects
			// pre-payment, so no orphan charge can occur.
			mockPrisma.user.findUnique.mockResolvedValue(null);

			const result = await initializePayment({ cartItems: VALID_CART_ITEMS });

			expect(result.success).toBe(false);
			expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();
			expect(mockAssertStoreOpen).not.toHaveBeenCalled();
		});
	});
});
