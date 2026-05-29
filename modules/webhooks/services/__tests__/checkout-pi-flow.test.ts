import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockGetCartInvalidationTags,
	mockGetOrderInvalidationTags,
	mockProductsCacheTags,
	mockGetBaseUrl,
} = vi.hoisted(() => {
	const mockTx = {
		order: { findUnique: vi.fn(), update: vi.fn() },
		productSku: { update: vi.fn(), updateMany: vi.fn() },
		$queryRaw: vi.fn(),
		cartItem: { deleteMany: vi.fn() },
		// BIZ-BUG-003 : processOrderAtomically écrit désormais un audit PAID via createOrderAuditTx
		orderHistory: { create: vi.fn() },
	};
	return {
		mockPrisma: {
			// ORD-BIZ-011 : pré-check status CANCELLED hors transaction
			order: {
				findUnique: vi.fn().mockResolvedValue({
					id: "order_test_123",
					orderNumber: "SYN-TEST",
					status: "PENDING",
				}),
			},
			$transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
			_mockTx: mockTx,
		},
		mockGetCartInvalidationTags: vi.fn(),
		mockGetOrderInvalidationTags: vi.fn(),
		mockProductsCacheTags: {
			SKU_STOCK: vi.fn((skuId: string) => `sku-stock-${skuId}`),
		},
		mockGetBaseUrl: vi.fn(() => "https://synclune.fr"),
	};
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("@/shared/lib/prisma-tx-options", () => ({
	TX_TIMEOUT_LONG: 30000,
	TX_MAX_WAIT_LONG: 10000,
}));
vi.mock("../payment-intent.service", () => ({
	initiateAutomaticRefund: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
	withScope: vi.fn(),
	captureMessage: vi.fn(),
	captureException: vi.fn(),
	addBreadcrumb: vi.fn(),
}));
vi.mock("@/modules/cart/constants/cache", () => ({
	getCartInvalidationTags: mockGetCartInvalidationTags,
}));
vi.mock("@/modules/orders/constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));
vi.mock("@/modules/products/constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: mockProductsCacheTags,
}));
vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: mockGetBaseUrl,
	ROUTES: {
		ADMIN: { ORDER_DETAIL: (id: string) => `/admin/ventes/commandes/${id}` },
	},
}));
vi.mock("@/shared/lib/logger", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { processOrderFromPaymentIntent } from "../checkout-order-processing.service";
import { buildPostCheckoutTasksFromPI } from "../checkout-post-tasks.service";
import type { OrderWithItems } from "../../types/checkout.types";
import { logger } from "@/shared/lib/logger";

// ============================================================================
// Fixtures
// ============================================================================

function makePaymentIntent(overrides: Record<string, unknown> = {}): Stripe.PaymentIntent {
	return {
		id: "pi_test_123",
		customer: "cus_test_123",
		receipt_email: "receipt@example.com",
		metadata: {},
		...overrides,
	} as unknown as Stripe.PaymentIntent;
}

function makeOrderRow(overrides: Record<string, unknown> = {}) {
	return {
		id: "order-1",
		orderNumber: "SYN-002",
		userId: "user-1",
		customerEmail: "order@example.com",
		paymentStatus: "PENDING",
		shippingFirstName: "Marie",
		shippingLastName: "Curie",
		shippingAddress1: "1 rue de la Paix",
		shippingAddress2: null,
		shippingPostalCode: "75001",
		shippingCity: "Paris",
		shippingCountry: "FR",
		shippingPhone: "+33600000000",
		subtotal: 8000,
		discountAmount: 0,
		shippingCost: 600,
		taxAmount: 0,
		total: 8600,
		user: { id: "user-1" },
		items: [
			{
				skuId: "sku-pi-1",
				quantity: 1,
				price: 8000,
				productTitle: "Collier argent",
				skuColor: "Argent",
				skuMaterial: "Argent 925",
				skuSize: "Unique",
				sku: { id: "sku-pi-1", inventory: 5, sku: "COL-AG-U" },
			},
		],
		...overrides,
	};
}

function makeOrderWithItems(overrides: Partial<OrderWithItems> = {}): OrderWithItems {
	return {
		id: "order-1",
		orderNumber: "SYN-002",
		userId: "user-1",
		customerEmail: "order@example.com",
		shippingFirstName: "Marie",
		shippingLastName: "Curie",
		shippingAddress1: "1 rue de la Paix",
		shippingAddress2: null,
		shippingPostalCode: "75001",
		shippingCity: "Paris",
		shippingCountry: "FR",
		shippingPhone: "+33600000000",
		subtotal: 8000,
		discountAmount: 0,
		shippingCost: 600,
		taxAmount: 0,
		total: 8600,
		items: [
			{
				skuId: "sku-pi-1",
				quantity: 1,
				price: 8000,
				productTitle: "Collier argent",
				skuColor: "Argent",
				skuMaterial: "Argent 925",
				skuSize: "Unique",
				sku: { id: "sku-pi-1", inventory: 5, sku: "COL-AG-U" },
			},
		],
		...overrides,
	};
}

// ============================================================================
// processOrderFromPaymentIntent
// ============================================================================

describe("processOrderFromPaymentIntent", () => {
	const mockTx = (mockPrisma as typeof mockPrisma & { _mockTx: typeof mockPrisma._mockTx })._mockTx;

	beforeEach(() => {
		vi.clearAllMocks();
		mockTx.order.findUnique.mockResolvedValue(makeOrderRow());
		mockTx.$queryRaw.mockResolvedValue([
			{
				id: "sku-pi-1",
				inventory: 5,
				isActive: true,
				deletedAt: null,
				productStatus: "PUBLIC",
				productDeletedAt: null,
			},
		]);
		mockTx.productSku.update.mockResolvedValue({});
		mockTx.productSku.updateMany.mockResolvedValue({ count: 0 });
		mockTx.order.update.mockResolvedValue({});
		mockTx.cartItem.deleteMany.mockResolvedValue({ count: 0 });
	});

	it("updates order with stripePaymentIntentId and customer id from PaymentIntent", async () => {
		const paymentIntent = makePaymentIntent({ id: "pi_XYZ", customer: "cus_XYZ" });

		await processOrderFromPaymentIntent("order-1", paymentIntent);

		expect(mockTx.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "order-1" },
				data: expect.objectContaining({
					status: "PROCESSING",
					paymentStatus: "PAID",
					stripePaymentIntentId: "pi_XYZ",
					stripeCustomerId: "cus_XYZ",
					paidAt: expect.any(Date),
				}),
			}),
		);
	});

	it("does not set shippingCost/shippingMethod (already stored from confirmCheckout)", async () => {
		const paymentIntent = makePaymentIntent();
		await processOrderFromPaymentIntent("order-1", paymentIntent);
		const updateCall = mockTx.order.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
		expect(updateCall.data).not.toHaveProperty("shippingCost");
		expect(updateCall.data).not.toHaveProperty("shippingMethod");
		expect(updateCall.data).not.toHaveProperty("shippingCarrier");
	});

	it("sets stripeCustomerId to null when PaymentIntent.customer is non-string", async () => {
		const paymentIntent = makePaymentIntent({
			customer: { id: "cus_obj", object: "customer" },
		});
		await processOrderFromPaymentIntent("order-1", paymentIntent);
		const updateCall = mockTx.order.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
		expect(updateCall.data.stripeCustomerId).toBeNull();
	});

	/**
	 * @regression biz-bug-003
	 * L'encaissement (PENDING → PAID/PROCESSING) doit laisser une trace dans
	 * l'audit trail immuable, au même titre que les actions admin. Verrouille
	 * l'écriture OrderHistory action=PAID source=SYSTEM dans la transaction.
	 */
	it("[regression biz-bug-003] writes a PAID OrderHistory audit entry inside the transaction", async () => {
		const paymentIntent = makePaymentIntent({ id: "pi_audit" });

		await processOrderFromPaymentIntent("order-1", paymentIntent);

		expect(mockTx.orderHistory.create).toHaveBeenCalledTimes(1);
		const auditCall = mockTx.orderHistory.create.mock.calls[0]![0] as {
			data: Record<string, unknown>;
		};
		expect(auditCall.data).toMatchObject({
			orderId: "order-1",
			action: "PAID",
			source: "SYSTEM",
			newPaymentStatus: "PAID",
			previousPaymentStatus: "PENDING",
		});
	});

	/**
	 * @regression biz-bug-005
	 * Une SURfacturation (Stripe encaisse plus que order.total) ne bloque pas le
	 * traitement (le client a payé) mais doit être signalée pour investigation.
	 */
	it("[regression biz-bug-005] logs an overbilling alert when amount_received exceeds order.total", async () => {
		// makeOrderRow().total = 8600 ; on encaisse 9000 → surfacturation.
		const paymentIntent = makePaymentIntent({ id: "pi_over", amount_received: 9000 });

		await processOrderFromPaymentIntent("order-1", paymentIntent);

		// Non bloquant : la commande passe quand même PAID.
		expect(mockTx.order.update).toHaveBeenCalled();
		expect(logger.error).toHaveBeenCalledWith(
			expect.stringContaining("Overbilling detected"),
			undefined,
			expect.objectContaining({ service: "webhook" }),
		);
	});

	/**
	 * @regression biz-bug-005
	 * Garde unidirectionnelle préservée : la sous-facturation throw toujours.
	 */
	it("[regression biz-bug-005] still throws on underbilling (amount_received below order.total)", async () => {
		const paymentIntent = makePaymentIntent({ id: "pi_under", amount_received: 1000 });

		await expect(processOrderFromPaymentIntent("order-1", paymentIntent)).rejects.toThrow(
			/Amount mismatch/,
		);
	});

	it("clears guest cart when metadata.guestSessionId is present and order has no userId", async () => {
		mockTx.order.findUnique.mockResolvedValue(makeOrderRow({ userId: null, user: null }));
		const paymentIntent = makePaymentIntent({ metadata: { guestSessionId: "guest-abc" } });

		await processOrderFromPaymentIntent("order-1", paymentIntent);

		expect(mockTx.cartItem.deleteMany).toHaveBeenCalledWith({
			where: { cart: { sessionId: "guest-abc" } },
		});
	});

	it("is idempotent when order already PAID (returns early without re-decrementing stock)", async () => {
		mockTx.order.findUnique.mockResolvedValue(makeOrderRow({ paymentStatus: "PAID" }));
		const paymentIntent = makePaymentIntent();

		await processOrderFromPaymentIntent("order-1", paymentIntent);

		expect(mockTx.productSku.update).not.toHaveBeenCalled();
		expect(mockTx.order.update).not.toHaveBeenCalled();
	});

	it("decrements inventory for each line item", async () => {
		const paymentIntent = makePaymentIntent();
		await processOrderFromPaymentIntent("order-1", paymentIntent);
		expect(mockTx.productSku.update).toHaveBeenCalledWith({
			where: { id: "sku-pi-1" },
			data: { inventory: { decrement: 1 } },
		});
	});

	it("throws when an item is invalid (e.g. inventory below requested quantity)", async () => {
		mockTx.$queryRaw.mockResolvedValue([
			{
				id: "sku-pi-1",
				inventory: 0,
				isActive: true,
				deletedAt: null,
				productStatus: "PUBLIC",
				productDeletedAt: null,
			},
		]);
		const paymentIntent = makePaymentIntent();
		await expect(processOrderFromPaymentIntent("order-1", paymentIntent)).rejects.toThrow(
			/Invalid item/,
		);
	});
});

