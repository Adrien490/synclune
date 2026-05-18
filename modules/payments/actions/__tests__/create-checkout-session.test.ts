import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockStripeCreate,
	mockGetSession,
	mockGetSkusDetailsBatch,
	mockAssertStoreOpen,
	mockBuildStripeLineItems,
	mockGetOrCreateStripeCustomer,
	mockPrisma,
	mockCheckRateLimit,
	mockClassifyStripeError,
} = vi.hoisted(() => ({
	mockStripeCreate: vi.fn(),
	mockGetSession: vi.fn(),
	mockGetSkusDetailsBatch: vi.fn(),
	mockAssertStoreOpen: vi.fn(),
	mockBuildStripeLineItems: vi.fn(),
	mockGetOrCreateStripeCustomer: vi.fn(),
	mockPrisma: {
		cart: { findFirst: vi.fn() },
		user: { findUnique: vi.fn() },
	},
	mockCheckRateLimit: vi.fn(),
	mockClassifyStripeError: vi.fn(),
}));

vi.mock("next/headers", () => ({
	headers: async () => new Map<string, string>(),
}));
vi.mock("@sentry/nextjs", () => ({
	startSpan: async <T>(_: unknown, fn: () => Promise<T>) => fn(),
	addBreadcrumb: vi.fn(),
}));
vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));
vi.mock("@/modules/cart/lib/cart-session", () => ({
	getOrCreateCartSessionId: vi.fn().mockResolvedValue("guest-1"),
	getCartSessionId: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/modules/cart/services/sku-validation.service", () => ({
	getSkusDetailsBatch: mockGetSkusDetailsBatch,
}));
vi.mock("@/modules/store-settings/services/store-closure-guard", () => ({
	assertStoreOpen: mockAssertStoreOpen,
}));
vi.mock("@/modules/orders/constants/stripe-shipping-rates", () => ({
	STRIPE_SHIPPING_OPTIONS: [],
}));
vi.mock("@/modules/payments/services/stripe-customer.service", () => ({
	getOrCreateStripeCustomer: mockGetOrCreateStripeCustomer,
}));
vi.mock("@/modules/payments/services/checkout-line-items.service", () => ({
	buildStripeLineItems: mockBuildStripeLineItems,
}));
vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
	getClientIp: vi.fn().mockResolvedValue("127.0.0.1"),
	getRateLimitIdentifier: vi.fn().mockReturnValue("guest:guest-1"),
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	PAYMENT_LIMITS: { CREATE_SESSION: "create-session" },
}));
vi.mock("@/shared/lib/logger", () => ({
	logger: { info: vi.fn(), error: vi.fn() },
}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/constants/countries", () => ({
	SHIPPING_COUNTRIES: ["FR"],
}));
vi.mock("@/shared/lib/stripe", () => ({
	stripe: {
		checkout: {
			sessions: { create: mockStripeCreate },
		},
	},
	withStripeCircuitBreaker: <T>(fn: () => Promise<T>) => fn(),
	CircuitBreakerError: class CircuitBreakerError extends Error {},
}));
vi.mock("@/shared/lib/stripe-errors", () => ({
	classifyStripeError: mockClassifyStripeError,
}));

import { createCheckoutSession } from "../create-checkout-session";

function setupDefaults() {
	mockGetSession.mockResolvedValue(null);
	mockCheckRateLimit.mockResolvedValue({ success: true });
	mockAssertStoreOpen.mockResolvedValue(null);
	mockPrisma.cart.findFirst.mockResolvedValue({
		id: "cart-1",
		updatedAt: new Date("2026-05-14T10:00:00Z"),
		appliedDiscountCode: null,
		discountAmountCache: null,
		items: [{ skuId: "sku-1", quantity: 1, priceAtAdd: 4500 }],
	});
	mockGetSkusDetailsBatch.mockResolvedValue(
		new Map([
			[
				"sku-1",
				{
					success: true,
					data: { sku: { id: "sku-1", priceInclTax: 4500 } },
				},
			],
		]),
	);
	mockBuildStripeLineItems.mockReturnValue({
		lineItems: [{ price_data: { unit_amount: 4500 }, quantity: 1 }],
		subtotal: 4500,
	});
	mockStripeCreate.mockResolvedValue({
		id: "cs_test_123",
		client_secret: "cs_secret_xyz",
	});
	mockClassifyStripeError.mockReturnValue({ kind: "unknown", severity: "warning", code: null });
}

