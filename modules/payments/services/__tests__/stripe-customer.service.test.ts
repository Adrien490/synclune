import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockStripe } = vi.hoisted(() => ({
	mockStripe: {
		customers: {
			create: vi.fn(),
			update: vi.fn(),
			list: vi.fn(),
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
		// Par défaut : aucune fiche existante → le service crée. Les tests de dédupe
		// ci-dessous surchargent ce retour.
		mockStripe.customers.list.mockResolvedValue({ data: [] });
	});

	it("should create a Stripe customer and return its id", async () => {
		mockStripe.customers.create.mockResolvedValue({ id: "cus_new456" });

		const result = await getOrCreateStripeCustomer(makeParams());

		expect(result).toEqual({ customerId: "cus_new456" });
		expect(mockStripe.customers.create).toHaveBeenCalledTimes(1);
	});

	it("should use an email-based idempotency key (dédupe des requêtes CONCURRENTES)", async () => {
		mockStripe.customers.create.mockResolvedValue({ id: "cus_new" });

		await getOrCreateStripeCustomer(makeParams({ email: "test@synclune.fr" }));

		const options = mockStripe.customers.create.mock.calls[0]![1];
		// L'email est HASHÉ depuis l'audit Stripe (`api/idempotent_requests` déconseille
		// tout identifiant personnel dans la clé). On assert la FORME et l'absence de
		// fuite, pas un digest en dur — figer la valeur ne vérifierait que le SHA-256.
		//
		// `-v2` : le corps du `create` envoie désormais l'email NORMALISÉ. Garder
		// l'ancien préfixe ferait rejeter par Stripe, pendant 24 h, tout replay d'une
		// clé émise avec l'ancienne casse (« same parameters »).
		expect(options.idempotencyKey).toMatch(/^customer-create-v2-[0-9a-f]{64}$/);
		expect(options.idempotencyKey).not.toContain("test@synclune.fr");
	});

	it("should lowercase and trim the email in the idempotency key", async () => {
		mockStripe.customers.create.mockResolvedValue({ id: "cus_new" });

		await getOrCreateStripeCustomer(makeParams({ email: "  Test@Synclune.FR " }));
		await getOrCreateStripeCustomer(makeParams({ email: "test@synclune.fr" }));

		// La propriété qui compte n'est pas la valeur de la clé mais le fait que deux
		// écritures d'un même email CONVERGENT — sinon la dédupe laisserait passer un
		// doublon de client.
		const [firstCall, secondCall] = mockStripe.customers.create.mock.calls;
		expect(firstCall![1].idempotencyKey).toBe(secondCall![1].idempotencyKey);
	});

	/**
	 * @regression stripe-customer-dedupe-beyond-idempotency-window-2026-08-05
	 *
	 * Audit de conformité du modèle `Order` (Stripe 2026), constat P2.
	 *
	 * La clé d'idempotence était présentée comme « the ONLY dedupe mechanism »
	 * depuis le checkout 100 % invité. Mais **une clé d'idempotence Stripe expire
	 * au bout de 24 h** : une cliente qui recommandait la semaine suivante
	 * repartait sur un second `cus_*`. Conséquence : fiches dupliquées au
	 * Dashboard, historique fragmenté pour Radar.
	 *
	 * Parade : `customers.list({ email })` AVANT le `create`. Pas
	 * `customers.search`, que sa propre doc exclut des flux read-after-write
	 * (index à la minute, jusqu'à une heure de retard en incident) — or un
	 * ré-init de checkout arrive dans la minute.
	 *
	 * ⚠️ La dédupe ne tient que si la valeur STOCKÉE est canonique : le filtre
	 * `email` de `customers.list` est **case-sensitive**. D'où la normalisation
	 * du corps du `create`, et pas seulement de la clé.
	 */
	describe("dédupe au-delà de la fenêtre d'idempotence de 24 h (@regression)", () => {
		it("réutilise la fiche existante et ne crée RIEN", async () => {
			mockStripe.customers.list.mockResolvedValue({ data: [{ id: "cus_returning" }] });

			const result = await getOrCreateStripeCustomer(makeParams());

			expect(result).toEqual({ customerId: "cus_returning" });
			expect(mockStripe.customers.create).not.toHaveBeenCalled();
		});

		it("cherche sur l'email NORMALISÉ (le filtre Stripe est case-sensitive)", async () => {
			mockStripe.customers.list.mockResolvedValue({ data: [] });
			mockStripe.customers.create.mockResolvedValue({ id: "cus_new" });

			await getOrCreateStripeCustomer(makeParams({ email: "  Marie@Synclune.FR " }));

			expect(mockStripe.customers.list).toHaveBeenCalledWith({
				email: "marie@synclune.fr",
				limit: 1,
			});
		});

		it("stocke l'email NORMALISÉ chez Stripe — sinon la recherche suivante le manque", async () => {
			mockStripe.customers.list.mockResolvedValue({ data: [] });
			mockStripe.customers.create.mockResolvedValue({ id: "cus_new" });

			await getOrCreateStripeCustomer(makeParams({ email: "  Marie@Synclune.FR " }));

			// C'est l'assertion qui ferme la boucle : la fiche créée aujourd'hui doit
			// être retrouvable par la recherche exacte de la commande suivante.
			expect(mockStripe.customers.create.mock.calls[0]![0].email).toBe("marie@synclune.fr");
		});

		it("crée normalement quand la recherche échoue (best-effort, jamais bloquant)", async () => {
			mockStripe.customers.list.mockRejectedValue(new Error("Stripe down"));
			mockStripe.customers.create.mockResolvedValue({ id: "cus_fallback" });

			const result = await getOrCreateStripeCustomer(makeParams());

			expect(result).toEqual({ customerId: "cus_fallback" });
			expect(mockStripe.customers.create).toHaveBeenCalledTimes(1);
		});
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
