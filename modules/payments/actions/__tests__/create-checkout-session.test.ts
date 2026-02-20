import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import Stripe from "stripe";

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
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockGetSkuDetails,
	mockCalculateShipping,
	mockGenerateOrderNumber,
	mockGetShippingZoneFromPostalCode,
	mockGetShippingOptionsForAddress,
	mockCheckDiscountEligibility,
	mockGetDiscountUsageCounts,
	mockCalculateDiscountWithExclusion,
	mockGetValidImageUrl,
	mockStripe,
	mockGetInvoiceFooter,
	mockSendAdminCheckoutFailedAlert,
} = vi.hoisted(() => ({
	mockPrisma: {
		user: { findUnique: vi.fn(), update: vi.fn() },
		order: { create: vi.fn(), delete: vi.fn() },
		orderItem: { create: vi.fn() },
		discount: { updateMany: vi.fn() },
		discountUsage: { create: vi.fn(), deleteMany: vi.fn() },
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
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockGetSkuDetails: vi.fn(),
	mockCalculateShipping: vi.fn(),
	mockGenerateOrderNumber: vi.fn(),
	mockGetShippingZoneFromPostalCode: vi.fn(),
	mockGetShippingOptionsForAddress: vi.fn(),
	mockCheckDiscountEligibility: vi.fn(),
	mockGetDiscountUsageCounts: vi.fn(),
	mockCalculateDiscountWithExclusion: vi.fn(),
	mockGetValidImageUrl: vi.fn(),
	mockStripe: {
		customers: { create: vi.fn() },
		coupons: { create: vi.fn(), del: vi.fn() },
		checkout: { sessions: { create: vi.fn() } },
	},
	mockGetInvoiceFooter: vi.fn(),
	mockSendAdminCheckoutFailedAlert: vi.fn(),
}));

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

vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
	BusinessError: class BusinessError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "BusinessError";
		}
	},
}));

vi.mock("@/modules/cart/services/sku-validation.service", () => ({
	getSkuDetails: mockGetSkuDetails,
}));

vi.mock("@/modules/orders/services/shipping.service", () => ({
	calculateShipping: mockCalculateShipping,
}));

vi.mock("@/modules/orders/services/order-generation.service", () => ({
	generateOrderNumber: mockGenerateOrderNumber,
}));

vi.mock("@/modules/orders/services/shipping-zone.service", () => ({
	getShippingZoneFromPostalCode: mockGetShippingZoneFromPostalCode,
}));

vi.mock("@/modules/orders/constants/stripe-shipping-rates", () => ({
	getShippingOptionsForAddress: mockGetShippingOptionsForAddress,
}));

vi.mock("@/modules/discounts/constants/discount.constants", () => ({
	DISCOUNT_ERROR_MESSAGES: { NOT_FOUND: "Code promo introuvable" },
}));

vi.mock("@/modules/discounts/constants/cache", () => ({
	DISCOUNT_CACHE_TAGS: { USAGE: (id: string) => `discount-usage-${id}` },
}));

vi.mock("@/modules/discounts/services/discount-eligibility.service", () => ({
	checkDiscountEligibility: mockCheckDiscountEligibility,
}));

vi.mock("@/modules/discounts/data/get-discount-usage-counts", () => ({
	getDiscountUsageCounts: mockGetDiscountUsageCounts,
}));

vi.mock("@/modules/discounts/services/discount-calculation.service", () => ({
	calculateDiscountWithExclusion: mockCalculateDiscountWithExclusion,
}));

vi.mock("@/shared/lib/media-validation", () => ({
	getValidImageUrl: mockGetValidImageUrl,
}));

vi.mock("@/shared/lib/stripe", () => ({
	stripe: mockStripe,
	getInvoiceFooter: mockGetInvoiceFooter,
}));

vi.mock("@/shared/constants/currency", () => ({
	DEFAULT_CURRENCY: "eur",
}));

vi.mock("@/modules/payments/schemas/create-checkout-session-schema", () => ({
	createCheckoutSessionSchema: {},
}));

vi.mock("@/shared/constants/countries", () => ({
	SHIPPING_COUNTRIES: ["FR", "BE", "DE"],
	COUNTRY_ERROR_MESSAGE: "Pays non supporté",
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminCheckoutFailedAlert: mockSendAdminCheckoutFailedAlert,
}));

