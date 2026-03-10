import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockGetSession,
	mockGetOrCreateCartSessionId,
	mockGetCartInvalidationTags,
	mockCheckRateLimit,
	mockGetClientIp,
	mockGetRateLimitIdentifier,
	mockHeaders,
	mockUpdateTag,
	mockGetSkuDetails,
	mockGetOrCreateStripeCustomer,
	mockCreateOrderInTransaction,
	mockBuildStripeLineItems,
	mockSubscribeToNewsletterInternal,
	mockStripe,
	mockCircuitBreakerErrorClass,
	mockSentryStartSpan,
	mockSentryCaptureException,
} = vi.hoisted(() => {
	const CircuitBreakerErrorClass = class CircuitBreakerError extends Error {
		constructor(name: string) {
			super(`Circuit breaker OPEN for ${name}`);
			this.name = "CircuitBreakerError";
		}
	};

	return {
		mockPrisma: {
			order: {
				findUnique: vi.fn(),
				delete: vi.fn(),
			},
			user: {
				findUnique: vi.fn(),
			},
			discount: {
				updateMany: vi.fn(),
			},
			discountUsage: {
				deleteMany: vi.fn(),
			},
			address: {
				count: vi.fn(),
				create: vi.fn(),
			},
			$transaction: vi.fn(),
		},
		mockGetSession: vi.fn(),
		mockGetOrCreateCartSessionId: vi.fn(),
		mockGetCartInvalidationTags: vi.fn(),
		mockCheckRateLimit: vi.fn(),
		mockGetClientIp: vi.fn(),
		mockGetRateLimitIdentifier: vi.fn(),
		mockHeaders: vi.fn(),
		mockUpdateTag: vi.fn(),
		mockGetSkuDetails: vi.fn(),
		mockGetOrCreateStripeCustomer: vi.fn(),
		mockCreateOrderInTransaction: vi.fn(),
		mockBuildStripeLineItems: vi.fn(),
		mockSubscribeToNewsletterInternal: vi.fn(),
		mockStripe: {
			paymentIntents: {
				retrieve: vi.fn(),
				update: vi.fn(),
			},
		},
		mockCircuitBreakerErrorClass: CircuitBreakerErrorClass,
		mockSentryStartSpan: vi.fn(),
		mockSentryCaptureException: vi.fn(),
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

vi.mock("@/modules/cart/constants/cache", () => ({
	getCartInvalidationTags: mockGetCartInvalidationTags,
}));

vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
	getClientIp: mockGetClientIp,
	getRateLimitIdentifier: mockGetRateLimitIdentifier,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	PAYMENT_LIMITS: { CREATE_SESSION: "create-session" },
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("next/headers", () => ({
	headers: mockHeaders,
}));

vi.mock("@/modules/cart/services/sku-validation.service", () => ({
	getSkuDetails: mockGetSkuDetails,
}));

vi.mock("@/modules/payments/services/stripe-customer.service", () => ({
	getOrCreateStripeCustomer: mockGetOrCreateStripeCustomer,
}));

vi.mock("@/modules/payments/services/order-creation.service", () => ({
	createOrderInTransaction: mockCreateOrderInTransaction,
}));

vi.mock("@/modules/payments/services/checkout-line-items.service", () => ({
	buildStripeLineItems: mockBuildStripeLineItems,
}));

vi.mock("@/modules/newsletter/services/subscribe-to-newsletter-internal", () => ({
	subscribeToNewsletterInternal: mockSubscribeToNewsletterInternal,
}));

vi.mock("@/shared/lib/stripe", () => ({
	stripe: mockStripe,
	withStripeCircuitBreaker: (fn: () => Promise<unknown>) => fn(),
	CircuitBreakerError: mockCircuitBreakerErrorClass,
}));

vi.mock("@/modules/discounts/constants/cache", () => ({
	DISCOUNT_CACHE_TAGS: { USAGE: (id: string) => `discount-usage-${id}` },
}));

vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: (text: string) => text,
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: {
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
	},
}));

vi.mock("@sentry/nextjs", () => ({
	startSpan: mockSentryStartSpan,
	captureException: mockSentryCaptureException,
}));

