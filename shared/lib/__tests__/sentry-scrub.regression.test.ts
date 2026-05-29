/**
 * @regression stripe-pci-audit-sentry-scrub
 *
 * Audit sécurité Stripe / PCI 2026-05-29 :
 * `beforeSend` n'applique aucun masquage par défaut — `contexts.custom` (via
 * `logger.error`), `extra` et `breadcrumbs[].data` partent tels quels. Une erreur
 * Stripe peut embarquer un `payment_intent` (donc un `client_secret`), et un
 * appelant peut mettre un email/téléphone dans le `context`.
 *
 * Ce test verrouille le scrubber `scrubSentryEvent` câblé dans les 3 configs
 * Sentry (server / edge / client). Toute régression qui laisserait fuiter un
 * `client_secret` ou un PII dans un event Sentry doit casser ici.
 */
import { describe, it, expect } from "vitest";
import { scrubSentryEvent } from "../sentry-scrub";

describe("scrubSentryEvent", () => {
	it("masque client_secret embarqué dans contexts.custom (erreur Stripe)", () => {
		const event = {
			contexts: {
				custom: {
					orderId: "ord_123",
					payment_intent: {
						id: "pi_abc",
						client_secret: "pi_abc_secret_xyz",
						status: "requires_payment_method",
					},
				},
			},
		};

		const scrubbed = scrubSentryEvent(event);
		const serialized = JSON.stringify(scrubbed);

		expect(serialized).not.toContain("pi_abc_secret_xyz");
		expect(serialized).not.toContain("secret");
		// L'orderId (non sensible) reste exploitable pour le triage.
		expect(scrubbed.contexts.custom.orderId).toBe("ord_123");
	});

	it("masque les variantes camelCase (clientSecret, paymentIntent)", () => {
		const event = {
			extra: {
				clientSecret: "pi_x_secret_y",
				paymentMethod: { card: { last4: "4242" } },
			},
		};

		const scrubbed = scrubSentryEvent(event) as { extra: Record<string, unknown> };

		expect(scrubbed.extra.clientSecret).toBe("[REDACTED]");
		expect(scrubbed.extra.paymentMethod).toBe("[REDACTED]");
	});

	it("masque les PII (email, phone, adresse) où qu'ils soient", () => {
		const event = {
			contexts: {
				custom: {
					customerEmail: "client@example.com",
					shippingPhone: "+33612345678",
					address1: "12 rue des Lilas",
					service: "checkout",
				},
			},
		};

		const scrubbed = scrubSentryEvent(event);
		const serialized = JSON.stringify(scrubbed);

		expect(serialized).not.toContain("client@example.com");
		expect(serialized).not.toContain("33612345678");
		expect(serialized).not.toContain("rue des Lilas");
		expect(scrubbed.contexts.custom.service).toBe("checkout");
	});

	it("masque dans breadcrumbs[].data", () => {
		const event = {
			breadcrumbs: [
				{ category: "navigation", message: "push /checkout" },
				{ category: "log", data: { email: "leak@example.com", route: "/paiement" } },
			],
		};

		const scrubbed = scrubSentryEvent(event) as {
			breadcrumbs: Array<{ data?: Record<string, unknown> }>;
		};

		expect(JSON.stringify(scrubbed)).not.toContain("leak@example.com");
		expect(scrubbed.breadcrumbs[1]?.data?.route).toBe("/paiement");
	});

	it("masque les champs carte bruts (cvc, cardNumber, pan)", () => {
		const event = {
			extra: { cvc: "123", cardNumber: "4242424242424242", pan: "4242424242424242" },
		};

		const scrubbed = scrubSentryEvent(event) as { extra: Record<string, unknown> };

		expect(scrubbed.extra.cvc).toBe("[REDACTED]");
		expect(scrubbed.extra.cardNumber).toBe("[REDACTED]");
		expect(scrubbed.extra.pan).toBe("[REDACTED]");
	});

	it("ne mute pas les events sans contexts/extra/breadcrumbs", () => {
		const event = { message: "boom", level: "error" };
		expect(scrubSentryEvent(event)).toEqual({ message: "boom", level: "error" });
	});
});