import { createCheckoutSession } from "../create-checkout-session";

// ============================================================================
// TEST DATA
// ============================================================================

const VALID_CART_ITEMS = [
	{ skuId: "sku-001", quantity: 1, priceAtAdd: 4500 },
];

const VALID_SHIPPING_ADDRESS = {
	fullName: "Marie Dupont",
	addressLine1: "12 Rue de la Paix",
	addressLine2: "",
	city: "Paris",
	postalCode: "75001",
	country: "FR",
	phoneNumber: "+33612345678",
};

function createFormData(overrides: Partial<{
	cartItems: unknown;
	shippingAddress: unknown;
	email: string;
	discountCode: string;
}> = {}): FormData {
	const fd = new FormData();
	fd.set("cartItems", JSON.stringify(overrides.cartItems ?? VALID_CART_ITEMS));
	fd.set("shippingAddress", JSON.stringify(overrides.shippingAddress ?? VALID_SHIPPING_ADDRESS));
	if (overrides.email !== undefined) fd.set("email", overrides.email);
	if (overrides.discountCode !== undefined) fd.set("discountCode", overrides.discountCode);
	return fd;
}

const MOCK_SKU_RESULT = {
	success: true,
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
				description: "Belle bague",
			},
		},
	},
};

const MOCK_ORDER = {
	id: "order-001",
	orderNumber: "SYN-20260220-A1B2",
	total: 5100,
};

const MOCK_CHECKOUT_SESSION = {
	id: "cs_test_123",
	client_secret: "cs_test_secret_abc",
} as unknown as Stripe.Checkout.Session;

// ============================================================================
// HELPERS
// ============================================================================

function setupDefaults() {
	// Auth: authenticated user with Stripe customer
	mockGetSession.mockResolvedValue({
		user: { id: "user-123", email: "marie@example.com" },
	});
	mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_existing" });

	// Rate limit
	mockHeaders.mockResolvedValue(new Headers());
	mockGetClientIp.mockResolvedValue("192.168.1.1");
	mockGetRateLimitIdentifier.mockReturnValue("user:user-123");
	mockCheckRateLimit.mockResolvedValue({ success: true });

	// Validation passes
	mockValidateInput.mockReturnValue({
		data: {
			cartItems: VALID_CART_ITEMS,
			shippingAddress: VALID_SHIPPING_ADDRESS,
			email: undefined,
			discountCode: undefined,
		},
	});

	// SKU details
	mockGetSkuDetails.mockResolvedValue(MOCK_SKU_RESULT);

	// Shipping
	mockCalculateShipping.mockReturnValue(600);
	mockGetShippingZoneFromPostalCode.mockReturnValue({ zone: "METRO", department: "75" });
	mockGetShippingOptionsForAddress.mockReturnValue([]);

	// Order number
	mockGenerateOrderNumber.mockReturnValue("SYN-20260220-A1B2");

	// Image validation
	mockGetValidImageUrl.mockImplementation((url: string | null | undefined) => url || null);

	// Transaction: execute callback with tx mock
	mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
		// Create a tx mock with $queryRaw and $executeRaw
		const tx = {
			...mockPrisma,
			$queryRaw: vi.fn().mockResolvedValue([
				{
					isActive: true,
					inventory: 10,
					productTitle: "Bague Lune",
					productStatus: "PUBLIC",
				},
			]),
			$executeRaw: vi.fn().mockResolvedValue(1),
		};
		return fn(tx as unknown as typeof mockPrisma);
	});

	mockPrisma.order.create.mockResolvedValue(MOCK_ORDER);
	mockPrisma.orderItem.create.mockResolvedValue({});

	// Stripe
	mockStripe.checkout.sessions.create.mockResolvedValue(MOCK_CHECKOUT_SESSION);
	mockGetInvoiceFooter.mockReturnValue("Footer text");

	// Cart cache
	mockGetCartInvalidationTags.mockReturnValue(["cart-user-user-123"]);

	// Response helpers
	mockSuccess.mockImplementation((message: string, data?: unknown) => ({
		status: ActionStatus.SUCCESS,
		message,
		data,
	}));
	mockError.mockImplementation((message: string) => ({
		status: ActionStatus.ERROR,
		message,
	}));
	mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
		status: ActionStatus.ERROR,
		message: fallback,
	}));

	// Admin alert (fire-and-forget)
	mockSendAdminCheckoutFailedAlert.mockResolvedValue({ success: true });
}