// ============================================================================
// buildPostCheckoutTasksFromPI
// ============================================================================

describe("buildPostCheckoutTasksFromPI", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://synclune.fr");
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list", "user-orders-user-1"]);
		mockGetCartInvalidationTags.mockReturnValue(["cart-user-1"]);
	});

	it("includes cache invalidation task with SKU stock tags", () => {
		const order = makeOrderWithItems();
		const paymentIntent = makePaymentIntent();

		const tasks = buildPostCheckoutTasksFromPI(order, paymentIntent);

		const cacheTask = tasks.find((t) => t.type === "INVALIDATE_CACHE");
		expect(cacheTask).toBeDefined();
		expect((cacheTask as { tags: string[] }).tags).toEqual(
			expect.arrayContaining(["orders-list", "cart-user-1", "sku-stock-sku-pi-1"]),
		);
	});

	it("uses receipt_email when present for customer email", () => {
		const order = makeOrderWithItems({ customerEmail: "fallback@example.com" });
		const paymentIntent = makePaymentIntent({ receipt_email: "receipt@example.com" });

		const tasks = buildPostCheckoutTasksFromPI(order, paymentIntent);

		const emailTask = tasks.find((t) => t.type === "ORDER_CONFIRMATION_EMAIL") as
			| { type: string; data: { to: string } }
			| undefined;
		expect(emailTask?.data.to).toBe("receipt@example.com");
	});

	it("falls back to order.customerEmail when PaymentIntent.receipt_email is null", () => {
		const order = makeOrderWithItems({ customerEmail: "fallback@example.com" });
		const paymentIntent = makePaymentIntent({ receipt_email: null });

		const tasks = buildPostCheckoutTasksFromPI(order, paymentIntent);

		const emailTask = tasks.find((t) => t.type === "ORDER_CONFIRMATION_EMAIL") as
			| { type: string; data: { to: string } }
			| undefined;
		expect(emailTask?.data.to).toBe("fallback@example.com");
	});

	it("skips customer confirmation email when both sources are null", () => {
		const order = makeOrderWithItems({ customerEmail: null });
		const paymentIntent = makePaymentIntent({ receipt_email: null });

		const tasks = buildPostCheckoutTasksFromPI(order, paymentIntent);

		expect(tasks.find((t) => t.type === "ORDER_CONFIRMATION_EMAIL")).toBeUndefined();
	});

	it("uses guest session id from PaymentIntent metadata for cart invalidation when order has no userId", () => {
		mockGetCartInvalidationTags.mockReturnValue(["cart-guest-abc"]);
		const order = makeOrderWithItems({ userId: null });
		const paymentIntent = makePaymentIntent({ metadata: { guestSessionId: "guest-abc" } });

		buildPostCheckoutTasksFromPI(order, paymentIntent);

		expect(mockGetCartInvalidationTags).toHaveBeenCalledWith(undefined, "guest-abc");
	});

	it("never emits an admin new-order task (removed)", () => {
		const order = makeOrderWithItems();
		const paymentIntent = makePaymentIntent();

		const tasks = buildPostCheckoutTasksFromPI(order, paymentIntent);

		expect(tasks.map((t) => t.type as string)).not.toContain("ADMIN_NEW_ORDER_EMAIL");
	});

	it("falls back to 'Client' on the confirmation email when shipping first+last names are empty", () => {
		const order = makeOrderWithItems({ shippingFirstName: "", shippingLastName: "" });
		const paymentIntent = makePaymentIntent();

		const tasks = buildPostCheckoutTasksFromPI(order, paymentIntent);

		const emailTask = tasks.find((t) => t.type === "ORDER_CONFIRMATION_EMAIL") as
			| { type: string; data: { customerName: string } }
			| undefined;
		expect(emailTask?.data.customerName).toBe("Client");
	});

	it("maps line items with productTitle fallback to 'Produit'", () => {
		const order = makeOrderWithItems({
			items: [
				{
					productTitle: null,
					skuColor: "Or",
					skuMaterial: "Or 18k",
					skuSize: "52",
					quantity: 2,
					price: 5000,
					skuId: "sku-2",
					sku: { id: "sku-2", inventory: 3, sku: "SKU-2" },
				},
			],
		});
		const paymentIntent = makePaymentIntent();

		const tasks = buildPostCheckoutTasksFromPI(order, paymentIntent);

		const emailTask = tasks.find((t) => t.type === "ORDER_CONFIRMATION_EMAIL") as
			| { type: string; data: { items: Array<{ productTitle: string }> } }
			| undefined;
		expect(emailTask?.data.items[0]?.productTitle).toBe("Produit");
	});
});
