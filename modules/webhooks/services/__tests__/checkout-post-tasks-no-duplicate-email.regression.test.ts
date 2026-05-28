/**
 * @regression webhook-double-fire-no-duplicate-email
 *
 * Garde-fou EMAIL-AUDIT-002 + EMAIL-AUDIT-010 :
 * Si `buildPostCheckoutTasks` ou `buildPostCheckoutTasksFromPI` est appelé 2× sur la
 * même commande (cas réel : `cron retry-webhooks` rejoue checkout.session.completed),
 * les tasks ORDER_CONFIRMATION_EMAIL et ADMIN_NEW_ORDER_EMAIL doivent porter une
 * `idempotencyKey` STABLE — Resend dédupera côté serveur sur 24 h.
 *
 * Si quelqu'un supprime l'`idempotencyKey` ou le rend variable (timestamp, nonce…),
 * ce test échoue et bloque la régression.
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
	it("emits ORDER_CONFIRMATION_EMAIL with stable idempotencyKey across two builds", () => {
		const order = makeOrder();
		const a = buildPostCheckoutTasks(order, makeSession());
		const b = buildPostCheckoutTasks(order, makeSession());
		const taskA = a.find((t) => t.type === "ORDER_CONFIRMATION_EMAIL");
		const taskB = b.find((t) => t.type === "ORDER_CONFIRMATION_EMAIL");
		if (taskA?.type !== "ORDER_CONFIRMATION_EMAIL") throw new Error("expected email task A");
		if (taskB?.type !== "ORDER_CONFIRMATION_EMAIL") throw new Error("expected email task B");
		expect(taskA.data.idempotencyKey).toBe("order-confirm-order_42");
		expect(taskB.data.idempotencyKey).toBe(taskA.data.idempotencyKey);
	});

	it("emits ADMIN_NEW_ORDER_EMAIL with orderId propagated for idempotencyKey downstream", () => {
		const order = makeOrder();
		const tasks = buildPostCheckoutTasks(order, makeSession());
		const adminTask = tasks.find((t) => t.type === "ADMIN_NEW_ORDER_EMAIL");
		if (adminTask?.type !== "ADMIN_NEW_ORDER_EMAIL") throw new Error("expected admin task");
		// `orderId` est obligatoire et identifie la commande pour la idempotencyKey
		// `admin-new-order:${orderId}` posée dans sendAdminNewOrderEmail.
		expect(adminTask.data.orderId).toBe("order_42");
	});

	it("PI flow emits the same stable idempotencyKey on ORDER_CONFIRMATION_EMAIL", () => {
		const order = makeOrder();
		const a = buildPostCheckoutTasksFromPI(order, makePaymentIntent());
		const b = buildPostCheckoutTasksFromPI(order, makePaymentIntent());
		const taskA = a.find((t) => t.type === "ORDER_CONFIRMATION_EMAIL");
		const taskB = b.find((t) => t.type === "ORDER_CONFIRMATION_EMAIL");
		if (taskA?.type !== "ORDER_CONFIRMATION_EMAIL") throw new Error("expected email task A");
		if (taskB?.type !== "ORDER_CONFIRMATION_EMAIL") throw new Error("expected email task B");
		expect(taskA.data.idempotencyKey).toBe("order-confirm-order_42");
		expect(taskB.data.idempotencyKey).toBe(taskA.data.idempotencyKey);
	});

	it("PI flow emits ADMIN_NEW_ORDER_EMAIL with orderId propagated", () => {
		const order = makeOrder();
		const tasks = buildPostCheckoutTasksFromPI(order, makePaymentIntent());
		const adminTask = tasks.find((t) => t.type === "ADMIN_NEW_ORDER_EMAIL");
		if (adminTask?.type !== "ADMIN_NEW_ORDER_EMAIL") throw new Error("expected admin task");
		expect(adminTask.data.orderId).toBe("order_42");
	});
});