// ============================================================================
// TESTS
// ============================================================================

describe("createCheckoutSession", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		setupDefaults();
	});

	// ──────────────────────────────────────────────────────────────
	// Happy path — authenticated user
	// ──────────────────────────────────────────────────────────────

	describe("happy path (authenticated user)", () => {
		it("should return success with clientSecret for authenticated user with existing Stripe customer", async () => {
			const result = await createCheckoutSession(undefined, createFormData());

			expect(result.status).toBe(ActionStatus.SUCCESS);
			expect(result.data).toEqual({
				clientSecret: "cs_test_secret_abc",
				orderId: "order-001",
				orderNumber: "SYN-20260220-A1B2",
			});
		});

		it("should not create a new Stripe customer when stripeCustomerId already exists", async () => {
			await createCheckoutSession(undefined, createFormData());

			expect(mockStripe.customers.create).not.toHaveBeenCalled();
		});

		it("should use existing stripeCustomerId in checkout session", async () => {
			await createCheckoutSession(undefined, createFormData());

			expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
				expect.objectContaining({
					customer: "cus_existing",
					customer_email: undefined,
				}),
				expect.any(Object),
			);
		});

		it("should create order in PENDING state", async () => {
			await createCheckoutSession(undefined, createFormData());

			expect(mockPrisma.order.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					status: "PENDING",
					paymentStatus: "PENDING",
					fulfillmentStatus: "UNFULFILLED",
					userId: "user-123",
				}),
			});
		});

		it("should invalidate cart cache after success", async () => {
			await createCheckoutSession(undefined, createFormData());

			expect(mockGetCartInvalidationTags).toHaveBeenCalledWith("user-123", undefined);
			expect(mockUpdateTag).toHaveBeenCalledWith("cart-user-user-123");
		});

		it("should pass idempotency key based on orderId", async () => {
			await createCheckoutSession(undefined, createFormData());

			expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({
					idempotencyKey: "checkout-order-001",
				}),
			);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Happy path — guest checkout
	// ──────────────────────────────────────────────────────────────

	describe("happy path (guest checkout)", () => {
		beforeEach(() => {
			mockGetSession.mockResolvedValue(null);
			mockGetOrCreateCartSessionId.mockResolvedValue("session-abc");
			mockGetRateLimitIdentifier.mockReturnValue("session:session-abc");
			mockPrisma.user.findUnique.mockResolvedValue(null);

			mockValidateInput.mockReturnValue({
				data: {
					cartItems: VALID_CART_ITEMS,
					shippingAddress: VALID_SHIPPING_ADDRESS,
					email: "guest@example.com",
					discountCode: undefined,
				},
			});
		});

		it("should create Stripe customer for guest with email", async () => {
			mockStripe.customers.create.mockResolvedValue({ id: "cus_new_guest" });

			const result = await createCheckoutSession(undefined, createFormData({ email: "guest@example.com" }));

			expect(result.status).toBe(ActionStatus.SUCCESS);
			expect(mockStripe.customers.create).toHaveBeenCalledWith(
				expect.objectContaining({ email: "guest@example.com" }),
				expect.objectContaining({ idempotencyKey: "customer-create-guest@example.com" }),
			);
		});

		it("should include guestSessionId in session metadata", async () => {
			mockStripe.customers.create.mockResolvedValue({ id: "cus_new_guest" });

			await createCheckoutSession(undefined, createFormData({ email: "guest@example.com" }));

			expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: expect.objectContaining({
						guestSessionId: "session-abc",
						userId: "guest",
					}),
				}),
				expect.any(Object),
			);
		});

		it("should return error when guest has no email", async () => {
			mockValidateInput.mockReturnValue({
				data: {
					cartItems: VALID_CART_ITEMS,
					shippingAddress: VALID_SHIPPING_ADDRESS,
					email: undefined,
					discountCode: undefined,
				},
			});

			const result = await createCheckoutSession(undefined, createFormData());

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(result.message).toContain("email");
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Rate limiting
	// ──────────────────────────────────────────────────────────────

	describe("rate limiting", () => {
		it("should return rate limit error with retryAfter data", async () => {
			mockCheckRateLimit.mockResolvedValue({
				success: false,
				error: "Trop de tentatives",
				retryAfter: 30,
				reset: 1708444800,
			});

			const result = await createCheckoutSession(undefined, createFormData());

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(result.data).toEqual({
				retryAfter: 30,
				reset: 1708444800,
			});
		});

		it("should not call Stripe when rate limited", async () => {
			mockCheckRateLimit.mockResolvedValue({ success: false, error: "Rate limited" });

			await createCheckoutSession(undefined, createFormData());

			expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
			expect(mockPrisma.$transaction).not.toHaveBeenCalled();
		});
	});

	// ──────────────────────────────────────────────────────────────
	// JSON parsing
	// ──────────────────────────────────────────────────────────────

	describe("JSON parsing", () => {
		it("should return error for invalid JSON in cartItems", async () => {
			const fd = new FormData();
			fd.set("cartItems", "not-json");
			fd.set("shippingAddress", JSON.stringify(VALID_SHIPPING_ADDRESS));

			const result = await createCheckoutSession(undefined, fd);

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(result.message).toContain("JSON invalide");
		});

		it("should return error for invalid JSON in shippingAddress", async () => {
			const fd = new FormData();
			fd.set("cartItems", JSON.stringify(VALID_CART_ITEMS));
			fd.set("shippingAddress", "{broken");

			const result = await createCheckoutSession(undefined, fd);

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(result.message).toContain("JSON invalide");
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Zod validation
	// ──────────────────────────────────────────────────────────────

	describe("validation", () => {
		it("should return validation error when schema fails", async () => {
			const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "Panier vide" };
			mockValidateInput.mockReturnValue({ error: validationError });

			const result = await createCheckoutSession(undefined, createFormData());

			expect(result).toEqual(validationError);
			expect(mockPrisma.$transaction).not.toHaveBeenCalled();
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Price mismatch
	// ──────────────────────────────────────────────────────────────

	describe("price verification", () => {
		it("should return error when price changed since adding to cart", async () => {
			// SKU price is 4500, but cart has priceAtAdd = 4000
			mockGetSkuDetails.mockResolvedValue({
				success: true,
				data: {
					sku: {
						...MOCK_SKU_RESULT.data.sku,
						priceInclTax: 5000, // Price changed
					},
				},
			});

			const result = await createCheckoutSession(undefined, createFormData());

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(result.message).toContain("prix");
		});
	});

	// ──────────────────────────────────────────────────────────────
	// SKU validation
	// ──────────────────────────────────────────────────────────────

	describe("SKU validation", () => {
		it("should return error when SKU is not found", async () => {
			mockGetSkuDetails.mockResolvedValue({
				success: false,
				error: "SKU not found",
			});

			const result = await createCheckoutSession(undefined, createFormData());

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(result.message).toContain("articles ne sont plus disponibles");
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Stock verification (inside transaction)
	// ──────────────────────────────────────────────────────────────

	describe("stock verification", () => {
		it("should return error when stock is insufficient", async () => {
			mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
				const tx = {
					...mockPrisma,
					$queryRaw: vi.fn().mockResolvedValue([
						{
							isActive: true,
							inventory: 0, // No stock
							productTitle: "Bague Lune",
							productStatus: "PUBLIC",
						},
					]),
					$executeRaw: vi.fn(),
				};
				return fn(tx);
			});

			const result = await createCheckoutSession(undefined, createFormData());

			// BusinessError thrown inside $transaction → caught by outer catch → handleActionError
			expect(mockHandleActionError).toHaveBeenCalled();
			expect(result.status).toBe(ActionStatus.ERROR);
		});

		it("should return error when product is not PUBLIC", async () => {
			mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
				const tx = {
					...mockPrisma,
					$queryRaw: vi.fn().mockResolvedValue([
						{
							isActive: true,
							inventory: 10,
							productTitle: "Bague Lune",
							productStatus: "DRAFT", // Not public
						},
					]),
					$executeRaw: vi.fn(),
				};
				return fn(tx);
			});

			const result = await createCheckoutSession(undefined, createFormData());

			expect(mockHandleActionError).toHaveBeenCalled();
			expect(result.status).toBe(ActionStatus.ERROR);
		});

		it("should return error when SKU is inactive", async () => {
			mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
				const tx = {
					...mockPrisma,
					$queryRaw: vi.fn().mockResolvedValue([
						{
							isActive: false, // Inactive
							inventory: 10,
							productTitle: "Bague Lune",
							productStatus: "PUBLIC",
						},
					]),
					$executeRaw: vi.fn(),
				};
				return fn(tx);
			});

			const result = await createCheckoutSession(undefined, createFormData());

			expect(mockHandleActionError).toHaveBeenCalled();
			expect(result.status).toBe(ActionStatus.ERROR);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Stripe customer creation
	// ──────────────────────────────────────────────────────────────

	describe("Stripe customer creation", () => {
		beforeEach(() => {
			// User without existing Stripe customer
			mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: null });
		});

		it("should create Stripe customer when user has no stripeCustomerId", async () => {
			mockStripe.customers.create.mockResolvedValue({ id: "cus_new" });

			await createCheckoutSession(undefined, createFormData());

			expect(mockStripe.customers.create).toHaveBeenCalledWith(
				expect.objectContaining({
					email: "marie@example.com",
					name: "Marie Dupont",
				}),
				expect.objectContaining({
					idempotencyKey: "customer-create-marie@example.com",
				}),
			);
		});

		it("should update user record with new stripeCustomerId", async () => {
			mockStripe.customers.create.mockResolvedValue({ id: "cus_new" });

			await createCheckoutSession(undefined, createFormData());

			expect(mockPrisma.user.update).toHaveBeenCalledWith({
				where: { id: "user-123" },
				data: { stripeCustomerId: "cus_new" },
			});
		});

		it("should return error for StripeInvalidRequestError (permanent)", async () => {
			const stripeError = new Stripe.errors.StripeInvalidRequestError({
				message: "Invalid email",
				type: "invalid_request_error",
			});
			mockStripe.customers.create.mockRejectedValue(stripeError);

			const result = await createCheckoutSession(undefined, createFormData());

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(result.message).toContain("Email invalide");
		});

		it("should continue without customer on transient Stripe error", async () => {
			mockStripe.customers.create.mockRejectedValue(new Error("Network timeout"));

			const result = await createCheckoutSession(undefined, createFormData());

			// Should still succeed — checkout continues without pre-created customer
			expect(result.status).toBe(ActionStatus.SUCCESS);
			// customer_email should be used instead of customer
			expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
				expect.objectContaining({
					customer: undefined,
					customer_email: "marie@example.com",
				}),
				expect.any(Object),
			);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Discount code
	// ──────────────────────────────────────────────────────────────

	describe("discount code", () => {
		const DISCOUNT_ROW = {
			id: "disc-001",
			code: "PROMO20",
			type: "PERCENTAGE",
			value: 20,
			minOrderAmount: null,
			maxUsageCount: null,
			maxUsagePerUser: null,
			usageCount: 0,
			startsAt: new Date("2024-01-01"),
			endsAt: null,
			isActive: true,
		};

		beforeEach(() => {
			mockValidateInput.mockReturnValue({
				data: {
					cartItems: VALID_CART_ITEMS,
					shippingAddress: VALID_SHIPPING_ADDRESS,
					email: undefined,
					discountCode: "PROMO20",
				},
			});
		});

		it("should apply valid discount code and create Stripe coupon", async () => {
			mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
				const tx = {
					...mockPrisma,
					$queryRaw: vi.fn()
						.mockResolvedValueOnce([ // SKU stock check
							{ isActive: true, inventory: 10, productTitle: "Bague Lune", productStatus: "PUBLIC" },
						])
						.mockResolvedValueOnce([DISCOUNT_ROW]), // Discount lookup
					$executeRaw: vi.fn().mockResolvedValue(1), // Discount usage update
				};
				return fn(tx);
			});

			mockCheckDiscountEligibility.mockReturnValue({ eligible: true });
			mockCalculateDiscountWithExclusion.mockReturnValue(900);
			mockStripe.coupons.create.mockResolvedValue({ id: "coupon_abc" });

			const result = await createCheckoutSession(undefined, createFormData({ discountCode: "PROMO20" }));

			expect(result.status).toBe(ActionStatus.SUCCESS);
			expect(mockStripe.coupons.create).toHaveBeenCalledWith(
				expect.objectContaining({
					amount_off: 900,
					currency: "eur",
					duration: "once",
				}),
			);
			expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
				expect.objectContaining({
					discounts: [{ coupon: "coupon_abc" }],
				}),
				expect.any(Object),
			);
		});

		it("should throw BusinessError when discount code is not found", async () => {
			mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
				const tx = {
					...mockPrisma,
					$queryRaw: vi.fn()
						.mockResolvedValueOnce([ // SKU stock check
							{ isActive: true, inventory: 10, productTitle: "Bague Lune", productStatus: "PUBLIC" },
						])
						.mockResolvedValueOnce([]), // No discount found
					$executeRaw: vi.fn(),
				};
				return fn(tx);
			});

			const result = await createCheckoutSession(undefined, createFormData({ discountCode: "INVALID" }));

			expect(mockHandleActionError).toHaveBeenCalled();
			expect(result.status).toBe(ActionStatus.ERROR);
		});

		it("should throw BusinessError when discount usage limit reached (atomic update returns 0)", async () => {
			mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
				const tx = {
					...mockPrisma,
					$queryRaw: vi.fn()
						.mockResolvedValueOnce([ // SKU stock check
							{ isActive: true, inventory: 10, productTitle: "Bague Lune", productStatus: "PUBLIC" },
						])
						.mockResolvedValueOnce([DISCOUNT_ROW]), // Discount found
					$executeRaw: vi.fn().mockResolvedValue(0), // Atomic update: 0 rows = limit reached
				};
				return fn(tx);
			});

			mockCheckDiscountEligibility.mockReturnValue({ eligible: true });
			mockCalculateDiscountWithExclusion.mockReturnValue(900);

			const result = await createCheckoutSession(undefined, createFormData({ discountCode: "PROMO20" }));

			expect(mockHandleActionError).toHaveBeenCalled();
			expect(result.status).toBe(ActionStatus.ERROR);
		});

		it("should invalidate discount usage cache after successful checkout with discount", async () => {
			mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
				const tx = {
					...mockPrisma,
					$queryRaw: vi.fn()
						.mockResolvedValueOnce([
							{ isActive: true, inventory: 10, productTitle: "Bague Lune", productStatus: "PUBLIC" },
						])
						.mockResolvedValueOnce([DISCOUNT_ROW]),
					$executeRaw: vi.fn().mockResolvedValue(1),
				};
				return fn(tx);
			});

			mockCheckDiscountEligibility.mockReturnValue({ eligible: true });
			mockCalculateDiscountWithExclusion.mockReturnValue(900);
			mockStripe.coupons.create.mockResolvedValue({ id: "coupon_abc" });

			await createCheckoutSession(undefined, createFormData({ discountCode: "PROMO20" }));

			expect(mockUpdateTag).toHaveBeenCalledWith("discount-usage-disc-001");
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Stripe session creation failure + cleanup
	// ──────────────────────────────────────────────────────────────

	describe("Stripe session creation failure", () => {
		it("should cleanup orphan order when stripe.checkout.sessions.create fails", async () => {
			mockStripe.checkout.sessions.create.mockRejectedValue(new Error("Stripe API down"));

			const result = await createCheckoutSession(undefined, createFormData());

			expect(mockPrisma.order.delete).toHaveBeenCalledWith({
				where: { id: "order-001" },
			});
			expect(mockHandleActionError).toHaveBeenCalled();
			expect(result.status).toBe(ActionStatus.ERROR);
		});

		it("should rollback discount usage when stripe session creation fails with discount", async () => {
			mockValidateInput.mockReturnValue({
				data: {
					cartItems: VALID_CART_ITEMS,
					shippingAddress: VALID_SHIPPING_ADDRESS,
					email: undefined,
					discountCode: "PROMO20",
				},
			});

			mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
				const tx = {
					...mockPrisma,
					$queryRaw: vi.fn()
						.mockResolvedValueOnce([
							{ isActive: true, inventory: 10, productTitle: "Bague Lune", productStatus: "PUBLIC" },
						])
						.mockResolvedValueOnce([
							{ id: "disc-001", code: "PROMO20", type: "PERCENTAGE", value: 20, minOrderAmount: null, maxUsageCount: null, maxUsagePerUser: null, usageCount: 0, startsAt: new Date(), endsAt: null, isActive: true },
						]),
					$executeRaw: vi.fn().mockResolvedValue(1),
				};
				return fn(tx);
			});

			mockCheckDiscountEligibility.mockReturnValue({ eligible: true });
			mockCalculateDiscountWithExclusion.mockReturnValue(900);
			mockStripe.coupons.create.mockResolvedValue({ id: "coupon_abc" });
			mockStripe.checkout.sessions.create.mockRejectedValue(new Error("Stripe down"));

			await createCheckoutSession(undefined, createFormData({ discountCode: "PROMO20" }));

			// Verify discount rollback
			expect(mockPrisma.discount.updateMany).toHaveBeenCalledWith({
				where: { code: "PROMO20" },
				data: { usageCount: { decrement: 1 } },
			});
			expect(mockPrisma.discountUsage.deleteMany).toHaveBeenCalledWith({
				where: { orderId: "order-001" },
			});
		});

		it("should delete orphan Stripe coupon when session creation fails", async () => {
			mockValidateInput.mockReturnValue({
				data: {
					cartItems: VALID_CART_ITEMS,
					shippingAddress: VALID_SHIPPING_ADDRESS,
					email: undefined,
					discountCode: "PROMO20",
				},
			});

			mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
				const tx = {
					...mockPrisma,
					$queryRaw: vi.fn()
						.mockResolvedValueOnce([
							{ isActive: true, inventory: 10, productTitle: "Bague Lune", productStatus: "PUBLIC" },
						])
						.mockResolvedValueOnce([
							{ id: "disc-001", code: "PROMO20", type: "PERCENTAGE", value: 20, minOrderAmount: null, maxUsageCount: null, maxUsagePerUser: null, usageCount: 0, startsAt: new Date(), endsAt: null, isActive: true },
						]),
					$executeRaw: vi.fn().mockResolvedValue(1),
				};
				return fn(tx);
			});

			mockCheckDiscountEligibility.mockReturnValue({ eligible: true });
			mockCalculateDiscountWithExclusion.mockReturnValue(900);
			mockStripe.coupons.create.mockResolvedValue({ id: "coupon_to_delete" });
			mockStripe.checkout.sessions.create.mockRejectedValue(new Error("Stripe down"));

			await createCheckoutSession(undefined, createFormData({ discountCode: "PROMO20" }));

			expect(mockStripe.coupons.del).toHaveBeenCalledWith("coupon_to_delete");
		});

		it("should send admin alert when Stripe session creation fails", async () => {
			mockStripe.checkout.sessions.create.mockRejectedValue(new Error("API unreachable"));

			await createCheckoutSession(undefined, createFormData());

			expect(mockSendAdminCheckoutFailedAlert).toHaveBeenCalledWith({
				orderNumber: "SYN-20260220-A1B2",
				customerEmail: "marie@example.com",
				total: 5100,
				errorMessage: "API unreachable",
			});
		});

		it("should not fail if admin alert email fails to send", async () => {
			mockStripe.checkout.sessions.create.mockRejectedValue(new Error("API down"));
			mockSendAdminCheckoutFailedAlert.mockRejectedValue(new Error("Email service down"));

			const result = await createCheckoutSession(undefined, createFormData());

			// Should still return error (not crash)
			expect(result.status).toBe(ActionStatus.ERROR);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Missing client_secret
	// ──────────────────────────────────────────────────────────────

	describe("missing client_secret", () => {
		it("should throw BusinessError when client_secret is null", async () => {
			mockStripe.checkout.sessions.create.mockResolvedValue({
				id: "cs_test_123",
				client_secret: null,
			});

			const result = await createCheckoutSession(undefined, createFormData());

			expect(mockHandleActionError).toHaveBeenCalled();
			expect(result.status).toBe(ActionStatus.ERROR);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	describe("error handling", () => {
		it("should call handleActionError for unexpected exceptions", async () => {
			mockPrisma.user.findUnique.mockRejectedValue(new Error("DB connection lost"));

			const result = await createCheckoutSession(undefined, createFormData());

			expect(mockHandleActionError).toHaveBeenCalled();
			expect(result.status).toBe(ActionStatus.ERROR);
		});
	});
});
