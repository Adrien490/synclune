import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockGetSession,
	mockGetOrCreateCartSessionId,
	mockGetCart,
	mockGetSkuDetails,
	mockAssertStoreOpen,
	mockCheckRateLimit,
	mockGetClientIp,
	mockGetRateLimitIdentifier,
	mockHeaders,
	mockStripePaymentIntentsRetrieve,
	mockStripePaymentIntentsUpdate,
	mockCalculateShipping,
	mockGetShippingInfo,
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
		mockGetSession: vi.fn(),
		mockGetOrCreateCartSessionId: vi.fn(),
		mockGetCart: vi.fn(),
		mockGetSkuDetails: vi.fn(),
		mockAssertStoreOpen: vi.fn(),
		mockCheckRateLimit: vi.fn(),
		mockGetClientIp: vi.fn(),
		mockGetRateLimitIdentifier: vi.fn(),
		mockHeaders: vi.fn(),
		mockStripePaymentIntentsRetrieve: vi.fn(),
		mockStripePaymentIntentsUpdate: vi.fn(),
		mockCalculateShipping: vi.fn(),
		mockGetShippingInfo: vi.fn(),
		mockSentryStartSpan: vi.fn(),
		mockSentryCaptureException: vi.fn(),
		MockCircuitBreakerError,
	};
});

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("@/modules/cart/lib/cart-session", () => ({
	getOrCreateCartSessionId: mockGetOrCreateCartSessionId,
}));

vi.mock("@/modules/cart/data/get-cart", () => ({
	getCart: mockGetCart,
}));

vi.mock("@/modules/cart/services/sku-validation.service", () => ({
	getSkuDetails: mockGetSkuDetails,
}));

vi.mock("@/modules/store-settings/services/store-closure-guard", () => ({
	assertStoreOpen: mockAssertStoreOpen,
}));

vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
	getClientIp: mockGetClientIp,
	getRateLimitIdentifier: mockGetRateLimitIdentifier,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	PAYMENT_LIMITS: {
		UPDATE_AMOUNT: { limit: 20, windowMs: 300000 },
	},
}));

vi.mock("next/headers", () => ({
	headers: mockHeaders,
}));

vi.mock("@/shared/lib/stripe", () => ({
	stripe: {
		paymentIntents: {
			retrieve: mockStripePaymentIntentsRetrieve,
			update: mockStripePaymentIntentsUpdate,
		},
	},
	withStripeCircuitBreaker: (fn: () => Promise<unknown>) => fn(),
	CircuitBreakerError: MockCircuitBreakerError,
}));

vi.mock("@/modules/orders/services/shipping.service", () => ({
	calculateShipping: mockCalculateShipping,
	getShippingInfo: mockGetShippingInfo,
}));

vi.mock("@/shared/constants/countries", () => ({
	SHIPPING_COUNTRIES: ["FR", "BE", "DE", "MC", "IT", "ES"] as const,
}));

vi.mock("@/shared/constants/currency", () => ({
	DEFAULT_CURRENCY: "EUR",
	STRIPE_MIN_AMOUNT_EUR_CENTS: 50,
}));

vi.mock("@sentry/nextjs", () => ({
	startSpan: mockSentryStartSpan,
	captureException: mockSentryCaptureException,
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: {
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
	},
}));

import { updatePaymentAmount } from "../update-payment-amount";

// ============================================================================
// TEST DATA
// ============================================================================

const VALID_PARAMS = {
	paymentIntentId: "pi_test_abc123",
	country: "FR",
	postalCode: "75001",
	discountAmount: 0,
};

const MOCK_CART_5000 = {
	items: [
		{
			sku: { id: "sku-1" },
			quantity: 2,
			priceAtAdd: 2500,
		},
	],
};

const MOCK_SKU_RESULT_5000 = {
	success: true as const,
	data: {
		sku: { id: "sku-1", priceInclTax: 2500 },
	},
};

