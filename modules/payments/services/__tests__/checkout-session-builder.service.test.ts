import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockStripe,
	mockGetInvoiceFooter,
	mockWithStripeCircuitBreaker,
	mockGetShippingOptionsForAddress,
} = vi.hoisted(() => ({
	mockStripe: {
		checkout: {
			sessions: {
				create: vi.fn(),
			},
		},
	},
	mockGetInvoiceFooter: vi.fn(),
	mockWithStripeCircuitBreaker: vi.fn(),
	mockGetShippingOptionsForAddress: vi.fn(),
}));

vi.mock("@/shared/lib/stripe", () => ({
	stripe: mockStripe,
	getInvoiceFooter: mockGetInvoiceFooter,
	withStripeCircuitBreaker: mockWithStripeCircuitBreaker,
}));

vi.mock("@/modules/orders/constants/stripe-shipping-rates", () => ({
	getShippingOptionsForAddress: mockGetShippingOptionsForAddress,
}));

import { createStripeCheckoutSession } from "../checkout-session-builder.service";

function makeParams(overrides = {}) {
	return {
		lineItems: [{ price_data: { currency: "eur", unit_amount: 2990 }, quantity: 1 }],
		stripeCustomerId: null,
		finalEmail: "client@example.com",
		orderId: "order_abc123",
		orderNumber: "SYN-2026-0001",
		userId: "user_123",
		sessionId: null,
		shippingCountry: "FR" as const,
		shippingPostalCode: "75001",
		...overrides,
	};
}

describe("createStripeCheckoutSession", () => {
	const mockSession = { id: "cs_test_123", url: "https://checkout.stripe.com" };

	beforeEach(() => {
		vi.clearAllMocks();
		process.env.BETTER_AUTH_URL = "https://synclune.fr";
		mockGetInvoiceFooter.mockReturnValue("Synclune - SIRET xxx");
		mockGetShippingOptionsForAddress.mockReturnValue([{ shipping_rate: "shr_fr" }]);
		mockWithStripeCircuitBreaker.mockImplementation((fn: () => unknown) => fn());
		mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);
	});

	it("should create a checkout session with correct mode and ui_mode", async () => {
		await createStripeCheckoutSession(makeParams());

		const createCall = mockStripe.checkout.sessions.create.mock.calls[0]!;
		expect(createCall[0].mode).toBe("payment");
		expect(createCall[0].ui_mode).toBe("embedded");
	});

	it("should use orderId as idempotency key", async () => {
		await createStripeCheckoutSession(makeParams({ orderId: "order_xyz" }));

		const options = mockStripe.checkout.sessions.create.mock.calls[0]![1];
		expect(options.idempotencyKey).toBe("checkout-order_xyz");
	});

	it("should set client_reference_id to orderId", async () => {
		await createStripeCheckoutSession(makeParams({ orderId: "order_abc" }));

		const params = mockStripe.checkout.sessions.create.mock.calls[0]![0];
		expect(params.client_reference_id).toBe("order_abc");
	});

	it("should use customer_email for guests without Stripe customer", async () => {
		await createStripeCheckoutSession(
			makeParams({ stripeCustomerId: null, finalEmail: "guest@example.com" }),
		);

		const params = mockStripe.checkout.sessions.create.mock.calls[0]![0];
		expect(params.customer).toBeUndefined();
		expect(params.customer_email).toBe("guest@example.com");
	});

	it("should use existing Stripe customer when available", async () => {
		await createStripeCheckoutSession(makeParams({ stripeCustomerId: "cus_abc123" }));

		const params = mockStripe.checkout.sessions.create.mock.calls[0]![0];
		expect(params.customer).toBe("cus_abc123");
		expect(params.customer_email).toBeUndefined();
	});

	it("should include metadata with orderId, orderNumber, and userId", async () => {
		await createStripeCheckoutSession(
			makeParams({ orderId: "order_1", orderNumber: "SYN-001", userId: "user_1" }),
		);

		const params = mockStripe.checkout.sessions.create.mock.calls[0]![0];
		expect(params.metadata).toEqual(
			expect.objectContaining({
				orderId: "order_1",
				orderNumber: "SYN-001",
				userId: "user_1",
			}),
		);
	});

	it("should set userId to 'guest' when no userId", async () => {
		await createStripeCheckoutSession(makeParams({ userId: null }));

		const params = mockStripe.checkout.sessions.create.mock.calls[0]![0];
		expect(params.metadata.userId).toBe("guest");
	});

	it("should include guestSessionId in metadata when sessionId provided", async () => {
		await createStripeCheckoutSession(makeParams({ sessionId: "session_xyz" }));

		const params = mockStripe.checkout.sessions.create.mock.calls[0]![0];
		expect(params.metadata.guestSessionId).toBe("session_xyz");
	});

	it("should not include guestSessionId when sessionId is null", async () => {
		await createStripeCheckoutSession(makeParams({ sessionId: null }));

		const params = mockStripe.checkout.sessions.create.mock.calls[0]![0];
		expect(params.metadata.guestSessionId).toBeUndefined();
	});

	it("should apply discount coupon when provided", async () => {
		await createStripeCheckoutSession(makeParams({ stripeCouponId: "coupon_abc" }));

		const params = mockStripe.checkout.sessions.create.mock.calls[0]![0];
		expect(params.discounts).toEqual([{ coupon: "coupon_abc" }]);
	});

	it("should not include discounts when no coupon", async () => {
		await createStripeCheckoutSession(makeParams());

		const params = mockStripe.checkout.sessions.create.mock.calls[0]![0];
		expect(params.discounts).toBeUndefined();
	});

	it("should set return URL with session_id and order_id", async () => {
		await createStripeCheckoutSession(makeParams({ orderId: "order_abc" }));

		const params = mockStripe.checkout.sessions.create.mock.calls[0]![0];
		expect(params.return_url).toBe(
			"https://synclune.fr/paiement/retour?session_id={CHECKOUT_SESSION_ID}&order_id=order_abc",
		);
	});

	it("should set locale to French", async () => {
		await createStripeCheckoutSession(makeParams());

		const params = mockStripe.checkout.sessions.create.mock.calls[0]![0];
		expect(params.locale).toBe("fr");
	});

	it("should configure shipping options for the given address", async () => {
		await createStripeCheckoutSession(
			makeParams({ shippingCountry: "FR", shippingPostalCode: "75001" }),
		);

		expect(mockGetShippingOptionsForAddress).toHaveBeenCalledWith("FR", "75001");
	});

	it("should enable invoice creation with order metadata", async () => {
		await createStripeCheckoutSession(makeParams({ orderId: "order_1", orderNumber: "SYN-001" }));

		const params = mockStripe.checkout.sessions.create.mock.calls[0]![0];
		expect(params.invoice_creation.enabled).toBe(true);
		expect(params.invoice_creation.invoice_data.metadata).toEqual({
			orderNumber: "SYN-001",
			orderId: "order_1",
		});
		expect(params.invoice_creation.invoice_data.description).toBe("Commande SYN-001");
	});

	it("should set a 30-minute expiration", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-03-01T12:00:00Z"));

		await createStripeCheckoutSession(makeParams());

		const params = mockStripe.checkout.sessions.create.mock.calls[0]![0];
		const expectedExpiration =
			Math.floor(new Date("2026-03-01T12:00:00Z").getTime() / 1000) + 30 * 60;
		expect(params.expires_at).toBe(expectedExpiration);
	});

	it("should use circuit breaker wrapper", async () => {
		await createStripeCheckoutSession(makeParams());

		expect(mockWithStripeCircuitBreaker).toHaveBeenCalledTimes(1);
	});
});
