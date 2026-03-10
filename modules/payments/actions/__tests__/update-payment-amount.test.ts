import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockGetSession,
	mockGetOrCreateCartSessionId,
	mockCheckRateLimit,
	mockGetClientIp,
	mockGetRateLimitIdentifier,
	mockHeaders,
	mockStripePaymentIntentsRetrieve,
	mockStripePaymentIntentsUpdate,
	mockCalculateShipping,
	mockGetShippingInfo,
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
		mockCheckRateLimit: vi.fn(),
		mockGetClientIp: vi.fn(),
		mockGetRateLimitIdentifier: vi.fn(),
		mockHeaders: vi.fn(),
		mockStripePaymentIntentsRetrieve: vi.fn(),
		mockStripePaymentIntentsUpdate: vi.fn(),
		mockCalculateShipping: vi.fn(),
		mockGetShippingInfo: vi.fn(),
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
	CircuitBreakerError: MockCircuitBreakerError,
}));

vi.mock("@/modules/orders/services/shipping.service", () => ({
	calculateShipping: mockCalculateShipping,
	getShippingInfo: mockGetShippingInfo,
}));

vi.mock("@/shared/constants/countries", () => ({
	SHIPPING_COUNTRIES: ["FR", "BE", "DE", "MC", "IT", "ES"] as const,
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
	subtotal: 5000,
	country: "FR",
	postalCode: "75001",
	discountAmount: 0,
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
	mockGetSession.mockResolvedValue({ user: { id: userId } });
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

function setupDefaults(userId = "user-123") {
	setupAuthenticatedUser(userId);
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

		it("should return success with newTotal, shipping and shippingInfo", async () => {
			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.newTotal).toBe(5499); // 5000 - 0 + 499
				expect(result.shipping).toBe(499);
				expect(result.shippingUnavailable).toBe(false);
				expect(result.shippingInfo).toEqual(MOCK_SHIPPING_INFO);
			}
		});

		it("should call stripe.paymentIntents.update with correct amount", async () => {
			await updatePaymentAmount(VALID_PARAMS);

			expect(mockStripePaymentIntentsUpdate).toHaveBeenCalledWith("pi_test_abc123", {
				amount: 5499,
			});
		});

		it("should apply discount when discountAmount is provided", async () => {
			const params = { ...VALID_PARAMS, subtotal: 5000, discountAmount: 1000 };

			const result = await updatePaymentAmount(params);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.newTotal).toBe(4499); // 5000 - 1000 + 499
			}
			expect(mockStripePaymentIntentsUpdate).toHaveBeenCalledWith("pi_test_abc123", {
				amount: 4499,
			});
		});

		it("should not exceed minimum of 0 when discount+shipping results in negative", async () => {
			// Normally guarded by discountAmount <= subtotal, but shipping could still push to 0
			setupShipping(0);
			const params = { ...VALID_PARAMS, subtotal: 1000, discountAmount: 1000 };

			const result = await updatePaymentAmount(params);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.newTotal).toBe(0); // Math.max(0, 1000 - 1000 + 0)
			}
		});

		it("should retrieve PI from Stripe to verify ownership", async () => {
			await updatePaymentAmount(VALID_PARAMS);

			expect(mockStripePaymentIntentsRetrieve).toHaveBeenCalledWith("pi_test_abc123");
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Happy path — guest user
	// ──────────────────────────────────────────────────────────────

	describe("happy path (guest user)", () => {
		beforeEach(() => {
			setupGuestUser("session-abc");
			mockHeaders.mockResolvedValue(new Headers());
			mockGetClientIp.mockResolvedValue("10.0.0.1");
			mockGetRateLimitIdentifier.mockReturnValue("session:session-abc");
			setupRateLimit(true);
			mockStripePaymentIntentsRetrieve.mockResolvedValue(MOCK_PI_GUEST);
			mockStripePaymentIntentsUpdate.mockResolvedValue({ id: "pi_test_abc123", amount: 5499 });
			setupShipping(499);
		});

		it("should return success for guest user with valid sessionId", async () => {
			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.newTotal).toBe(5499);
				expect(result.shippingUnavailable).toBe(false);
			}
		});

		it("should update PI amount for guest user", async () => {
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
		it("should return error when no userId and no sessionId", async () => {
			mockGetSession.mockResolvedValue(null);
			mockGetOrCreateCartSessionId.mockResolvedValue(null);

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Session invalide.");
			}
		});

		it("should not call Stripe when session is invalid", async () => {
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
			setupAuthenticatedUser();
			mockHeaders.mockResolvedValue(new Headers());
			mockGetClientIp.mockResolvedValue("192.168.1.1");
			mockGetRateLimitIdentifier.mockReturnValue("user:user-123");
		});

		it("should return rate limit error when limit exceeded", async () => {
			setupRateLimit(false, "Trop de tentatives. Veuillez réessayer plus tard.");

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Trop de tentatives. Veuillez réessayer plus tard.");
			}
		});

		it("should return fallback error when rate limit has no error message", async () => {
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

		it("should not call Stripe when rate limited", async () => {
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

		it("should return validation error when paymentIntentId does not start with pi_", async () => {
			const params = { ...VALID_PARAMS, paymentIntentId: "ch_test_abc123" };

			const result = await updatePaymentAmount(params);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Payment Intent ID invalide");
			}
		});

		it("should return validation error for negative subtotal", async () => {
			const params = { ...VALID_PARAMS, subtotal: -100 };

			const result = await updatePaymentAmount(params);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Le sous-total doit être positif");
			}
		});

		it("should return validation error for invalid country", async () => {
			const params = { ...VALID_PARAMS, country: "US" };

			const result = await updatePaymentAmount(params);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Pays de livraison invalide");
			}
		});

		it("should return validation error for negative discountAmount", async () => {
			const params = { ...VALID_PARAMS, discountAmount: -50 };

			const result = await updatePaymentAmount(params);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Le montant de réduction doit être positif");
			}
		});

		it("should accept zero subtotal as valid", async () => {
			const params = { ...VALID_PARAMS, subtotal: 0, discountAmount: 0 };

			const result = await updatePaymentAmount(params);

			expect(result.success).toBe(true);
		});

		it("should accept zero discountAmount as valid", async () => {
			const result = await updatePaymentAmount({ ...VALID_PARAMS, discountAmount: 0 });

			expect(result.success).toBe(true);
		});

		it("should accept empty string postalCode (uses default)", async () => {
			const params = { ...VALID_PARAMS, postalCode: "" };

			const result = await updatePaymentAmount(params);

			expect(result.success).toBe(true);
		});

		it("should return error for missing params entirely", async () => {
			const result = await updatePaymentAmount(null);

			expect(result.success).toBe(false);
		});

		it("should not call Stripe when validation fails", async () => {
			await updatePaymentAmount({ ...VALID_PARAMS, paymentIntentId: "invalid" });

			expect(mockStripePaymentIntentsRetrieve).not.toHaveBeenCalled();
			expect(mockStripePaymentIntentsUpdate).not.toHaveBeenCalled();
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Discount vs subtotal validation
	// ──────────────────────────────────────────────────────────────

	describe("discountAmount vs subtotal", () => {
		beforeEach(() => {
			setupDefaults();
		});

		it("should return error when discountAmount exceeds subtotal", async () => {
			const params = { ...VALID_PARAMS, subtotal: 1000, discountAmount: 1500 };

			const result = await updatePaymentAmount(params);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Le montant de réduction ne peut pas dépasser le sous-total.");
			}
		});

		it("should accept discountAmount equal to subtotal", async () => {
			setupShipping(499);
			const params = { ...VALID_PARAMS, subtotal: 1000, discountAmount: 1000 };

			const result = await updatePaymentAmount(params);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.newTotal).toBe(499); // 0 + 499
			}
		});

		it("should not retrieve PI when discountAmount exceeds subtotal", async () => {
			const params = { ...VALID_PARAMS, subtotal: 500, discountAmount: 1000 };

			await updatePaymentAmount(params);

			expect(mockStripePaymentIntentsRetrieve).not.toHaveBeenCalled();
		});
	});

	// ──────────────────────────────────────────────────────────────
	// PI ownership verification
	// ──────────────────────────────────────────────────────────────

	describe("PI ownership", () => {
		beforeEach(() => {
			mockHeaders.mockResolvedValue(new Headers());
			mockGetClientIp.mockResolvedValue("192.168.1.1");
			setupRateLimit(true);
			setupShipping(499);
		});

		it("should return error when PI userId does not match authenticated user", async () => {
			setupAuthenticatedUser("user-123");
			mockGetRateLimitIdentifier.mockReturnValue("user:user-123");
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

		it("should return error when PI guestSessionId does not match current sessionId", async () => {
			setupGuestUser("session-abc");
			mockGetRateLimitIdentifier.mockReturnValue("session:session-abc");
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

		it("should return error when authenticated user tries to access guest PI", async () => {
			setupAuthenticatedUser("user-123");
			mockGetRateLimitIdentifier.mockReturnValue("user:user-123");
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

		it("should not call stripe.paymentIntents.update on ownership mismatch", async () => {
			setupAuthenticatedUser("user-123");
			mockGetRateLimitIdentifier.mockReturnValue("user:user-123");
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

		it("should return success with shippingUnavailable=true when shipping is null", async () => {
			const result = await updatePaymentAmount({ ...VALID_PARAMS, postalCode: "20000" });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.shippingUnavailable).toBe(true);
				expect(result.shipping).toBe(0);
			}
		});

		it("should NOT call stripe.paymentIntents.update when shipping is unavailable", async () => {
			await updatePaymentAmount({ ...VALID_PARAMS, postalCode: "20000" });

			expect(mockStripePaymentIntentsUpdate).not.toHaveBeenCalled();
		});

		it("should still return newTotal calculated as subtotal - discount when shipping unavailable", async () => {
			const params = { ...VALID_PARAMS, subtotal: 5000, discountAmount: 500, postalCode: "20000" };

			const result = await updatePaymentAmount(params);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.newTotal).toBe(4500); // Math.max(0, 5000 - 500 + 0)
			}
		});

		it("should return shippingInfo as null when shipping is unavailable", async () => {
			const result = await updatePaymentAmount({ ...VALID_PARAMS, postalCode: "20000" });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.shippingInfo).toBeNull();
			}
		});
	});

	// ──────────────────────────────────────────────────────────────
	// EU shipping
	// ──────────────────────────────────────────────────────────────

	describe("EU country shipping", () => {
		beforeEach(() => {
			setupDefaults();
			mockStripePaymentIntentsRetrieve.mockResolvedValue({
				id: "pi_test_abc123",
				metadata: { userId: "user-123", guestSessionId: "" },
			});
			setupShipping(950);
		});

		it("should calculate shipping for EU country", async () => {
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

		it("should return service unavailable error when CircuitBreakerError is thrown on retrieve", async () => {
			mockStripePaymentIntentsRetrieve.mockRejectedValue(new MockCircuitBreakerError("Stripe"));

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Service de paiement temporairement indisponible.");
			}
		});

		it("should return service unavailable error when CircuitBreakerError is thrown on update", async () => {
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

		it("should return generic error message on unexpected exception during retrieve", async () => {
			mockStripePaymentIntentsRetrieve.mockRejectedValue(new Error("Network timeout"));

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Erreur lors de la mise à jour du montant.");
			}
		});

		it("should return generic error message on unexpected exception during update", async () => {
			mockStripePaymentIntentsUpdate.mockRejectedValue(new Error("Stripe API error"));

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Erreur lors de la mise à jour du montant.");
			}
		});

		it("should return generic error and not service unavailable for non-CircuitBreaker errors", async () => {
			mockStripePaymentIntentsRetrieve.mockRejectedValue(new Error("Some random error"));

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).not.toBe("Service de paiement temporairement indisponible.");
				expect(result.error).toBe("Erreur lors de la mise à jour du montant.");
			}
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Rate limit identifier logic
	// ──────────────────────────────────────────────────────────────

	describe("rate limit identifier", () => {
		it("should use user-based identifier for authenticated users", async () => {
			setupDefaults("user-456");
			mockGetRateLimitIdentifier.mockReturnValue("user:user-456");
			mockStripePaymentIntentsRetrieve.mockResolvedValue({
				id: "pi_test_abc123",
				metadata: { userId: "user-456", guestSessionId: "" },
			});

			await updatePaymentAmount(VALID_PARAMS);

			expect(mockCheckRateLimit).toHaveBeenCalledWith(
				"update-amount:user:user-456",
				expect.any(Object),
				expect.any(String),
			);
		});

		it("should use getRateLimitIdentifier for guest users", async () => {
			setupGuestUser("session-xyz");
			mockHeaders.mockResolvedValue(new Headers());
			mockGetClientIp.mockResolvedValue("10.0.0.5");
			mockGetRateLimitIdentifier.mockReturnValue("session:session-xyz");
			setupRateLimit(true);
			mockStripePaymentIntentsRetrieve.mockResolvedValue({
				id: "pi_test_abc123",
				metadata: { userId: "", guestSessionId: "session-xyz" },
			});
			mockStripePaymentIntentsUpdate.mockResolvedValue({});
			setupShipping(499);

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