vi.mock("@/shared/constants/countries", () => ({
	SHIPPING_COUNTRIES: ["FR", "BE", "DE", "LU", "CH"],
	COUNTRY_ERROR_MESSAGE: "Pays non supporté",
}));

vi.mock("@/shared/schemas/email.schemas", async () => {
	const { z } = await import("zod");
	return {
		emailOptionalSchema: z.string().email().optional(),
	};
});

vi.mock("@/shared/schemas/phone.schemas", async () => {
	const { z } = await import("zod");
	return {
		phoneSchema: z.string().min(1),
	};
});

vi.mock("@/modules/cart/constants/cart", () => ({
	MAX_QUANTITY_PER_ORDER: 10,
}));

vi.mock("@/modules/discounts/schemas/discount.schemas", async () => {
	const { z } = await import("zod");
	return {
		discountCodeSchema: z.string().min(1),
	};
});

vi.mock("@/modules/payments/utils/parse-full-name", () => ({
	parseFullName: (fullName: string) => {
		const parts = fullName.trim().split(" ");
		const firstName = parts[0] ?? "";
		const lastName = parts.slice(1).join(" ");
		return { firstName, lastName };
	},
}));

// ============================================================================
// IMPORT UNDER TEST — after all mocks
// ============================================================================

import { confirmCheckout } from "../confirm-checkout";
import type { ConfirmCheckoutData } from "../../schemas/checkout.schema";

// ============================================================================
// TEST DATA
// ============================================================================

const VALID_CART_ITEMS = [{ skuId: "sku-001", quantity: 1, priceAtAdd: 4500 }];

const VALID_SHIPPING_ADDRESS = {
	fullName: "Marie Dupont",
	addressLine1: "12 Rue de la Paix",
	addressLine2: "",
	city: "Paris",
	postalCode: "75001",
	country: "FR" as const,
	phoneNumber: "+33612345678",
};

function createValidData(overrides: Partial<ConfirmCheckoutData> = {}): ConfirmCheckoutData {
	return {
		cartItems: VALID_CART_ITEMS,
		shippingAddress: VALID_SHIPPING_ADDRESS,
		email: undefined,
		discountCode: undefined,
		paymentIntentId: "pi_test_123",
		newsletterOptIn: false,
		saveInfo: false,
		...overrides,
	};
}

const MOCK_SKU_RESULT = {
	success: true as const,
	data: {
		sku: {
			id: "sku-001",
			priceInclTax: 4500,
			size: null,
			material: null,
			color: null,
			compareAtPrice: null,
			images: [{ url: "https://utfs.io/f/image.jpg", isPrimary: true }],
			product: {
				id: "prod-001",
				title: "Bague Lune",
				description: "Belle bague artisanale",
			},
		},
	},
};

const MOCK_ORDER = {
	id: "order-001",
	orderNumber: "SYN-20260310-A1B2",
	total: 5090,
};

const MOCK_ORDER_RESULT = {
	order: MOCK_ORDER,
	appliedDiscountId: null,
	discountAmount: 0,
	appliedDiscountCode: null,
};

const MOCK_PAYMENT_INTENT = {
	id: "pi_test_123",
	status: "requires_confirmation",
	amount: 4500,
};

// ============================================================================
// HELPERS
// ============================================================================

