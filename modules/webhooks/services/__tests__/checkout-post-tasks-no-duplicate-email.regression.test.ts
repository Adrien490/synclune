/**
 * @regression webhook-double-fire-no-duplicate-email
 *
 * Garde-fou EMAIL-AUDIT-002 + EMAIL-AUDIT-010 :
 * Si `buildPostCheckoutTasks` ou `buildPostCheckoutTasksFromPI` est appelé 2× sur la
 * même commande (cas réel : `cron retry-webhooks` rejoue checkout.session.completed),
 * la task ORDER_CONFIRMATION_EMAIL doit porter une `idempotencyKey` STABLE — Resend
 * dédupera côté serveur sur 24 h — et apparaître EXACTEMENT une fois par build.
 *
 * Verrouille aussi le retrait de l'email admin « nouvelle commande » : aucune task
 * ADMIN_NEW_ORDER_EMAIL ne doit plus être émise par ces builders.
 *
 * Si quelqu'un supprime l'`idempotencyKey`, le rend variable (timestamp, nonce…),
 * duplique la confirmation client, ou réintroduit l'email admin, ce test échoue et
 * bloque la régression.
 */
import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: () => "https://example.test",
	ROUTES: {
		ADMIN: {
			ORDER_DETAIL: (id: string) => `/admin/ventes/commandes/${id}`,
		},
	},
}));

vi.mock("@/modules/orders/utils/invoice-token", () => ({
	generateInvoiceAccessToken: () => "token-stub",
}));

import {
	buildPostCheckoutTasks,
	buildPostCheckoutTasksFromPI,
} from "../checkout-post-tasks.service";
import type { OrderWithItems } from "../../types/checkout.types";

function makeOrder(overrides: Partial<OrderWithItems> = {}): OrderWithItems {
	return {
		id: "order_42",
		orderNumber: "ORD-042",
		userId: "user_1",
		customerEmail: "buyer@example.test",
		shippingFirstName: "Jane",
		shippingLastName: "Doe",
		shippingAddress1: "1 rue de Test",
		shippingAddress2: null,
		shippingPostalCode: "75001",
		shippingCity: "Paris",
		shippingCountry: "FR",
		shippingPhone: "+33600000000",
		subtotal: 10_000,
		discountAmount: 0,
		shippingCost: 500,
		taxAmount: 0,
		total: 10_500,
		items: [
			{
				productTitle: "Collier Étoile",
				skuColor: "Or",
				skuMaterial: "Or 18k",
				skuSize: "M",
				quantity: 1,
				price: 10_000,
				skuId: "sku_1",
				sku: { id: "sku_1", inventory: 0, sku: "ETO-OR-M" },
			},
		],
		...overrides,
	};
}

function makeSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
	return {
		id: "cs_test_1",
		customer_email: "buyer@example.test",
		customer_details: null,
		metadata: {},
		...overrides,
	} as unknown as Stripe.Checkout.Session;
}

function makePaymentIntent(overrides: Partial<Stripe.PaymentIntent> = {}): Stripe.PaymentIntent {
	return {
		id: "pi_test_1",
		receipt_email: "buyer@example.test",
		metadata: {},
		...overrides,
	} as unknown as Stripe.PaymentIntent;
}

describe("checkout-post-tasks — webhook double-fire no duplicate email", () => {
	it("emits ORDER_CONFIRMATION_EMAIL exactly once with a stable idempotencyKey across two builds", () => {
		const order = makeOrder();
		const a = buildPostCheckoutTasks(order, makeSession());
		const b = buildPostCheckoutTasks(order, makeSession());
		const emailsA = a.filter((t) => t.type === "ORDER_CONFIRMATION_EMAIL");
		const emailsB = b.filter((t) => t.type === "ORDER_CONFIRMATION_EMAIL");
		expect(emailsA).toHaveLength(1);
		expect(emailsB).toHaveLength(1);
		const taskA = emailsA[0];
		const taskB = emailsB[0];
		if (taskA?.type !== "ORDER_CONFIRMATION_EMAIL") throw new Error("expected email task A");
		if (taskB?.type !== "ORDER_CONFIRMATION_EMAIL") throw new Error("expected email task B");
		expect(taskA.data.idempotencyKey).toBe("order-confirm-order_42");
		expect(taskB.data.idempotencyKey).toBe(taskA.data.idempotencyKey);
	});

	it("never emits an admin new-order task (removed)", () => {
		const order = makeOrder();
		const tasks = buildPostCheckoutTasks(order, makeSession());
		expect(tasks.map((t) => t.type as string)).not.toContain("ADMIN_NEW_ORDER_EMAIL");
	});

	it("PI flow emits ORDER_CONFIRMATION_EMAIL exactly once with the same stable idempotencyKey", () => {
		const order = makeOrder();
		const a = buildPostCheckoutTasksFromPI(order, makePaymentIntent());
		const b = buildPostCheckoutTasksFromPI(order, makePaymentIntent());
		const emailsA = a.filter((t) => t.type === "ORDER_CONFIRMATION_EMAIL");
		const emailsB = b.filter((t) => t.type === "ORDER_CONFIRMATION_EMAIL");
		expect(emailsA).toHaveLength(1);
		expect(emailsB).toHaveLength(1);
		const taskA = emailsA[0];
		const taskB = emailsB[0];
		if (taskA?.type !== "ORDER_CONFIRMATION_EMAIL") throw new Error("expected email task A");
		if (taskB?.type !== "ORDER_CONFIRMATION_EMAIL") throw new Error("expected email task B");
		expect(taskA.data.idempotencyKey).toBe("order-confirm-order_42");
		expect(taskB.data.idempotencyKey).toBe(taskA.data.idempotencyKey);
	});

	it("PI flow never emits an admin new-order task (removed)", () => {
		const order = makeOrder();
		const tasks = buildPostCheckoutTasksFromPI(order, makePaymentIntent());
		expect(tasks.map((t) => t.type as string)).not.toContain("ADMIN_NEW_ORDER_EMAIL");
	});
});
