/**
 * @regression checkout-webhook-transition-guard
 *
 * L'idempotence des webhooks Checkout est portée par la GARDE DE TRANSITION
 * (`updateMany({ where: { stripeSessionId, status: PENDING } })`) — il n'y a
 * plus de table WebhookEvent (perte volontaire § 1 de la migration lean).
 *
 * Deux invariants verrouillés ici :
 * - une redélivrance (`count = 0`) est un no-op TOTAL : pas d'email, pas de
 *   restock — sinon un event `expired` rejoué regonflerait le stock à chaque
 *   redélivrance Stripe ;
 * - le restock d'une session expirée s'exécute exactement une fois, dans la
 *   même transaction que la transition, en ignorant les `variantId` null.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import {
	cancelOrderFromExpiredSession,
	markOrderPaidFromSession,
} from "../checkout-session-transitions.service";

const mocks = vi.hoisted(() => {
	const tx = {
		order: { updateMany: vi.fn(), findUnique: vi.fn() },
		productVariant: { updateMany: vi.fn() },
	};
	return {
		tx,
		order: { updateMany: vi.fn(), findUnique: vi.fn() },
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
});

describe("markOrderPaidFromSession", () => {
	it("PENDING→PAID : écrit identité + adresse Stripe et envoie l'email APRÈS la transition", async () => {
		mocks.order.updateMany.mockResolvedValue({ count: 1 });
		mocks.order.findUnique.mockResolvedValue(ORDER_FOR_EMAIL);

		const result = await markOrderPaidFromSession(makeSession());

		expect(result.outcome).toBe("transitioned");
		expect(mocks.order.updateMany).toHaveBeenCalledWith({
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

	it("redélivrance (count = 0) : no-op total, AUCUN email", async () => {
		mocks.order.updateMany.mockResolvedValue({ count: 0 });

		const result = await markOrderPaidFromSession(makeSession());

		expect(result.outcome).toBe("noop");
		expect(mocks.order.findUnique).not.toHaveBeenCalled();
		expect(mocks.sendOrderConfirmationEmail).not.toHaveBeenCalled();
	});

	it("accepte un payment_intent EXPANDÉ (objet) comme une string", async () => {
		mocks.order.updateMany.mockResolvedValue({ count: 1 });
		mocks.order.findUnique.mockResolvedValue(ORDER_FOR_EMAIL);

		await markOrderPaidFromSession(
			makeSession({
				payment_intent: { id: "pi_expanded" } as unknown as Stripe.PaymentIntent,
			}),
		);

		expect(mocks.order.updateMany.mock.calls[0]?.[0].data.stripePaymentIntentId).toBe(
			"pi_expanded",
		);
	});

	it("un échec d'email ne fait PAS échouer la transition (sinon 500 → redélivrance d'un no-op)", async () => {
		mocks.order.updateMany.mockResolvedValue({ count: 1 });
		mocks.order.findUnique.mockResolvedValue(ORDER_FOR_EMAIL);
		mocks.sendOrderConfirmationEmail.mockResolvedValue({
			success: false,
			error: new Error("Resend down"),
		});

		const result = await markOrderPaidFromSession(makeSession());
		expect(result.outcome).toBe("transitioned");
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
