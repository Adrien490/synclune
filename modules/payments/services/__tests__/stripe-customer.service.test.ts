import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockStripe, mockPrisma } = vi.hoisted(() => ({
	mockStripe: {
		customers: {
			create: vi.fn(),
		},
	},
	mockPrisma: {
		user: {
			update: vi.fn(),
		},
	},
}));

vi.mock("@/shared/lib/stripe", () => ({
	stripe: mockStripe,
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

// Mock Stripe class for error type checking
vi.mock("stripe", () => {
	class StripeInvalidRequestError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "StripeInvalidRequestError";
		}
	}
	return {
		default: {
			errors: {
				StripeInvalidRequestError,
			},
		},
	};
});

import { getOrCreateStripeCustomer } from "../stripe-customer.service";
import Stripe from "stripe";

function makeParams(overrides = {}) {
	return {
		email: "client@example.com",
		firstName: "Marie",
		lastName: "Dupont",
		address: {
			addressLine1: "12 Rue de la Paix",
			addressLine2: null,
			postalCode: "75001",
			city: "Paris",
			country: "FR",
		},
		phoneNumber: "+33612345678",
		userId: "user_123",
		...overrides,
	};
}

describe("getOrCreateStripeCustomer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return existing customer ID without calling Stripe", async () => {
		const result = await getOrCreateStripeCustomer("cus_existing123", makeParams());

		expect(result).toEqual({ customerId: "cus_existing123" });
		expect(mockStripe.customers.create).not.toHaveBeenCalled();
	});

	it("should create a new Stripe customer when none exists", async () => {
		mockStripe.customers.create.mockResolvedValue({ id: "cus_new456" });

		const result = await getOrCreateStripeCustomer(null, makeParams());

		expect(result).toEqual({ customerId: "cus_new456" });
		expect(mockStripe.customers.create).toHaveBeenCalledTimes(1);
	});

	it("should use email-based idempotency key", async () => {
		mockStripe.customers.create.mockResolvedValue({ id: "cus_new" });

		await getOrCreateStripeCustomer(null, makeParams({ email: "test@synclune.fr" }));

		const options = mockStripe.customers.create.mock.calls[0]![1];
		expect(options.idempotencyKey).toBe("customer-create-test@synclune.fr");
	});

	it("should map address correctly to Stripe format", async () => {
		mockStripe.customers.create.mockResolvedValue({ id: "cus_new" });

		await getOrCreateStripeCustomer(null, makeParams());

		const params = mockStripe.customers.create.mock.calls[0]![0];
		expect(params.address).toEqual({
			line1: "12 Rue de la Paix",
			line2: undefined,
			postal_code: "75001",
			city: "Paris",
			country: "FR",
		});
	});

	it("should set full name from firstName + lastName", async () => {
		mockStripe.customers.create.mockResolvedValue({ id: "cus_new" });

		await getOrCreateStripeCustomer(null, makeParams());

		const params = mockStripe.customers.create.mock.calls[0]![0];
		expect(params.name).toBe("Marie Dupont");
	});

	it("should include checkout metadata", async () => {
		mockStripe.customers.create.mockResolvedValue({ id: "cus_new" });

		await getOrCreateStripeCustomer(null, makeParams());

		const params = mockStripe.customers.create.mock.calls[0]![0];
		expect(params.metadata).toEqual({
			source: "checkout_b2c",
			createdFrom: "synclune-bijoux",
		});
	});

	it("should save Stripe customer ID to user record for authenticated users", async () => {
		mockStripe.customers.create.mockResolvedValue({ id: "cus_new789" });
		mockPrisma.user.update.mockResolvedValue({});

		await getOrCreateStripeCustomer(null, makeParams({ userId: "user_abc" }));

		expect(mockPrisma.user.update).toHaveBeenCalledWith({
			where: { id: "user_abc" },
			data: { stripeCustomerId: "cus_new789" },
		});
	});

	it("should not update user record for guest checkout", async () => {
		mockStripe.customers.create.mockResolvedValue({ id: "cus_new" });

		await getOrCreateStripeCustomer(null, makeParams({ userId: null }));

		expect(mockPrisma.user.update).not.toHaveBeenCalled();
	});

	it("should return error message for invalid email (StripeInvalidRequestError)", async () => {
		mockStripe.customers.create.mockRejectedValue(
			new Stripe.errors.StripeInvalidRequestError(
				"Invalid email" as unknown as Stripe.StripeRawError,
			),
		);

		const result = await getOrCreateStripeCustomer(null, makeParams());

		expect(result).toEqual({
			customerId: null,
			error: "Email invalide pour la creation du profil client.",
		});
	});

	it("should return null customerId without error for transient errors", async () => {
		mockStripe.customers.create.mockRejectedValue(new Error("Network timeout"));

		const result = await getOrCreateStripeCustomer(null, makeParams());

		expect(result).toEqual({ customerId: null });
	});

	it("should default country to FR when null", async () => {
		mockStripe.customers.create.mockResolvedValue({ id: "cus_new" });

		await getOrCreateStripeCustomer(
			null,
			makeParams({
				address: {
					addressLine1: "1 Main St",
					postalCode: "75001",
					city: "Paris",
					country: null,
				},
			}),
		);

		const params = mockStripe.customers.create.mock.calls[0]![0];
		expect(params.address.country).toBe("FR");
	});
});
