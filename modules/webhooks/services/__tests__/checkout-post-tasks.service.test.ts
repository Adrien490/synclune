import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

const { mockGetBaseUrl, mockROUTES } = vi.hoisted(() => ({
	mockGetBaseUrl: vi.fn(() => "https://example.test"),
	mockROUTES: {
		ADMIN: {
			ORDER_DETAIL: (id: string) => `/admin/ventes/commandes/${id}`,
		},
	},
}));

vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: mockGetBaseUrl,
	ROUTES: mockROUTES,
}));

import { buildPostCheckoutTasks } from "../checkout-post-tasks.service";
import type { OrderWithItems } from "../../types/checkout.types";

function makeOrder(overrides: Partial<OrderWithItems> = {}): OrderWithItems {
	return {
		id: "order_1",
		orderNumber: "ORD-001",
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
				skuColorHexes: "#FFD700",
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
		customer_email: "stripe@example.test",
		customer_details: null,
		metadata: {},
		...overrides,
	} as unknown as Stripe.Checkout.Session;
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("buildPostCheckoutTasks", () => {
	it("emits cache invalidation including order, user cart, and SKU stock tags", () => {
		const order = makeOrder({ userId: "user_42" });
		const session = makeSession();

		const tasks = buildPostCheckoutTasks(order, session);
		const cacheTask = tasks.find((t) => t.type === "INVALIDATE_CACHE");

		expect(cacheTask).toBeDefined();
		expect(cacheTask?.tags).toContain("orders-list");
		expect(cacheTask?.tags).toContain("orders-user-user_42");
		expect(cacheTask?.tags).toContain("last-order-user-user_42");
		expect(cacheTask?.tags).toContain("sku-stock-sku_1");
		expect(cacheTask?.tags).toContain("cart-user-user_42");
	});

	it("uses guestSessionId from metadata when order has no userId", () => {
		const order = makeOrder({ userId: null });
		const session = makeSession({ metadata: { guestSessionId: "guest_abc" } });

		const tasks = buildPostCheckoutTasks(order, session);
		const cacheTask = tasks.find((t) => t.type === "INVALIDATE_CACHE");

		expect(cacheTask?.tags).toContain("cart-session-guest_abc");
		expect(cacheTask?.tags.every((t) => !t.includes("orders-user-"))).toBe(true);
	});

	it("emits ORDER_CONFIRMATION_EMAIL when customer email available (from customer_email)", () => {
		const order = makeOrder();
		const session = makeSession({ customer_email: "buyer@example.test" });

		const tasks = buildPostCheckoutTasks(order, session);
		const email = tasks.find((t) => t.type === "ORDER_CONFIRMATION_EMAIL");

		expect(email).toBeDefined();
		if (email?.type !== "ORDER_CONFIRMATION_EMAIL") throw new Error("type guard");
		expect(email.data.to).toBe("buyer@example.test");
		expect(email.data.orderNumber).toBe("ORD-001");
		expect(email.data.items[0]?.productTitle).toBe("Collier Étoile");
		expect(email.data.trackingUrl).toBe("https://example.test/orders");
	});

	it("falls back to customer_details.email when customer_email is null", () => {
		const order = makeOrder();
		const session = makeSession({
			customer_email: null,
			customer_details: { email: "details@example.test" } as NonNullable<
				Stripe.Checkout.Session["customer_details"]
			>,
		});

		const tasks = buildPostCheckoutTasks(order, session);
		const email = tasks.find((t) => t.type === "ORDER_CONFIRMATION_EMAIL");
		if (email?.type !== "ORDER_CONFIRMATION_EMAIL") throw new Error("expected email task");
		expect(email.data.to).toBe("details@example.test");
	});

	it("skips customer email task when no email anywhere", () => {
		const order = makeOrder();
		const session = makeSession({ customer_email: null, customer_details: null });

		const tasks = buildPostCheckoutTasks(order, session);
		expect(tasks.find((t) => t.type === "ORDER_CONFIRMATION_EMAIL")).toBeUndefined();
	});

	it("always emits ADMIN_NEW_ORDER_EMAIL even without customer email", () => {
		const order = makeOrder();
		const session = makeSession({ customer_email: null, customer_details: null });

		const tasks = buildPostCheckoutTasks(order, session);
		const adminEmail = tasks.find((t) => t.type === "ADMIN_NEW_ORDER_EMAIL");

		expect(adminEmail).toBeDefined();
		if (adminEmail?.type !== "ADMIN_NEW_ORDER_EMAIL") throw new Error("type guard");
		expect(adminEmail.data.customerEmail).toBe("Email non disponible");
		expect(adminEmail.data.dashboardUrl).toBe(
			"https://example.test/admin/ventes/commandes/order_1",
		);
	});

	it("falls back to 'Client' when no shipping name available", () => {
		const order = makeOrder({ shippingFirstName: null, shippingLastName: null });
		const session = makeSession();

		const tasks = buildPostCheckoutTasks(order, session);
		const email = tasks.find((t) => t.type === "ORDER_CONFIRMATION_EMAIL");
		if (email?.type !== "ORDER_CONFIRMATION_EMAIL") throw new Error("expected email task");
		expect(email.data.customerName).toBe("Client");
	});

	it("skips SKU_STOCK tag for items without sku.id", () => {
		const order = makeOrder({
			items: [
				{
					productTitle: "X",
					skuColor: null,
					skuColorHexes: null,
					skuMaterial: null,
					skuSize: null,
					quantity: 1,
					price: 100,
					skuId: "sku_orphan",
					sku: null,
				},
			],
		});

		const tasks = buildPostCheckoutTasks(order, makeSession());
		const cacheTask = tasks.find((t) => t.type === "INVALIDATE_CACHE");
		expect(cacheTask?.tags.every((t) => !t.startsWith("sku-stock-"))).toBe(true);
	});

	it("falls back to 'Produit' when productTitle is null in emails", () => {
		const order = makeOrder({
			items: [
				{
					productTitle: null,
					skuColor: null,
					skuColorHexes: null,
					skuMaterial: null,
					skuSize: null,
					quantity: 2,
					price: 500,
					skuId: "sku_2",
					sku: { id: "sku_2", inventory: 5, sku: "S2" },
				},
			],
		});

		const tasks = buildPostCheckoutTasks(order, makeSession());
		const email = tasks.find((t) => t.type === "ORDER_CONFIRMATION_EMAIL");
		if (email?.type !== "ORDER_CONFIRMATION_EMAIL") throw new Error("expected email task");
		expect(email.data.items[0]?.productTitle).toBe("Produit");
	});
});