const MOCK_PI_USER = {
	id: "pi_test_abc123",
	metadata: {
		userId: "user-123",
		guestSessionId: "",
	},
};

const MOCK_PI_GUEST = {
	id: "pi_test_abc123",
	metadata: {
		userId: "",
		guestSessionId: "session-abc",
	},
};

const MOCK_SHIPPING_INFO = {
	amount: 499,
	displayName: "Livraison France (2-3 jours)",
	estimatedDays: "2-3",
};

// ============================================================================
// HELPERS
// ============================================================================

function setupAuthenticatedUser(userId = "user-123") {
	mockGetSession.mockResolvedValue({ user: { id: userId, role: "USER" } });
}

function setupGuestUser(sessionId = "session-abc") {
	mockGetSession.mockResolvedValue(null);
	mockGetOrCreateCartSessionId.mockResolvedValue(sessionId);
}

function setupRateLimit(success = true, error?: string) {
	mockCheckRateLimit.mockResolvedValue({
		success,
		remaining: success ? 19 : 0,
		limit: 20,
		reset: Date.now() + 300000,
		...(error ? { error } : {}),
	});
}

function setupShipping(amount: number | null = 499) {
	mockCalculateShipping.mockReturnValue(amount);
	mockGetShippingInfo.mockReturnValue(amount !== null ? MOCK_SHIPPING_INFO : null);
}

function setupCart(cart = MOCK_CART_5000, skuResult = MOCK_SKU_RESULT_5000) {
	mockGetCart.mockResolvedValue(cart);
	mockGetSkuDetails.mockResolvedValue(skuResult);
}

function setupDefaults(userId = "user-123") {
	// Sentry: run the callback directly with a stub span.
	mockSentryStartSpan.mockImplementation((_opts: unknown, fn: (span: unknown) => unknown) =>
		fn({ setAttribute: vi.fn() }),
	);
	setupAuthenticatedUser(userId);
	mockAssertStoreOpen.mockResolvedValue(null);
	mockHeaders.mockResolvedValue(new Headers());
	mockGetClientIp.mockResolvedValue("192.168.1.1");
	mockGetRateLimitIdentifier.mockReturnValue(`user:${userId}`);
	setupRateLimit(true);
	mockStripePaymentIntentsRetrieve.mockResolvedValue({
		...MOCK_PI_USER,
		metadata: { userId, guestSessionId: "" },
	});
	mockStripePaymentIntentsUpdate.mockResolvedValue({ id: "pi_test_abc123", amount: 5499 });
	setupShipping(499);
	setupCart();
}

// ============================================================================
// TESTS
// ============================================================================