function setupDefaults() {
	// Sentry: execute the callback directly
	mockSentryStartSpan.mockImplementation((_opts: unknown, fn: (span: unknown) => unknown) =>
		fn({
			setAttribute: vi.fn(),
		}),
	);

	// Auth: authenticated user
	mockGetSession.mockResolvedValue({
		user: { id: "user-123", email: "marie@example.com" },
	});

	// DB: user has no existing Stripe customer
	mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: null });

	// DB: no existing order for this PI (idempotence check)
	mockPrisma.order.findUnique.mockResolvedValue(null);

	// Rate limit
	mockHeaders.mockResolvedValue(new Headers({ "user-agent": "vitest/1.0" }));
	mockGetClientIp.mockResolvedValue("192.168.1.1");
	mockGetRateLimitIdentifier.mockReturnValue("user:user-123");
	mockCheckRateLimit.mockResolvedValue({ success: true });

	// SKU details
	mockGetSkuDetails.mockResolvedValue(MOCK_SKU_RESULT);

	// Stripe customer
	mockGetOrCreateStripeCustomer.mockResolvedValue({ customerId: "cus_new_001" });

	// Line items
	mockBuildStripeLineItems.mockReturnValue({
		lineItems: [],
		subtotal: 4500,
	});

	// Order creation
	mockCreateOrderInTransaction.mockResolvedValue(MOCK_ORDER_RESULT);

	// Stripe PI retrieve (modifiable state)
	mockStripe.paymentIntents.retrieve.mockResolvedValue(MOCK_PAYMENT_INTENT);

	// Stripe PI update
	mockStripe.paymentIntents.update.mockResolvedValue({ ...MOCK_PAYMENT_INTENT, amount: 5090 });

	// Newsletter (fire-and-forget)
	mockSubscribeToNewsletterInternal.mockResolvedValue({ success: true });

	// Cart cache
	mockGetCartInvalidationTags.mockReturnValue(["cart-user-user-123"]);

	// Cleanup transaction (for failed checkout tests)
	mockPrisma.$transaction.mockImplementation(
		async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
	);
	mockPrisma.order.delete.mockResolvedValue({});
	mockPrisma.discount.updateMany.mockResolvedValue({ count: 1 });
	mockPrisma.discountUsage.deleteMany.mockResolvedValue({ count: 1 });
}

// ============================================================================
// TESTS
// ============================================================================

