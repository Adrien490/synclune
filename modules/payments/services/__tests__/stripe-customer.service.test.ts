import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockStripe } = vi.hoisted(() => ({
	mockStripe: {
		customers: {
			create: vi.fn(),
			update: vi.fn(),
		},
	},
}));

vi.mock("@/shared/lib/stripe", () => ({
	stripe: mockStripe,
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

import { getOrCreateStripeCustomer, enrichStripeCustomer } from "../stripe-customer.service";
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
		...overrides,
	};
}

describe("getOrCreateStripeCustomer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should create a Stripe customer and return its id", async () => {
		mockStripe.customers.create.mockResolvedValue({ id: "cus_new456" });

		const result = await getOrCreateStripeCustomer(makeParams());

		expect(result).toEqual({ customerId: "cus_new456" });
		expect(mockStripe.customers.create).toHaveBeenCalledTimes(1);
	});

	it("should use email-based idempotency key (the ONLY dedupe since Lot 0 S1.1)", async () => {
		mockStripe.customers.create.mockResolvedValue({ id: "cus_new" });

		await getOrCreateStripeCustomer(makeParams({ email: "test@synclune.fr" }));

		const options = mockStripe.customers.create.mock.calls[0]![1];
		// L'email est HASHÉ depuis l'audit Stripe (`api/idempotent_requests` déconseille
		// tout identifiant personnel dans la clé). On assert la FORME et l'absence de
		// fuite, pas un digest en dur — figer la valeur ne vérifierait que le SHA-256.
		expect(options.idempotencyKey).toMatch(/^customer-create-[0-9a-f]{64}$/);
		expect(options.idempotencyKey).not.toContain("test@synclune.fr");
	});

	it("should lowercase and trim the email in the idempotency key", async () => {
		mockStripe.customers.create.mockResolvedValue({ id: "cus_new" });

		await getOrCreateStripeCustomer(makeParams({ email: "  Test@Synclune.FR " }));
		await getOrCreateStripeCustomer(makeParams({ email: "test@synclune.fr" }));

		// La propriété qui compte n'est pas la valeur de la clé mais le fait que deux
		// écritures d'un même email CONVERGENT — sinon la dédupe (seul mécanisme
		// depuis le checkout 100 % invité) laisserait passer un doublon de client.
		const [firstCall, secondCall] = mockStripe.customers.create.mock.calls;
		expect(firstCall![1].idempotencyKey).toBe(secondCall![1].idempotencyKey);
	});

	it("should map address correctly to Stripe format", async () => {
		mockStripe.customers.create.mockResolvedValue({ id: "cus_new" });

		await getOrCreateStripeCustomer(makeParams());

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

		await getOrCreateStripeCustomer(makeParams());

		const params = mockStripe.customers.create.mock.calls[0]![0];
		expect(params.name).toBe("Marie Dupont");
	});

	it("should include checkout metadata", async () => {
		mockStripe.customers.create.mockResolvedValue({ id: "cus_new" });

		await getOrCreateStripeCustomer(makeParams());

		const params = mockStripe.customers.create.mock.calls[0]![0];
		expect(params.metadata).toEqual({
			source: "checkout_b2c",
			createdFrom: "synclune-bijoux",
		});
	});

	it("should omit name and address when init passes empty strings (abandoned funnel)", async () => {
		mockStripe.customers.create.mockResolvedValue({ id: "cus_new" });

		await getOrCreateStripeCustomer(
			makeParams({
				firstName: "",
				lastName: "",
				phoneNumber: null,
				address: { addressLine1: "", postalCode: "", city: "" },
			}),
		);

		const params = mockStripe.customers.create.mock.calls[0]![0];
		expect(params).not.toHaveProperty("name");
		expect(params).not.toHaveProperty("address");
		expect(params).not.toHaveProperty("phone");
	});

	it("should return error message for invalid email (StripeInvalidRequestError)", async () => {
		mockStripe.customers.create.mockRejectedValue(
			new Stripe.errors.StripeInvalidRequestError(
				"Invalid email" as unknown as Stripe.StripeRawError,
			),
		);

		const result = await getOrCreateStripeCustomer(makeParams());

		expect(result).toEqual({
			customerId: null,
			error: "Impossible de créer le profil client de paiement.",
		});
	});

	it("should return null customerId without error for transient errors", async () => {
		mockStripe.customers.create.mockRejectedValue(new Error("Network timeout"));

		const result = await getOrCreateStripeCustomer(makeParams());

		expect(result).toEqual({ customerId: null });
	});

	it("should default country to FR when null", async () => {
		mockStripe.customers.create.mockResolvedValue({ id: "cus_new" });

		await getOrCreateStripeCustomer(
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

describe("enrichStripeCustomer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should update the customer with name, address and phone (not create)", async () => {
		mockStripe.customers.update.mockResolvedValue({ id: "cus_x" });

		await enrichStripeCustomer("cus_x", {
			name: "Marie Dupont",
			address: {
				addressLine1: "12 Rue de la Paix",
				addressLine2: null,
				postalCode: "75001",
				city: "Paris",
				country: "FR",
			},
			phoneNumber: "+33612345678",
		});

		expect(mockStripe.customers.create).not.toHaveBeenCalled();
		expect(mockStripe.customers.update).toHaveBeenCalledWith("cus_x", {
			name: "Marie Dupont",
			address: {
				line1: "12 Rue de la Paix",
				line2: undefined,
				postal_code: "75001",
				city: "Paris",
				country: "FR",
			},
			phone: "+33612345678",
		});
	});

	it("should default country to FR and omit empty name/phone", async () => {
		mockStripe.customers.update.mockResolvedValue({ id: "cus_x" });

		await enrichStripeCustomer("cus_x", {
			name: "",
			address: { addressLine1: "1 Main St", postalCode: "75001", city: "Paris", country: null },
		});

		const [id, payload] = mockStripe.customers.update.mock.calls[0]!;
		expect(id).toBe("cus_x");
		expect(payload).not.toHaveProperty("name");
		expect(payload).not.toHaveProperty("phone");
		expect(payload.address.country).toBe("FR");
	});

	it("should swallow Stripe errors (best-effort, never throws)", async () => {
		mockStripe.customers.update.mockRejectedValue(new Error("Stripe down"));

		await expect(
			enrichStripeCustomer("cus_x", {
				name: "Marie Dupont",
				address: { addressLine1: "1 Main St", postalCode: "75001", city: "Paris", country: "FR" },
			}),
		).resolves.toBeUndefined();
	});
});
