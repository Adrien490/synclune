/**
 * @regression checkout-webhook-transition-guard
 *
 * L'idempotence des webhooks Checkout est portée par la GARDE DE TRANSITION
 * (`updateMany({ where: { stripeSessionId, status: PENDING } })`) — il n'y a
 * plus de table WebhookEvent (perte volontaire § 1 de la migration lean).
 *
 * Invariants verrouillés ici :
 * - une redélivrance (`count = 0`) est un no-op TOTAL : pas d'email, pas de
 *   numérotation, pas de restock — sinon un event `expired` rejoué
 *   regonflerait le stock à chaque redélivrance Stripe ;
 * - le restock d'une session expirée s'exécute exactement une fois, dans la
 *   même transaction que la transition, en ignorant les `variantId` null ;
 * - (lot 4) l'`invoiceNumber` est attribué dans la MÊME transaction que la
 *   transition PAID (`max + 1`), avec retry borné sur P2002 — jamais de
 *   commande PAID sans numéro, jamais de trou.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import {
	cancelOrderFromExpiredSession,
	markOrderPaidFromSession,
} from "../checkout-session-transitions.service";

// Subclass réelle obligatoire pour l'instanceof du retry P2002 (cf. CLAUDE.md,
// incident webhooks-audit-2026-05-17 : un Object.assign(new Error(), { code })
// n'est PAS instanceof correct → test « green for the wrong reason »).
// Déclarée dans vi.hoisted : vi.mock est hissé au-dessus de tout top-level.
const { FakePrismaKnownRequestError } = vi.hoisted(() => {
	class FakePrismaKnownRequestError extends Error {
		code: string;
		constructor(code: string) {
			super(`fake prisma error ${code}`);
			this.code = code;
		}
	}
	return { FakePrismaKnownRequestError };
});

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: { PrismaClientKnownRequestError: FakePrismaKnownRequestError },
}));

const mocks = vi.hoisted(() => {
	const tx = {
		order: { updateMany: vi.fn(), findUnique: vi.fn(), aggregate: vi.fn(), update: vi.fn() },
		productVariant: { updateMany: vi.fn() },
	};
	return {
		tx,
		order: { findUnique: vi.fn() },
		$transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)),
		sendOrderConfirmationEmail: vi.fn(),
	};
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { order: mocks.order, $transaction: mocks.$transaction },
}));

vi.mock("@/modules/emails/services/send-order-confirmation", () => ({
	sendOrderConfirmationEmail: mocks.sendOrderConfirmationEmail,
}));

function makeSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
	return {
		id: "cs_test_123",
		object: "checkout.session",
		payment_status: "paid",
		payment_intent: "pi_test_456",
		customer_email: null,
		customer_details: {
			email: "cliente@example.com",
			name: "Marie Dupont",
			address: null,
			business_name: null,
			individual_name: null,
			phone: null,
			tax_exempt: "none",
			tax_ids: [],
		},
		collected_information: {
			business_name: null,
			individual_name: null,
			shipping_details: {
				name: "Marie Dupont",
				address: {
					line1: "12 Rue de la Paix",
					line2: null,
					postal_code: "75002",
					city: "Paris",
					country: "FR",
					state: null,
				},
			},
		},
		...overrides,
	} as Stripe.Checkout.Session;
}

const ORDER_FOR_EMAIL = {
	id: "order-1",
	invoiceNumber: 1,
	email: "cliente@example.com",
	customerName: "Marie Dupont",
	amountItemsCents: 3800,
	amountShippingCents: 499,
	amountTotalCents: 4299,
	shippingLine1: "12 Rue de la Paix",
	shippingLine2: null,
	shippingZip: "75002",
	shippingCity: "Paris",
	shippingCountry: "FR",
	items: [{ nameSnapshot: "Collier", variantSnapshot: null, unitPriceCents: 3800, quantity: 1 }],
};

beforeEach(() => {
	vi.clearAllMocks();
	mocks.sendOrderConfirmationEmail.mockResolvedValue({ success: true, data: { id: "email-1" } });
	mocks.tx.order.aggregate.mockResolvedValue({ _max: { invoiceNumber: null } });
	mocks.tx.order.update.mockResolvedValue({});
	mocks.order.findUnique.mockResolvedValue(ORDER_FOR_EMAIL);
});

describe("markOrderPaidFromSession", () => {
	it("PENDING→PAID : écrit identité + adresse Stripe et envoie l'email APRÈS la transition", async () => {
		mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });

		const result = await markOrderPaidFromSession(makeSession());

		expect(result.outcome).toBe("transitioned");
		expect(mocks.tx.order.updateMany).toHaveBeenCalledWith({
			where: { stripeSessionId: "cs_test_123", status: "PENDING" },
			data: expect.objectContaining({
				status: "PAID",
				stripePaymentIntentId: "pi_test_456",
				email: "cliente@example.com",
				customerName: "Marie Dupont",
				shippingLine1: "12 Rue de la Paix",
				shippingZip: "75002",
				shippingCity: "Paris",
				shippingCountry: "FR",
			}),
		});
		expect(mocks.sendOrderConfirmationEmail).toHaveBeenCalledTimes(1);
	});

	it("redélivrance (count = 0) : no-op total — ni numérotation, ni email", async () => {
		mocks.tx.order.updateMany.mockResolvedValue({ count: 0 });

		const result = await markOrderPaidFromSession(makeSession());

		expect(result.outcome).toBe("noop");
		expect(mocks.tx.order.aggregate).not.toHaveBeenCalled();
		expect(mocks.tx.order.update).not.toHaveBeenCalled();
		expect(mocks.sendOrderConfirmationEmail).not.toHaveBeenCalled();
	});

	it("accepte un payment_intent EXPANDÉ (objet) comme une string", async () => {
		mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });

		await markOrderPaidFromSession(
			makeSession({
				payment_intent: { id: "pi_expanded" } as unknown as Stripe.PaymentIntent,
			}),
		);

		expect(mocks.tx.order.updateMany.mock.calls[0]?.[0].data.stripePaymentIntentId).toBe(
			"pi_expanded",
		);
	});

	it("un échec d'email ne fait PAS échouer la transition (sinon 500 → redélivrance d'un no-op)", async () => {
		mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });
		mocks.sendOrderConfirmationEmail.mockResolvedValue({
			success: false,
			error: new Error("Resend down"),
		});

		const result = await markOrderPaidFromSession(makeSession());
		expect(result.outcome).toBe("transitioned");
	});
});

describe("invoiceNumber — séquence Int sans trou (lot 4)", () => {
	it("première facture : max null → 1, écrit DANS la transaction de transition", async () => {
		mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });
		mocks.tx.order.aggregate.mockResolvedValue({ _max: { invoiceNumber: null } });

		await markOrderPaidFromSession(makeSession());

		expect(mocks.tx.order.update).toHaveBeenCalledWith({
			where: { stripeSessionId: "cs_test_123" },
			data: { invoiceNumber: 1 },
		});
	});

	it("suit la séquence : max 41 → 42", async () => {
		mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });
		mocks.tx.order.aggregate.mockResolvedValue({ _max: { invoiceNumber: 41 } });

		await markOrderPaidFromSession(makeSession());

		expect(mocks.tx.order.update).toHaveBeenCalledWith({
			where: { stripeSessionId: "cs_test_123" },
			data: { invoiceNumber: 42 },
		});
	});

	it("collision P2002 (deux webhooks concurrents) : toute la transaction est retentée", async () => {
		mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });
		mocks.tx.order.update
			.mockRejectedValueOnce(new FakePrismaKnownRequestError("P2002"))
			.mockResolvedValueOnce({});

		const result = await markOrderPaidFromSession(makeSession());

		expect(result.outcome).toBe("transitioned");
		// La transition est RE-EXÉCUTÉE avec la numérotation (même transaction) :
		// pas de commande PAID sans numéro.
		expect(mocks.$transaction).toHaveBeenCalledTimes(2);
		expect(mocks.tx.order.updateMany).toHaveBeenCalledTimes(2);
	});

	it("après 3 collisions, l'erreur remonte (le webhook répondra 500, Stripe redélivrera)", async () => {
		mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });
		mocks.tx.order.update.mockRejectedValue(new FakePrismaKnownRequestError("P2002"));

		await expect(markOrderPaidFromSession(makeSession())).rejects.toThrow();
		expect(mocks.$transaction).toHaveBeenCalledTimes(3);
		expect(mocks.sendOrderConfirmationEmail).not.toHaveBeenCalled();
	});

	it("une erreur non-P2002 ne déclenche AUCUN retry", async () => {
		mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });
		mocks.tx.order.update.mockRejectedValue(new Error("connexion perdue"));

		await expect(markOrderPaidFromSession(makeSession())).rejects.toThrow("connexion perdue");
		expect(mocks.$transaction).toHaveBeenCalledTimes(1);
	});
});

describe("cancelOrderFromExpiredSession", () => {
	it("PENDING→CANCELLED + restock par ligne, dans la même transaction", async () => {
		mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });
		mocks.tx.order.findUnique.mockResolvedValue({
			id: "order-1",
			items: [
				{
					variantId: "variant-a",
					quantity: 2,
					variant: { productId: "product-a", product: { slug: "collier-goutte" } },
				},
				// Variante supprimée entre-temps (SetNull) : rien à restocker.
				{ variantId: null, quantity: 1, variant: null },
			],
		});

		const result = await cancelOrderFromExpiredSession("cs_test_123");

		expect(result.outcome).toBe("transitioned");
		expect(mocks.tx.order.updateMany).toHaveBeenCalledWith({
			where: { stripeSessionId: "cs_test_123", status: "PENDING" },
			data: { status: "CANCELLED" },
		});
		expect(mocks.tx.productVariant.updateMany).toHaveBeenCalledTimes(1);
		expect(mocks.tx.productVariant.updateMany).toHaveBeenCalledWith({
			where: { id: "variant-a" },
			data: { stock: { increment: 2 } },
		});
	});

	it("redélivrance (count = 0) : AUCUN restock — le stock ne regonfle pas à chaque rejeu", async () => {
		mocks.tx.order.updateMany.mockResolvedValue({ count: 0 });

		const result = await cancelOrderFromExpiredSession("cs_test_123");

		expect(result.outcome).toBe("noop");
		expect(mocks.tx.order.findUnique).not.toHaveBeenCalled();
		expect(mocks.tx.productVariant.updateMany).not.toHaveBeenCalled();
	});
});
