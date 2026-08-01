import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockGetSession,
	mockGetOrCreateCartSessionId,
	mockGetCart,
	mockGetSkuDetails,
	mockValidateCartItemsWithDb,
	mockAssertStoreOpen,
	mockCheckRateLimit,
	mockGetClientIp,
	mockGetRateLimitIdentifier,
	mockHeaders,
	mockStripePaymentIntentsRetrieve,
	mockStripePaymentIntentsUpdate,
	mockDiscountFindFirst,
	mockUserFindUnique,
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
		mockValidateCartItemsWithDb: vi.fn(),
		mockAssertStoreOpen: vi.fn(),
		mockCheckRateLimit: vi.fn(),
		mockGetClientIp: vi.fn(),
		mockGetRateLimitIdentifier: vi.fn(),
		mockHeaders: vi.fn(),
		mockStripePaymentIntentsRetrieve: vi.fn(),
		mockStripePaymentIntentsUpdate: vi.fn(),
		mockDiscountFindFirst: vi.fn(),
		// isVerifiedAdmin (require-auth réel, non mocké) re-vérifie le rôle en DB
		// via prisma.user.findUnique — nécessaire pour le bypass admin de la garde
		// boutique fermée.
		mockUserFindUnique: vi.fn(),
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
	validateCartItemsWithDb: mockValidateCartItemsWithDb,
}));