describe("updatePaymentAmount", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	// ──────────────────────────────────────────────────────────────
	// Happy path — authenticated user
	// ──────────────────────────────────────────────────────────────

	describe("happy path (authenticated user)", () => {
		beforeEach(() => {
			setupDefaults();
		});

		it("returns success with newTotal, shipping and shippingInfo", async () => {
			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.newTotal).toBe(5499); // 5000 - 0 + 499
				expect(result.subtotal).toBe(5000);
				expect(result.shipping).toBe(499);
				expect(result.shippingUnavailable).toBe(false);
				expect(result.shippingInfo).toEqual(MOCK_SHIPPING_INFO);
			}
		});

		it("calls stripe.paymentIntents.update with the correct amount", async () => {
			await updatePaymentAmount(VALID_PARAMS);

			expect(mockStripePaymentIntentsUpdate).toHaveBeenCalledWith("pi_test_abc123", {
				amount: 5499,
			});
		});

		it("applies discount when discountAmount is provided", async () => {
			const params = { ...VALID_PARAMS, discountAmount: 1000 };

			const result = await updatePaymentAmount(params);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.newTotal).toBe(4499); // 5000 - 1000 + 499
			}
			expect(mockStripePaymentIntentsUpdate).toHaveBeenCalledWith("pi_test_abc123", {
				amount: 4499,
			});
		});

		it("clamps to STRIPE_MIN_AMOUNT_EUR_CENTS when discount+shipping cancel out", async () => {
			setupShipping(0);
			// Override cart to a 1000-cent total so discount of 1000 fully zeroes the subtotal.
			setupCart(
				{ items: [{ sku: { id: "sku-1" }, quantity: 1, priceAtAdd: 1000 }] },
				{ success: true, data: { sku: { id: "sku-1", priceInclTax: 1000 } } },
			);
			const params = { ...VALID_PARAMS, discountAmount: 1000 };

			const result = await updatePaymentAmount(params);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.newTotal).toBe(50); // STRIPE_MIN_AMOUNT_EUR_CENTS
			}
		});

		it("retrieves the PI from Stripe to verify ownership", async () => {
			await updatePaymentAmount(VALID_PARAMS);

			expect(mockStripePaymentIntentsRetrieve).toHaveBeenCalledWith("pi_test_abc123");
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Underbilling guard — PI already bound to an order (audit P0.1)
	// ──────────────────────────────────────────────────────────────

	describe("underbilling guard (audit P0.1)", () => {
		beforeEach(() => {
			setupDefaults();
		});

		it("refuses the update when PI metadata already carries an orderId", async () => {
			mockStripePaymentIntentsRetrieve.mockResolvedValue({
				id: "pi_test_abc123",
				metadata: { userId: "user-123", guestSessionId: "", orderId: "order-bound" },
			});

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Commande déjà initiée — actualisez la page.");
			}
			expect(mockStripePaymentIntentsUpdate).not.toHaveBeenCalled();
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Store-closure guard
	// ──────────────────────────────────────────────────────────────

	describe("store closure guard (audit P1.3)", () => {
		beforeEach(() => {
			setupDefaults();
		});

		it("returns the closure message when the store is closed for non-admin users", async () => {
			mockAssertStoreOpen.mockResolvedValue({ message: "Boutique fermée." });

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Boutique fermée.");
			}
			expect(mockStripePaymentIntentsUpdate).not.toHaveBeenCalled();
		});

		it("bypasses the closure guard for admins (live checkout testing)", async () => {
			mockGetSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
			mockGetRateLimitIdentifier.mockReturnValue("user:admin-1");
			mockAssertStoreOpen.mockResolvedValue({ message: "Boutique fermée." });
			mockStripePaymentIntentsRetrieve.mockResolvedValue({
				id: "pi_test_abc123",
				metadata: { userId: "admin-1", guestSessionId: "" },
			});

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(true);
			expect(mockAssertStoreOpen).not.toHaveBeenCalled();
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Happy path — guest user
	// ──────────────────────────────────────────────────────────────

	describe("happy path (guest user)", () => {
		beforeEach(() => {
			mockSentryStartSpan.mockImplementation((_opts: unknown, fn: (span: unknown) => unknown) =>
				fn({ setAttribute: vi.fn() }),
			);
			setupGuestUser("session-abc");
			mockAssertStoreOpen.mockResolvedValue(null);
			mockHeaders.mockResolvedValue(new Headers());
			mockGetClientIp.mockResolvedValue("10.0.0.1");
			mockGetRateLimitIdentifier.mockReturnValue("session:session-abc");
			setupRateLimit(true);
			mockStripePaymentIntentsRetrieve.mockResolvedValue(MOCK_PI_GUEST);
			mockStripePaymentIntentsUpdate.mockResolvedValue({ id: "pi_test_abc123", amount: 5499 });
			setupShipping(499);
			setupCart();
		});

		it("returns success for guest with matching sessionId", async () => {
			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.newTotal).toBe(5499);
				expect(result.shippingUnavailable).toBe(false);
			}
		});

		it("updates the PI amount for guest user", async () => {
			await updatePaymentAmount(VALID_PARAMS);

			expect(mockStripePaymentIntentsUpdate).toHaveBeenCalledWith("pi_test_abc123", {
				amount: 5499,
			});
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Auth check
	// ──────────────────────────────────────────────────────────────

	describe("auth check", () => {
		beforeEach(() => {
			mockSentryStartSpan.mockImplementation((_opts: unknown, fn: (span: unknown) => unknown) =>
				fn({ setAttribute: vi.fn() }),
			);
		});

		it("returns error when no userId and no sessionId", async () => {
			mockGetSession.mockResolvedValue(null);
			mockGetOrCreateCartSessionId.mockResolvedValue(null);

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Session invalide.");
			}
		});

		it("does not call Stripe when session is invalid", async () => {
			mockGetSession.mockResolvedValue(null);
			mockGetOrCreateCartSessionId.mockResolvedValue(null);

			await updatePaymentAmount(VALID_PARAMS);

			expect(mockStripePaymentIntentsRetrieve).not.toHaveBeenCalled();
			expect(mockStripePaymentIntentsUpdate).not.toHaveBeenCalled();
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Rate limiting
	// ──────────────────────────────────────────────────────────────

	describe("rate limiting", () => {
		beforeEach(() => {
			setupDefaults();
		});

		it("returns the rate-limit error when the limit is exceeded", async () => {
			setupRateLimit(false, "Trop de tentatives. Veuillez réessayer plus tard.");

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Trop de tentatives. Veuillez réessayer plus tard.");
			}
		});

		it("uses a fallback message when the rate limiter omits one", async () => {
			mockCheckRateLimit.mockResolvedValue({
				success: false,
				remaining: 0,
				limit: 20,
				reset: Date.now() + 300000,
			});

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Trop de tentatives. Veuillez réessayer plus tard.");
			}
		});

		it("does not call Stripe when rate limited", async () => {
			setupRateLimit(false, "Rate limited");

			await updatePaymentAmount(VALID_PARAMS);

			expect(mockStripePaymentIntentsRetrieve).not.toHaveBeenCalled();
			expect(mockStripePaymentIntentsUpdate).not.toHaveBeenCalled();
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Zod validation
	// ──────────────────────────────────────────────────────────────

	describe("input validation", () => {
		beforeEach(() => {
			setupDefaults();
		});

		it("rejects a paymentIntentId that does not start with pi_", async () => {
			const params = { ...VALID_PARAMS, paymentIntentId: "ch_test_abc123" };

			const result = await updatePaymentAmount(params);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Payment Intent ID invalide");
			}
		});

		it("rejects an invalid country code", async () => {
			const params = { ...VALID_PARAMS, country: "US" };

			const result = await updatePaymentAmount(params);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Pays de livraison invalide");
			}
		});

		it("rejects a negative discountAmount", async () => {
			const params = { ...VALID_PARAMS, discountAmount: -50 };

			const result = await updatePaymentAmount(params);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Le montant de réduction ne peut pas être négatif");
			}
		});

		it("accepts zero discountAmount as valid", async () => {
			const result = await updatePaymentAmount({ ...VALID_PARAMS, discountAmount: 0 });

			expect(result.success).toBe(true);
		});

		it("accepts an empty postalCode (uses default)", async () => {
			const result = await updatePaymentAmount({ ...VALID_PARAMS, postalCode: "" });

			expect(result.success).toBe(true);
		});

		it("returns an error when params are entirely missing", async () => {
			const result = await updatePaymentAmount(null);

			expect(result.success).toBe(false);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Cart re-validation (audit P0.1)
	// ──────────────────────────────────────────────────────────────

	describe("server-side cart re-validation (audit P0.1)", () => {
		beforeEach(() => {
			setupDefaults();
		});

		it("returns an error when the cart is empty", async () => {
			setupCart({ items: [] }, MOCK_SKU_RESULT_5000);

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Panier vide ou introuvable.");
			}
		});

		it("returns an error when a SKU is unavailable", async () => {
			mockGetSkuDetails.mockResolvedValue({ success: false, error: "Not found" });

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Certains articles ne sont plus disponibles.");
			}
		});

		it("returns an error when the SKU price changed since cart add", async () => {
			setupCart(MOCK_CART_5000, {
				success: true,
				data: { sku: { id: "sku-1", priceInclTax: 9999 } },
			});

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(
					"Les prix de certains articles ont changé. Actualisez votre panier.",
				);
			}
		});

		it("returns an error when discountAmount exceeds the recomputed subtotal", async () => {
			const result = await updatePaymentAmount({ ...VALID_PARAMS, discountAmount: 6000 });

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Le montant de réduction ne peut pas dépasser le sous-total.");
			}
		});
	});

	// ──────────────────────────────────────────────────────────────
	// PI ownership verification
	// ──────────────────────────────────────────────────────────────

	describe("PI ownership", () => {
		beforeEach(() => {
			setupDefaults();
			setupShipping(499);
		});

		it("rejects when PI userId does not match the authenticated user", async () => {
			mockStripePaymentIntentsRetrieve.mockResolvedValue({
				id: "pi_test_abc123",
				metadata: { userId: "user-999", guestSessionId: "" },
			});

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Accès non autorisé au paiement.");
			}
		});

		it("rejects when PI guestSessionId does not match the current sessionId", async () => {
			mockSentryStartSpan.mockImplementation((_opts: unknown, fn: (span: unknown) => unknown) =>
				fn({ setAttribute: vi.fn() }),
			);
			setupGuestUser("session-abc");
			mockAssertStoreOpen.mockResolvedValue(null);
			mockHeaders.mockResolvedValue(new Headers());
			mockGetClientIp.mockResolvedValue("10.0.0.1");
			mockGetRateLimitIdentifier.mockReturnValue("session:session-abc");
			setupRateLimit(true);
			setupShipping(499);
			setupCart();
			mockStripePaymentIntentsRetrieve.mockResolvedValue({
				id: "pi_test_abc123",
				metadata: { userId: "", guestSessionId: "session-xyz" },
			});

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Accès non autorisé au paiement.");
			}
		});

		it("rejects when authenticated user tries to access a guest PI", async () => {
			mockStripePaymentIntentsRetrieve.mockResolvedValue({
				id: "pi_test_abc123",
				metadata: { userId: "", guestSessionId: "session-abc" },
			});

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Accès non autorisé au paiement.");
			}
		});

		it("does not call stripe.paymentIntents.update on ownership mismatch", async () => {
			mockStripePaymentIntentsRetrieve.mockResolvedValue({
				id: "pi_test_abc123",
				metadata: { userId: "user-other", guestSessionId: "" },
			});

			await updatePaymentAmount(VALID_PARAMS);

			expect(mockStripePaymentIntentsUpdate).not.toHaveBeenCalled();
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Shipping unavailable
	// ──────────────────────────────────────────────────────────────

	describe("shipping unavailable", () => {
		beforeEach(() => {
			setupDefaults();
			setupShipping(null);
		});

		it("returns success with shippingUnavailable=true when shipping is null", async () => {
			const result = await updatePaymentAmount({ ...VALID_PARAMS, postalCode: "20000" });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.shippingUnavailable).toBe(true);
				expect(result.shipping).toBe(0);
			}
		});

		it("does not call stripe.paymentIntents.update when shipping is unavailable", async () => {
			await updatePaymentAmount({ ...VALID_PARAMS, postalCode: "20000" });

			expect(mockStripePaymentIntentsUpdate).not.toHaveBeenCalled();
		});

		it("still computes newTotal as subtotal - discount when shipping unavailable", async () => {
			const params = { ...VALID_PARAMS, discountAmount: 500, postalCode: "20000" };

			const result = await updatePaymentAmount(params);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.newTotal).toBe(4500); // 5000 - 500 + 0
			}
		});

		it("returns shippingInfo=null when shipping is unavailable", async () => {
			const result = await updatePaymentAmount({ ...VALID_PARAMS, postalCode: "20000" });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.shippingInfo).toBeNull();
			}
		});
	});

	// ──────────────────────────────────────────────────────────────
	// EU country shipping
	// ──────────────────────────────────────────────────────────────

	describe("EU country shipping", () => {
		beforeEach(() => {
			setupDefaults();
			setupShipping(950);
		});

		it("calculates shipping for EU country", async () => {
			const params = { ...VALID_PARAMS, country: "BE" };

			const result = await updatePaymentAmount(params);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.shipping).toBe(950);
				expect(result.newTotal).toBe(5950); // 5000 - 0 + 950
			}
		});
	});

	// ──────────────────────────────────────────────────────────────
	// CircuitBreakerError
	// ──────────────────────────────────────────────────────────────

	describe("CircuitBreakerError", () => {
		beforeEach(() => {
			setupDefaults();
		});

		it("returns service-unavailable when CircuitBreakerError is thrown on retrieve", async () => {
			mockStripePaymentIntentsRetrieve.mockRejectedValue(new MockCircuitBreakerError("Stripe"));

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Service de paiement temporairement indisponible.");
			}
		});

		it("returns service-unavailable when CircuitBreakerError is thrown on update", async () => {
			mockStripePaymentIntentsUpdate.mockRejectedValue(new MockCircuitBreakerError("Stripe"));

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Service de paiement temporairement indisponible.");
			}
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Generic Stripe error
	// ──────────────────────────────────────────────────────────────

	describe("generic Stripe error", () => {
		beforeEach(() => {
			setupDefaults();
		});

		it("returns a generic error on unexpected exception during retrieve", async () => {
			mockStripePaymentIntentsRetrieve.mockRejectedValue(new Error("Network timeout"));

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Erreur lors de la mise à jour du montant.");
			}
		});

		it("returns a generic error on unexpected exception during update", async () => {
			mockStripePaymentIntentsUpdate.mockRejectedValue(new Error("Stripe API error"));

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Erreur lors de la mise à jour du montant.");
			}
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Rate limit identifier logic
	// ──────────────────────────────────────────────────────────────

	describe("rate limit identifier", () => {
		beforeEach(() => {
			mockSentryStartSpan.mockImplementation((_opts: unknown, fn: (span: unknown) => unknown) =>
				fn({ setAttribute: vi.fn() }),
			);
			mockAssertStoreOpen.mockResolvedValue(null);
			setupShipping(499);
			setupCart();
		});

		it("uses a user-based identifier for authenticated users", async () => {
			setupAuthenticatedUser("user-456");
			mockHeaders.mockResolvedValue(new Headers());
			mockGetClientIp.mockResolvedValue("192.168.1.1");
			mockGetRateLimitIdentifier.mockReturnValue("user:user-456");
			setupRateLimit(true);
			mockStripePaymentIntentsRetrieve.mockResolvedValue({
				id: "pi_test_abc123",
				metadata: { userId: "user-456", guestSessionId: "" },
			});

			await updatePaymentAmount(VALID_PARAMS);

			expect(mockCheckRateLimit).toHaveBeenCalledWith(
				"update-amount:user:user-456",
				expect.any(Object),
				"192.168.1.1",
			);
		});

		it("uses getRateLimitIdentifier for guest users", async () => {
			setupGuestUser("session-xyz");
			mockHeaders.mockResolvedValue(new Headers());
			mockGetClientIp.mockResolvedValue("10.0.0.5");
			mockGetRateLimitIdentifier.mockReturnValue("session:session-xyz");
			setupRateLimit(true);
			mockStripePaymentIntentsRetrieve.mockResolvedValue({
				id: "pi_test_abc123",
				metadata: { userId: "", guestSessionId: "session-xyz" },
			});

			await updatePaymentAmount(VALID_PARAMS);

			expect(mockGetRateLimitIdentifier).toHaveBeenCalledWith(null, "session-xyz", "10.0.0.5");
			expect(mockCheckRateLimit).toHaveBeenCalledWith(
				"session:session-xyz",
				expect.any(Object),
				"10.0.0.5",
			);
		});
	});
});