describe("confirmCheckout", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		setupDefaults();
	});

	// ──────────────────────────────────────────────────────────────
	// Happy path — authenticated user
	// ──────────────────────────────────────────────────────────────

	describe("happy path (authenticated user)", () => {
		it("should return success with orderId, orderNumber, and finalAmount", async () => {
			mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_existing" });
			mockGetOrCreateStripeCustomer.mockResolvedValue({ customerId: "cus_existing" });

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: true,
				orderId: "order-001",
				orderNumber: "SYN-20260310-A1B2",
				finalAmount: 5090,
			});
		});

		it("should fetch user stripeCustomerId from DB when authenticated", async () => {
			mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_existing" });

			await confirmCheckout(createValidData());

			expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
				where: { id: "user-123" },
				select: { stripeCustomerId: true },
			});
		});

		it("should pass existing stripeCustomerId to getOrCreateStripeCustomer", async () => {
			mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_existing" });

			await confirmCheckout(createValidData());

			expect(mockGetOrCreateStripeCustomer).toHaveBeenCalledWith(
				"cus_existing",
				expect.objectContaining({
					email: "marie@example.com",
				}),
			);
		});

		it("should use session email when no email provided in data", async () => {
			await confirmCheckout(createValidData({ email: undefined }));

			expect(mockCreateOrderInTransaction).toHaveBeenCalledWith(
				expect.objectContaining({ finalEmail: "marie@example.com" }),
			);
		});

		it("should update Stripe PI with order metadata after order creation", async () => {
			await confirmCheckout(createValidData());

			expect(mockStripe.paymentIntents.update).toHaveBeenCalledWith(
				"pi_test_123",
				expect.objectContaining({
					amount: 5090,
					receipt_email: "marie@example.com",
					metadata: expect.objectContaining({
						orderId: "order-001",
						orderNumber: "SYN-20260310-A1B2",
						userId: "user-123",
					}),
				}),
			);
		});

		it("should invalidate cart cache tags after success", async () => {
			await confirmCheckout(createValidData());

			expect(mockGetCartInvalidationTags).toHaveBeenCalledWith("user-123", undefined);
			expect(mockUpdateTag).toHaveBeenCalledWith("cart-user-user-123");
		});

		it("should invalidate discount usage cache when discount was applied", async () => {
			mockCreateOrderInTransaction.mockResolvedValue({
				...MOCK_ORDER_RESULT,
				appliedDiscountId: "disc-001",
				appliedDiscountCode: "PROMO20",
			});

			await confirmCheckout(createValidData({ discountCode: "PROMO20" }));

			expect(mockUpdateTag).toHaveBeenCalledWith("discount-usage-disc-001");
		});

		it("should call buildStripeLineItems with cart items and SKU results", async () => {
			await confirmCheckout(createValidData());

			expect(mockBuildStripeLineItems).toHaveBeenCalledWith(VALID_CART_ITEMS, [MOCK_SKU_RESULT]);
		});

		it("should call createOrderInTransaction with all required params", async () => {
			await confirmCheckout(createValidData({ paymentIntentId: "pi_test_123" }));

			expect(mockCreateOrderInTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					cartItems: VALID_CART_ITEMS,
					subtotal: 4500,
					firstName: "Marie",
					lastName: "Dupont",
					userId: "user-123",
					finalEmail: "marie@example.com",
					paymentIntentId: "pi_test_123",
					newsletterOptIn: false,
				}),
			);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Happy path — guest user
	// ──────────────────────────────────────────────────────────────

	describe("happy path (guest user)", () => {
		beforeEach(() => {
			mockGetSession.mockResolvedValue(null);
			mockGetOrCreateCartSessionId.mockResolvedValue("session-guest-abc");
			mockGetRateLimitIdentifier.mockReturnValue("session:session-guest-abc");
		});

		it("should return success for guest with explicit email", async () => {
			const result = await confirmCheckout(createValidData({ email: "guest@example.com" }));

			expect(result).toEqual({
				success: true,
				orderId: "order-001",
				orderNumber: "SYN-20260310-A1B2",
				finalAmount: 5090,
			});
		});

		it("should not look up user in DB for guest", async () => {
			await confirmCheckout(createValidData({ email: "guest@example.com" }));

			expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
		});

		it("should call getOrCreateCartSessionId for guest rate limiting", async () => {
			await confirmCheckout(createValidData({ email: "guest@example.com" }));

			expect(mockGetOrCreateCartSessionId).toHaveBeenCalled();
		});

		it("should include guestSessionId in PI metadata for guest", async () => {
			await confirmCheckout(createValidData({ email: "guest@example.com" }));

			expect(mockStripe.paymentIntents.update).toHaveBeenCalledWith(
				"pi_test_123",
				expect.objectContaining({
					metadata: expect.objectContaining({
						userId: "guest",
						guestSessionId: "session-guest-abc",
					}),
				}),
			);
		});

		it("should use guest email for order creation", async () => {
			await confirmCheckout(createValidData({ email: "guest@example.com" }));

			expect(mockCreateOrderInTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					finalEmail: "guest@example.com",
					userId: null,
				}),
			);
		});

		it("should include cart session tag when invalidating cache for guest", async () => {
			mockGetCartInvalidationTags.mockReturnValue(["cart-session-session-guest-abc"]);

			await confirmCheckout(createValidData({ email: "guest@example.com" }));

			expect(mockGetCartInvalidationTags).toHaveBeenCalledWith(undefined, "session-guest-abc");
			expect(mockUpdateTag).toHaveBeenCalledWith("cart-session-session-guest-abc");
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Idempotence
	// ──────────────────────────────────────────────────────────────

	describe("idempotence", () => {
		it("should return existing order data when order already exists for PI", async () => {
			mockPrisma.order.findUnique.mockResolvedValue({
				id: "order-existing",
				orderNumber: "SYN-20260301-XXXX",
				total: 4990,
			});

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: true,
				orderId: "order-existing",
				orderNumber: "SYN-20260301-XXXX",
				finalAmount: 4990,
			});
		});

		it("should not create a new order when idempotence check finds existing", async () => {
			mockPrisma.order.findUnique.mockResolvedValue({
				id: "order-existing",
				orderNumber: "SYN-20260301-XXXX",
				total: 4990,
			});

			await confirmCheckout(createValidData());

			expect(mockCreateOrderInTransaction).not.toHaveBeenCalled();
			expect(mockStripe.paymentIntents.update).not.toHaveBeenCalled();
		});

		it("should query by stripePaymentIntentId for idempotence check", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(null);

			await confirmCheckout(createValidData({ paymentIntentId: "pi_test_123" }));

			expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
				where: { stripePaymentIntentId: "pi_test_123" },
				select: { id: true, orderNumber: true, total: true },
			});
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Rate limiting
	// ──────────────────────────────────────────────────────────────

	describe("rate limiting", () => {
		it("should return error when rate limit is exceeded", async () => {
			mockCheckRateLimit.mockResolvedValue({
				success: false,
				error: "Trop de tentatives. Veuillez réessayer plus tard.",
				retryAfter: 60,
			});

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Trop de tentatives. Veuillez réessayer plus tard.",
			});
		});

		it("should use fallback rate limit error when no error message provided", async () => {
			mockCheckRateLimit.mockResolvedValue({
				success: false,
				error: undefined,
			});

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Trop de tentatives. Veuillez réessayer plus tard.",
			});
		});

		it("should not create order when rate limited", async () => {
			mockCheckRateLimit.mockResolvedValue({ success: false, error: "Rate limited" });

			await confirmCheckout(createValidData());

			expect(mockCreateOrderInTransaction).not.toHaveBeenCalled();
			expect(mockStripe.paymentIntents.update).not.toHaveBeenCalled();
		});

		it("should use user-based rate limit identifier for authenticated users", async () => {
			await confirmCheckout(createValidData());

			expect(mockCheckRateLimit).toHaveBeenCalledWith(
				"user:user-123",
				"create-session",
				"192.168.1.1",
			);
		});

		it("should use email+IP based identifier for guests with email", async () => {
			mockGetSession.mockResolvedValue(null);
			mockGetOrCreateCartSessionId.mockResolvedValue("session-abc");

			await confirmCheckout(createValidData({ email: "guest@example.com" }));

			expect(mockCheckRateLimit).toHaveBeenCalledWith(
				"guest:guest@example.com:192.168.1.1",
				"create-session",
				"192.168.1.1",
			);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Input validation
	// ──────────────────────────────────────────────────────────────

	describe("input validation", () => {
		it("should return validation error for empty cartItems", async () => {
			const result = await confirmCheckout(createValidData({ cartItems: [] }));

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBeTruthy();
			}
		});

		it("should return validation error for missing paymentIntentId", async () => {
			const result = await confirmCheckout(createValidData({ paymentIntentId: "" }));

			expect(result.success).toBe(false);
		});

		it("should return error for missing guest email when no session email", async () => {
			mockGetSession.mockResolvedValue(null);
			mockGetOrCreateCartSessionId.mockResolvedValue("session-abc");

			const result = await confirmCheckout(createValidData({ email: undefined }));

			expect(result).toEqual({
				success: false,
				error: "L'email est requis pour une commande invité.",
			});
		});

		it("should return error for missing user email when session has no email", async () => {
			mockGetSession.mockResolvedValue({
				user: { id: "user-123", email: null },
			});

			const result = await confirmCheckout(createValidData({ email: undefined }));

			expect(result).toEqual({
				success: false,
				error: "Votre adresse email est manquante. Veuillez vous reconnecter.",
			});
		});
	});

	// ──────────────────────────────────────────────────────────────
	// SKU validation
	// ──────────────────────────────────────────────────────────────

	describe("SKU validation", () => {
		it("should return error when SKU lookup fails", async () => {
			mockGetSkuDetails.mockResolvedValue({
				success: false,
				error: "SKU not found",
			});

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Certains articles ne sont plus disponibles.",
			});
		});

		it("should not create order when SKU is unavailable", async () => {
			mockGetSkuDetails.mockResolvedValue({ success: false, error: "Out of stock" });

			await confirmCheckout(createValidData());

			expect(mockCreateOrderInTransaction).not.toHaveBeenCalled();
		});

		it("should call getSkuDetails for each cart item", async () => {
			const multipleItems = [
				{ skuId: "sku-001", quantity: 1, priceAtAdd: 4500 },
				{ skuId: "sku-002", quantity: 2, priceAtAdd: 3000 },
			];
			mockGetSkuDetails.mockResolvedValueOnce(MOCK_SKU_RESULT).mockResolvedValueOnce({
				success: true,
				data: {
					sku: {
						...MOCK_SKU_RESULT.data.sku,
						id: "sku-002",
						priceInclTax: 3000,
					},
				},
			});

			await confirmCheckout(createValidData({ cartItems: multipleItems }));

			expect(mockGetSkuDetails).toHaveBeenCalledTimes(2);
			expect(mockGetSkuDetails).toHaveBeenCalledWith({ skuId: "sku-001" });
			expect(mockGetSkuDetails).toHaveBeenCalledWith({ skuId: "sku-002" });
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Price verification
	// ──────────────────────────────────────────────────────────────

	describe("price verification", () => {
		it("should return error when price changed since cart add", async () => {
			mockGetSkuDetails.mockResolvedValue({
				success: true,
				data: {
					sku: {
						...MOCK_SKU_RESULT.data.sku,
						priceInclTax: 5500, // changed from 4500
					},
				},
			});

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Les prix de certains articles ont changé. Actualisez votre panier.",
			});
		});

		it("should not create order when price mismatch detected", async () => {
			mockGetSkuDetails.mockResolvedValue({
				success: true,
				data: { sku: { ...MOCK_SKU_RESULT.data.sku, priceInclTax: 9999 } },
			});

			await confirmCheckout(createValidData());

			expect(mockCreateOrderInTransaction).not.toHaveBeenCalled();
		});

		it("should proceed when price matches exactly", async () => {
			// priceAtAdd is 4500, SKU price is 4500 — exact match
			const result = await confirmCheckout(createValidData());

			expect(result.success).toBe(true);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// PI status: already succeeded
	// ──────────────────────────────────────────────────────────────

	describe("PI already succeeded", () => {
		it("should return error when PI status is succeeded", async () => {
			mockStripe.paymentIntents.retrieve.mockResolvedValue({
				...MOCK_PAYMENT_INTENT,
				status: "succeeded",
			});

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Ce paiement a déjà été effectué.",
			});
		});

		it("should cleanup order when PI is already succeeded", async () => {
			mockStripe.paymentIntents.retrieve.mockResolvedValue({
				...MOCK_PAYMENT_INTENT,
				status: "succeeded",
			});

			await confirmCheckout(createValidData());

			expect(mockPrisma.$transaction).toHaveBeenCalled();
			expect(mockPrisma.order.delete).toHaveBeenCalledWith({
				where: { id: "order-001" },
			});
		});

		it("should not update PI when status is succeeded", async () => {
			mockStripe.paymentIntents.retrieve.mockResolvedValue({
				...MOCK_PAYMENT_INTENT,
				status: "succeeded",
			});

			await confirmCheckout(createValidData());

			expect(mockStripe.paymentIntents.update).not.toHaveBeenCalled();
		});
	});

	// ──────────────────────────────────────────────────────────────
	// PI status: already canceled
	// ──────────────────────────────────────────────────────────────

	describe("PI already canceled", () => {
		it("should return error when PI status is canceled", async () => {
			mockStripe.paymentIntents.retrieve.mockResolvedValue({
				...MOCK_PAYMENT_INTENT,
				status: "canceled",
			});

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Ce paiement a été annulé. Veuillez recommencer.",
			});
		});

		it("should cleanup order when PI is already canceled", async () => {
			mockStripe.paymentIntents.retrieve.mockResolvedValue({
				...MOCK_PAYMENT_INTENT,
				status: "canceled",
			});

			await confirmCheckout(createValidData());

			expect(mockPrisma.$transaction).toHaveBeenCalled();
			expect(mockPrisma.order.delete).toHaveBeenCalledWith({
				where: { id: "order-001" },
			});
		});

		it("should not update PI when status is canceled", async () => {
			mockStripe.paymentIntents.retrieve.mockResolvedValue({
				...MOCK_PAYMENT_INTENT,
				status: "canceled",
			});

			await confirmCheckout(createValidData());

			expect(mockStripe.paymentIntents.update).not.toHaveBeenCalled();
		});
	});

	// ──────────────────────────────────────────────────────────────
	// PI cleanup with discount
	// ──────────────────────────────────────────────────────────────

	describe("cleanup with discount applied", () => {
		beforeEach(() => {
			mockCreateOrderInTransaction.mockResolvedValue({
				...MOCK_ORDER_RESULT,
				appliedDiscountId: "disc-001",
				appliedDiscountCode: "SAVE10",
			});
		});

		it("should rollback discount usage when cleanup triggered by succeeded PI", async () => {
			mockStripe.paymentIntents.retrieve.mockResolvedValue({
				...MOCK_PAYMENT_INTENT,
				status: "succeeded",
			});

			await confirmCheckout(createValidData({ discountCode: "SAVE10" }));

			expect(mockPrisma.discountUsage.deleteMany).toHaveBeenCalledWith({
				where: { orderId: "order-001" },
			});
			expect(mockPrisma.discount.updateMany).toHaveBeenCalledWith({
				where: { code: "SAVE10", usageCount: { gt: 0 } },
				data: { usageCount: { decrement: 1 } },
			});
		});

		it("should rollback discount usage when cleanup triggered by canceled PI", async () => {
			mockStripe.paymentIntents.retrieve.mockResolvedValue({
				...MOCK_PAYMENT_INTENT,
				status: "canceled",
			});

			await confirmCheckout(createValidData({ discountCode: "SAVE10" }));

			expect(mockPrisma.discountUsage.deleteMany).toHaveBeenCalledWith({
				where: { orderId: "order-001" },
			});
			expect(mockPrisma.discount.updateMany).toHaveBeenCalledWith({
				where: { code: "SAVE10", usageCount: { gt: 0 } },
				data: { usageCount: { decrement: 1 } },
			});
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Stripe update failure + cleanup
	// ──────────────────────────────────────────────────────────────

	describe("Stripe PI update failure", () => {
		it("should cleanup orphan order when stripe.paymentIntents.update fails", async () => {
			mockStripe.paymentIntents.update.mockRejectedValue(new Error("Stripe API error"));

			await confirmCheckout(createValidData());

			expect(mockPrisma.$transaction).toHaveBeenCalled();
			expect(mockPrisma.order.delete).toHaveBeenCalledWith({
				where: { id: "order-001" },
			});
		});

		it("should return CircuitBreakerError message when stripe update fails with circuit breaker", async () => {
			mockStripe.paymentIntents.update.mockRejectedValue(
				new mockCircuitBreakerErrorClass("paymentIntents"),
			);

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Le service de paiement est temporairement indisponible.",
			});
		});

		it("should cleanup and re-throw when stripe update fails with non-CircuitBreaker error", async () => {
			const stripeError = new Error("Stripe generic error");
			mockStripe.paymentIntents.update.mockRejectedValue(stripeError);

			// The outer catch will handle the re-thrown error
			const result = await confirmCheckout(createValidData());

			// The re-thrown error is caught by the outer catch block
			expect(result).toEqual({
				success: false,
				error: "Une erreur est survenue lors de la validation de la commande.",
			});
		});

		it("should not skip cleanup when discount was applied and stripe update fails", async () => {
			mockCreateOrderInTransaction.mockResolvedValue({
				...MOCK_ORDER_RESULT,
				appliedDiscountId: "disc-001",
				appliedDiscountCode: "PROMO10",
			});
			mockStripe.paymentIntents.update.mockRejectedValue(
				new mockCircuitBreakerErrorClass("paymentIntents"),
			);

			await confirmCheckout(createValidData({ discountCode: "PROMO10" }));

			expect(mockPrisma.discountUsage.deleteMany).toHaveBeenCalledWith({
				where: { orderId: "order-001" },
			});
			expect(mockPrisma.discount.updateMany).toHaveBeenCalledWith({
				where: { code: "PROMO10", usageCount: { gt: 0 } },
				data: { usageCount: { decrement: 1 } },
			});
			expect(mockPrisma.order.delete).toHaveBeenCalledWith({
				where: { id: "order-001" },
			});
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Newsletter opt-in
	// ──────────────────────────────────────────────────────────────

	describe("newsletter opt-in", () => {
		it("should call subscribeToNewsletterInternal when newsletterOptIn is true", async () => {
			await confirmCheckout(createValidData({ newsletterOptIn: true }));

			expect(mockSubscribeToNewsletterInternal).toHaveBeenCalledWith(
				expect.objectContaining({
					email: "marie@example.com",
					ipAddress: "192.168.1.1",
					consentSource: "checkout_form",
				}),
			);
		});

		it("should not call subscribeToNewsletterInternal when newsletterOptIn is false", async () => {
			await confirmCheckout(createValidData({ newsletterOptIn: false }));

			expect(mockSubscribeToNewsletterInternal).not.toHaveBeenCalled();
		});

		it("should pass user-agent header to newsletter subscription", async () => {
			mockHeaders.mockResolvedValue(new Headers({ "user-agent": "Mozilla/5.0 TestBrowser" }));

			await confirmCheckout(createValidData({ newsletterOptIn: true }));

			expect(mockSubscribeToNewsletterInternal).toHaveBeenCalledWith(
				expect.objectContaining({
					userAgent: "Mozilla/5.0 TestBrowser",
				}),
			);
		});

		it("should not block checkout when newsletter subscription fails", async () => {
			mockSubscribeToNewsletterInternal.mockRejectedValue(new Error("Email service down"));

			const result = await confirmCheckout(createValidData({ newsletterOptIn: true }));

			// Newsletter failure should not affect checkout result — it is fire-and-forget
			expect(result.success).toBe(true);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Save address
	// ──────────────────────────────────────────────────────────────

	describe("save address", () => {
		it("should trigger address save when saveInfo is true and user is authenticated", async () => {
			mockPrisma.$transaction.mockImplementation(
				async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
					// For address save transaction
					const tx = {
						address: {
							count: vi.fn().mockResolvedValue(0),
							create: vi.fn().mockResolvedValue({}),
						},
					};
					return fn(tx as unknown as typeof mockPrisma);
				},
			);

			await confirmCheckout(createValidData({ saveInfo: true }));

			// saveAddressForUser is fire-and-forget, so we verify $transaction was eventually called
			// after the main flow completes
			await vi.waitFor(() => {
				expect(mockPrisma.$transaction).toHaveBeenCalled();
			});
		});

		it("should not save address when saveInfo is false", async () => {
			// Reset $transaction call count — only cleanup transaction should be absent
			mockPrisma.$transaction.mockClear();

			await confirmCheckout(createValidData({ saveInfo: false }));

			// With saveInfo false, no address transaction should be called
			// (the cleanup transaction only runs on failure)
			expect(mockPrisma.$transaction).not.toHaveBeenCalled();
		});

		it("should not save address for guest users even when saveInfo is true", async () => {
			mockGetSession.mockResolvedValue(null);
			mockGetOrCreateCartSessionId.mockResolvedValue("session-abc");
			mockPrisma.$transaction.mockClear();

			await confirmCheckout(createValidData({ email: "guest@example.com", saveInfo: true }));

			// Guest users have no userId, so saveAddressForUser should not be called
			expect(mockPrisma.$transaction).not.toHaveBeenCalled();
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling — unexpected exceptions
	// ──────────────────────────────────────────────────────────────

	describe("error handling", () => {
		it("should return generic error when an unexpected exception occurs", async () => {
			mockGetSession.mockRejectedValue(new Error("Unexpected DB failure"));

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Une erreur est survenue lors de la validation de la commande.",
			});
		});

		it("should call Sentry.captureException on unexpected errors", async () => {
			const error = new Error("Unexpected crash");
			mockGetSession.mockRejectedValue(error);

			await confirmCheckout(createValidData());

			expect(mockSentryCaptureException).toHaveBeenCalledWith(error);
		});

		it("should return error when createOrderInTransaction throws", async () => {
			mockCreateOrderInTransaction.mockRejectedValue(new Error("Transaction failed"));

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Une erreur est survenue lors de la validation de la commande.",
			});
		});

		it("should return error when stripe.paymentIntents.retrieve throws", async () => {
			mockStripe.paymentIntents.retrieve.mockRejectedValue(new Error("Stripe retrieve failed"));

			const result = await confirmCheckout(createValidData());

			expect(result.success).toBe(false);
		});
	});
});