vi.mock("@/modules/store-settings/services/store-closure-guard", () => ({
	assertStoreOpen: mockAssertStoreOpen,
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		discount: { findFirst: mockDiscountFindFirst },
		user: { findUnique: mockUserFindUnique },
	},
	notDeleted: { deletedAt: null },
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
	// Requis depuis que `shippingCountrySchema` (SSOT `shared/schemas/address.schema`)
	// remplace le `z.enum(SHIPPING_COUNTRIES, …)` inline : un mock partiel de ce
	// module fait échouer l'import du schéma, pas seulement une assertion.
	COUNTRY_ERROR_MESSAGE: "Pays de livraison invalide",
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
	discountCode: null,
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
	// `status` requis : la garde CHECKOUT-PI-STATE-001 refuse tout PI qui n'est plus
	// ouvert à la saisie. Un fixture sans statut faisait échouer 20 tests d'un coup.
	status: "requires_payment_method",
	metadata: {
		userId: "cm3user0000123qz8v4h2j9d3",
		guestSessionId: "",
	},
};

const MOCK_PI_GUEST = {
	id: "pi_test_abc123",
	status: "requires_payment_method",
	metadata: {
		userId: "",
		guestSessionId: "6f9619ff-8b86-4d11-b42d-00c04fc964ff",
	},
};

/** Code promo éligible — remise fixe de 1000 c (audit F1 : dérivée serveur). */
const MOCK_DISCOUNT_FIXED_1000 = {
	id: "discount-1",
	code: "PROMO10",
	type: "FIXED_AMOUNT",
	value: 1000,
	minOrderAmount: null,
	maxUsageCount: null,
	maxUsagePerUser: null,
	usageCount: 0,
	isActive: true,
	startsAt: new Date("2020-01-01"),
	endsAt: null,
};

const MOCK_SHIPPING_INFO = {
	amount: 499,
	displayName: "Livraison France (2-3 jours)",
	estimatedDays: "2-3",
};

// ============================================================================
// HELPERS
// ============================================================================

function setupAuthenticatedUser(userId = "cm3user0000123qz8v4h2j9d3") {
	mockGetSession.mockResolvedValue({ user: { id: userId, role: "USER" } });
}

function setupGuestUser(sessionId = "6f9619ff-8b86-4d11-b42d-00c04fc964ff") {
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
	// CHECKOUT-STOCK-GATE-001 : parité avec initializePayment.
	mockValidateCartItemsWithDb.mockResolvedValue({ success: true, data: [] });
}

function setupDefaults(userId = "cm3user0000123qz8v4h2j9d3") {
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
	mockDiscountFindFirst.mockResolvedValue(null);
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

		it("applies the server-derived discount when an eligible code is provided", async () => {
			mockDiscountFindFirst.mockResolvedValue(MOCK_DISCOUNT_FIXED_1000);
			const params = { ...VALID_PARAMS, discountCode: "promo10" };

			const result = await updatePaymentAmount(params);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.newTotal).toBe(4499); // 5000 - 1000 + 499
			}
			expect(mockStripePaymentIntentsUpdate).toHaveBeenCalledWith("pi_test_abc123", {
				amount: 4499,
			});
			// Lookup normalisé en majuscules (aligné order-creation).
			expect(mockDiscountFindFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({ code: "PROMO10" }),
				}),
			);
		});

		it("clamps to STRIPE_MIN_AMOUNT_EUR_CENTS when discount+shipping cancel out", async () => {
			setupShipping(0);
			// Override cart to a 1000-cent total so the fixed 1000-cent discount fully zeroes the subtotal.
			setupCart(
				{ items: [{ sku: { id: "sku-1" }, quantity: 1, priceAtAdd: 1000 }] },
				{ success: true, data: { sku: { id: "sku-1", priceInclTax: 1000 } } },
			);
			mockDiscountFindFirst.mockResolvedValue(MOCK_DISCOUNT_FIXED_1000);
			const params = { ...VALID_PARAMS, discountCode: "PROMO10" };

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
				status: "requires_payment_method",
				metadata: {
					userId: "cm3user0000123qz8v4h2j9d3",
					guestSessionId: "",
					orderId: "order-bound",
				},
			});

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Commande déjà initiée — actualise la page.");
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
			mockGetSession.mockResolvedValue({
				user: { id: "cm3admin000001qz8v4h2j9d3", role: "ADMIN" },
			});
			// isVerifiedAdmin re-vérifie le rôle en DB (cookie-cache Better Auth stale).
			mockUserFindUnique.mockResolvedValue({ role: "ADMIN" });
			mockGetRateLimitIdentifier.mockReturnValue("user:cm3admin000001qz8v4h2j9d3");
			mockAssertStoreOpen.mockResolvedValue({ message: "Boutique fermée." });
			mockStripePaymentIntentsRetrieve.mockResolvedValue({
				id: "pi_test_abc123",
				status: "requires_payment_method",
				metadata: { userId: "cm3admin000001qz8v4h2j9d3", guestSessionId: "" },
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
			setupGuestUser("6f9619ff-8b86-4d11-b42d-00c04fc964ff");
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

		it("rejects a non-string discountCode", async () => {
			const params = { ...VALID_PARAMS, discountCode: 1000 };

			const result = await updatePaymentAmount(params);

			expect(result.success).toBe(false);
		});

		it("accepts a null discountCode as valid", async () => {
			const result = await updatePaymentAmount({ ...VALID_PARAMS, discountCode: null });

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

		// CHECKOUT-STOCK-GATE-001 : `getSkuDetails` ci-dessus ne lit pas `inventory`.
		// Sans ces cas, le défaut « stock suffisant » du beforeEach masquerait la garde.
		it("refuse la mise à jour du montant quand une ligne dépasse le stock", async () => {
			mockValidateCartItemsWithDb.mockResolvedValue({
				success: false,
				error: "Validation échouée",
				data: [{ skuId: "sku-1", isValid: false, error: "Stock insuffisant" }],
			});

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Stock insuffisant");
			}
			expect(mockStripePaymentIntentsUpdate).not.toHaveBeenCalled();
		});

		it("interroge la garde de stock avec les quantités du panier serveur", async () => {
			await updatePaymentAmount(VALID_PARAMS);

			// Les quantités viennent du panier SERVEUR (jamais du client ici) : c'est
			// l'information sans laquelle `inventory < quantity` est incalculable.
			expect(mockValidateCartItemsWithDb).toHaveBeenCalledWith({
				items: [{ skuId: "sku-1", quantity: 2 }],
			});
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
					"Les prix de certains articles ont changé. Actualise ton panier.",
				);
			}
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Server-side discount derivation (audit F1)
	// ──────────────────────────────────────────────────────────────

	describe("server-side discount derivation (audit F1)", () => {
		beforeEach(() => {
			setupDefaults();
		});

		it("ignores a legacy/malicious numeric discountAmount field — full price applied", async () => {
			// Ancien contrat : le client envoyait un montant arbitraire. Le champ est
			// désormais inconnu du schéma (strippé par Zod) — aucune minoration possible.
			const result = await updatePaymentAmount({ ...VALID_PARAMS, discountAmount: 4999 });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.newTotal).toBe(5499); // 5000 + 499, remise ignorée
			}
			expect(mockStripePaymentIntentsUpdate).toHaveBeenCalledWith("pi_test_abc123", {
				amount: 5499,
			});
		});

		it("applies zero discount when the code is unknown", async () => {
			mockDiscountFindFirst.mockResolvedValue(null);

			const result = await updatePaymentAmount({ ...VALID_PARAMS, discountCode: "NOPE" });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.newTotal).toBe(5499);
			}
		});

		it("applies zero discount when the code is ineligible (expired)", async () => {
			mockDiscountFindFirst.mockResolvedValue({
				...MOCK_DISCOUNT_FIXED_1000,
				endsAt: new Date("2021-01-01"),
			});

			const result = await updatePaymentAmount({ ...VALID_PARAMS, discountCode: "PROMO10" });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.newTotal).toBe(5499);
			}
		});

		it("derives a percentage discount from the cart, excluding sale items", async () => {
			mockDiscountFindFirst.mockResolvedValue({
				...MOCK_DISCOUNT_FIXED_1000,
				type: "PERCENTAGE",
				value: 10,
			});

			const result = await updatePaymentAmount({ ...VALID_PARAMS, discountCode: "PROMO10" });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.newTotal).toBe(4999); // 5000 - 10% + 499
			}
		});

		it("does not query the discount table when no code is provided", async () => {
			await updatePaymentAmount(VALID_PARAMS);

			expect(mockDiscountFindFirst).not.toHaveBeenCalled();
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
				status: "requires_payment_method",
				metadata: { userId: "cm3user0000999qz8v4h2j9d3", guestSessionId: "" },
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
			setupGuestUser("6f9619ff-8b86-4d11-b42d-00c04fc964ff");
			mockAssertStoreOpen.mockResolvedValue(null);
			mockHeaders.mockResolvedValue(new Headers());
			mockGetClientIp.mockResolvedValue("10.0.0.1");
			mockGetRateLimitIdentifier.mockReturnValue("session:session-abc");
			setupRateLimit(true);
			setupShipping(499);
			setupCart();
			mockStripePaymentIntentsRetrieve.mockResolvedValue({
				id: "pi_test_abc123",
				status: "requires_payment_method",
				metadata: { userId: "", guestSessionId: "550e8400-e29b-41d4-a716-446655440000" },
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
				status: "requires_payment_method",
				metadata: { userId: "", guestSessionId: "6f9619ff-8b86-4d11-b42d-00c04fc964ff" },
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
				status: "requires_payment_method",
				metadata: { userId: "cm3userother00qz8v4h2j9d3", guestSessionId: "" },
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
			mockDiscountFindFirst.mockResolvedValue({
				...MOCK_DISCOUNT_FIXED_1000,
				type: "PERCENTAGE",
				value: 10,
			});
			const params = { ...VALID_PARAMS, discountCode: "PROMO10", postalCode: "20000" };

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

	// ──────────────────────────────────────────────────────────────
	// CHECKOUT-PI-STATE-001 — état du PaymentIntent
	// ──────────────────────────────────────────────────────────────

	describe("état du PaymentIntent", () => {
		beforeEach(() => {
			setupDefaults();
		});

		it.each([
			["succeeded", /déjà été effectué/i],
			["canceled", /a été annulé/i],
			["processing", /en cours de traitement/i],
			["requires_capture", /en cours de traitement/i],
		])("refuse la mise à jour sur un PI %s, avec le motif réel", async (status, expected) => {
			// Sans cette garde, `stripe.paymentIntents.update` levait une
			// StripeInvalidRequestError que le catch global traduisait en « Erreur lors de la
			// mise à jour du montant » — un message qui ne dit rien et pousse à réessayer.
			mockStripePaymentIntentsRetrieve.mockResolvedValue({
				id: "pi_test_abc123",
				status,
				metadata: { userId: "cm3user0000123qz8v4h2j9d3", guestSessionId: "" },
			});

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			expect((result as { error: string }).error).toMatch(expected);
			// On sort AVANT de solliciter Stripe pour rien.
			expect(mockStripePaymentIntentsUpdate).not.toHaveBeenCalled();
		});

		it.each(["requires_payment_method", "requires_confirmation", "requires_action"])(
			"laisse passer un PI %s (encore ouvert à la saisie)",
			async (status) => {
				// `requires_action` compte : un 3DS en cours dans un autre onglet ne doit pas
				// empêcher la mise à jour du montant, Stripe l'accepte.
				mockStripePaymentIntentsRetrieve.mockResolvedValue({
					id: "pi_test_abc123",
					status,
					metadata: { userId: "cm3user0000123qz8v4h2j9d3", guestSessionId: "" },
				});

				const result = await updatePaymentAmount(VALID_PARAMS);

				expect(result.success).toBe(true);
				expect(mockStripePaymentIntentsUpdate).toHaveBeenCalled();
			},
		);

		it("teste l'état APRÈS l'ownership — on ne révèle pas l'état du PI d'un tiers", async () => {
			// Ordre des gardes : un PI qui n'appartient pas à l'appelant doit répondre
			// « accès non autorisé », jamais « ce paiement a déjà été effectué » (ce qui
			// confirmerait à un attaquant qu'il a deviné un PI valide et encaissé).
			mockStripePaymentIntentsRetrieve.mockResolvedValue({
				id: "pi_test_abc123",
				status: "succeeded",
				metadata: { userId: "cm3userother00qz8v4h2j9d3", guestSessionId: "" },
			});

			const result = await updatePaymentAmount(VALID_PARAMS);

			expect(result.success).toBe(false);
			expect((result as { error: string }).error).toMatch(/non autorisé/i);
		});
	});

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
			setupAuthenticatedUser("cm3user0000456qz8v4h2j9d3");
			mockHeaders.mockResolvedValue(new Headers());
			mockGetClientIp.mockResolvedValue("192.168.1.1");
			mockGetRateLimitIdentifier.mockReturnValue("user:cm3user0000456qz8v4h2j9d3");
			setupRateLimit(true);
			mockStripePaymentIntentsRetrieve.mockResolvedValue({
				id: "pi_test_abc123",
				status: "requires_payment_method",
				metadata: { userId: "cm3user0000456qz8v4h2j9d3", guestSessionId: "" },
			});

			await updatePaymentAmount(VALID_PARAMS);

			expect(mockCheckRateLimit).toHaveBeenCalledWith(
				"update-amount:user:cm3user0000456qz8v4h2j9d3",
				expect.any(Object),
				"192.168.1.1",
			);
		});

		it("préfixe aussi l de repli session/IP des invités", async () => {
			setupGuestUser("550e8400-e29b-41d4-a716-446655440000");
			mockHeaders.mockResolvedValue(new Headers());
			mockGetClientIp.mockResolvedValue("10.0.0.5");
			mockGetRateLimitIdentifier.mockReturnValue("session:session-xyz");
			setupRateLimit(true);
			mockStripePaymentIntentsRetrieve.mockResolvedValue({
				id: "pi_test_abc123",
				status: "requires_payment_method",
				metadata: { userId: "", guestSessionId: "550e8400-e29b-41d4-a716-446655440000" },
			});

			await updatePaymentAmount(VALID_PARAMS);

			expect(mockGetRateLimitIdentifier).toHaveBeenCalledWith(
				null,
				"550e8400-e29b-41d4-a716-446655440000",
				"10.0.0.5",
			);
			expect(mockCheckRateLimit).toHaveBeenCalledWith(
				"update-amount:session:session-xyz",
				expect.any(Object),
				"10.0.0.5",
			);
		});
	});
});