describe("createCheckoutSession", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("passes consent_collection with terms_of_service required to Stripe", async () => {
		const result = await createCheckoutSession();
		expect(result.success).toBe(true);
		expect(mockStripeCreate).toHaveBeenCalledOnce();
		const [params] = mockStripeCreate.mock.calls[0]!;
		expect(params.consent_collection).toEqual({ terms_of_service: "required" });
	});

	it("passes custom_text.terms_of_service_acceptance.message in French", async () => {
		await createCheckoutSession();
		const [params] = mockStripeCreate.mock.calls[0]!;
		expect(params.custom_text?.terms_of_service_acceptance?.message).toMatch(
			/conditions générales de vente/,
		);
		expect(params.custom_text?.terms_of_service_acceptance?.message).toMatch(/14 jours/);
	});

	/**
	 * @regression checkout-idempotency
	 *
	 * Bug : sans idempotencyKey lié à `cart.id + cart.updatedAt`, un user qui
	 * cliquait 2× rapidement sur "Payer" pouvait créer 2 Checkout Sessions
	 * Stripe distinctes pour le même panier → risque de 2 charges si les deux
	 * étaient complétées. Stripe garantit qu'un même idempotencyKey retourne
	 * TOUJOURS la même session sur 24h.
	 *
	 * Garde-fou : la clé DOIT inclure `cart.updatedAt` pour permettre de
	 * regénérer une session si le panier change (sinon clé figée indéfiniment).
	 * Format actuel : `checkout-cart-{id}-{updatedAtMs}`.
	 */
	it("passes an idempotencyKey derived from cart id + updatedAt", async () => {
		await createCheckoutSession();
		const [, options] = mockStripeCreate.mock.calls[0]!;
		expect(options).toBeDefined();
		expect(options.idempotencyKey).toMatch(/^checkout-cart-1-\d+$/);
	});

	it("pre-fills customer_email when user is authenticated without stripeCustomerId", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: "user-1", email: "user@example.com", role: "USER", name: "Jean Dupont" },
		});
		mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: null });
		mockGetOrCreateStripeCustomer.mockResolvedValue({ error: "no-op" });

		await createCheckoutSession();
		const [params] = mockStripeCreate.mock.calls[0]!;
		expect(params.customer).toBeUndefined();
		expect(params.customer_email).toBe("user@example.com");
		expect(params.customer_creation).toBe("always");
	});

	it("does not pass customer_email when a Stripe customer is already linked", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: "user-1", email: "user@example.com", role: "USER", name: "Jean Dupont" },
		});
		mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_existing" });

		await createCheckoutSession();
		const [params] = mockStripeCreate.mock.calls[0]!;
		expect(params.customer).toBe("cus_existing");
		expect(params.customer_email).toBeUndefined();
	});

	it("returns same clientSecret on idempotent retry (Stripe replays the same session)", async () => {
		// Stripe garantit qu'avec un même idempotencyKey, on récupère la même session
		// donc le même client_secret. On simule deux appels successifs sans changer le
		// panier — l'idempotencyKey doit être identique et le clientSecret aussi.
		const first = await createCheckoutSession();
		const second = await createCheckoutSession();

		expect(first.success).toBe(true);
		expect(second.success).toBe(true);
		if (!first.success || !second.success) throw new Error("expected success");

		const [, optsFirst] = mockStripeCreate.mock.calls[0]!;
		const [, optsSecond] = mockStripeCreate.mock.calls[1]!;
		expect(optsFirst.idempotencyKey).toBe(optsSecond.idempotencyKey);
		expect(first.clientSecret).toBe(second.clientSecret);
	});

	it("regenerates idempotencyKey when cart.updatedAt changes (user modified cart)", async () => {
		await createCheckoutSession();
		const [, firstOpts] = mockStripeCreate.mock.calls[0]!;

		// Cart modifié → updatedAt change → nouvelle session attendue.
		mockPrisma.cart.findFirst.mockResolvedValueOnce({
			id: "cart-1",
			updatedAt: new Date("2026-05-14T11:00:00Z"), // +1h
			appliedDiscountCode: null,
			discountAmountCache: null,
			items: [{ skuId: "sku-1", quantity: 2, priceAtAdd: 4500 }],
		});

		await createCheckoutSession();
		const [, secondOpts] = mockStripeCreate.mock.calls[1]!;

		expect(firstOpts.idempotencyKey).not.toBe(secondOpts.idempotencyKey);
	});

	it("uses Stripe customer cache (no creation) when stripeCustomerId already linked", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: "user-1", email: "user@example.com", role: "USER", name: "Jean Dupont" },
		});
		mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_cached" });

		await createCheckoutSession();

		// Cache hit : on ne doit PAS recréer un customer.
		expect(mockGetOrCreateStripeCustomer).not.toHaveBeenCalled();
		const [params] = mockStripeCreate.mock.calls[0]!;
		expect(params.customer).toBe("cus_cached");
		expect(params.customer_creation).toBeUndefined();
	});

	it("rejects when rate limit is exceeded", async () => {
		mockCheckRateLimit.mockResolvedValue({
			success: false,
			error: "Trop de tentatives, réessayez dans 60s",
		});

		const result = await createCheckoutSession();

		expect(result.success).toBe(false);
		if (result.success) throw new Error("expected error");
		expect(result.error).toMatch(/Trop de tentatives/);
		expect(mockStripeCreate).not.toHaveBeenCalled();
	});
});
