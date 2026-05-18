/**
 * Tests pour `createOrderFromCheckoutSession`.
 *
 * Couvre les chemins critiques revenu/sécurité :
 * - Fast path idempotency (Order existe déjà)
 * - Validation cartId manquant
 * - Validation panier vide / introuvable
 * - Validation stock insuffisant (BusinessError)
 * - FOR UPDATE stock (vérification du raw SQL)
 * - Defense-in-depth amount mismatch
 * - Discount FOR UPDATE + maxUsagePerUser race-guard (cf [[webhooks-audit-2026-05-17]])
 *
 * Les transitions DB profondes (création de l'Order + items, decrement stock,
 * cleanup cart) sont validées par les integration tests P0-C.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

const { mockPrisma, mockTx, mockCheckDiscountEligibility, mockCalculateDiscount } = vi.hoisted(
	() => {
		const tx = {
			order: {
				findUnique: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				findUniqueOrThrow: vi.fn(),
			},
			cart: {
				findUnique: vi.fn(),
				update: vi.fn(),
			},
			cartItem: {
				deleteMany: vi.fn(),
			},
			orderItem: {
				create: vi.fn(),
			},
			productSku: {
				update: vi.fn(),
				updateMany: vi.fn(),
			},
			discountUsage: {
				create: vi.fn(),
				count: vi.fn().mockResolvedValue(0),
			},
			$queryRaw: vi.fn(),
			$executeRaw: vi.fn(),
		};
		return {
			mockTx: tx,
			mockPrisma: {
				order: { findUnique: vi.fn() },
				$transaction: vi.fn(async (cb: (t: typeof tx) => unknown, _opts?: unknown) => cb(tx)),
			},
			mockCheckDiscountEligibility: vi.fn(),
			mockCalculateDiscount: vi.fn(),
		};
	},
);

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/app/generated/prisma/client", () => ({
	DiscountType: { PERCENTAGE: "PERCENTAGE", FIXED_AMOUNT: "FIXED_AMOUNT" },
	PaymentStatus: { PAID: "PAID" },
	OrderStatus: { PROCESSING: "PROCESSING" },
	FulfillmentStatus: { UNFULFILLED: "UNFULFILLED" },
}));
vi.mock("@/modules/discounts/services/discount-eligibility.service", () => ({
	checkDiscountEligibility: mockCheckDiscountEligibility,
}));
vi.mock("@/modules/discounts/services/discount-calculation.service", () => ({
	calculateDiscountWithExclusion: mockCalculateDiscount,
}));
vi.mock("@/modules/orders/services/order-generation.service", () => ({
	generateOrderNumber: vi.fn(() => "ORD-TEST-001"),
}));
vi.mock("@/modules/orders/constants/stripe-shipping-rates", () => ({
	getShippingMethodFromRate: vi.fn(() => "STANDARD"),
	getShippingCarrierFromRate: vi.fn(() => "COLISSIMO"),
}));
vi.mock("@/shared/lib/media-validation", () => ({
	getValidImageUrl: vi.fn((url: string | null) => url),
}));

import { createOrderFromCheckoutSession } from "../checkout-order-processing.service";
import { BusinessError } from "@/shared/lib/actions";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
	return {
		id: "cs_test_1",
		metadata: { cartId: "cart_1" },
		client_reference_id: null,
		amount_total: 10_500,
		customer: "cus_1",
		customer_email: "buyer@example.test",
		customer_details: {
			email: "buyer@example.test",
			name: "Jane Doe",
			address: {
				line1: "1 rue de Test",
				line2: null,
				postal_code: "75001",
				city: "Paris",
				country: "FR",
			},
			phone: "+33600000000",
		},
		collected_information: null,
		payment_intent: "pi_1",
		shipping_cost: { amount_total: 500, shipping_rate: "shr_1" },
		total_details: { amount_shipping: 500, amount_discount: 0 },
		...overrides,
	} as unknown as Stripe.Checkout.Session;
}

function makeCart(overrides: Record<string, unknown> = {}) {
	return {
		id: "cart_1",
		userId: "user_1",
		sessionId: null,
		appliedDiscountCode: null,
		discountAmountCache: null,
		items: [
			{
				skuId: "sku_1",
				quantity: 1,
				priceAtAdd: 10_000,
				sku: {
					id: "sku_1",
					sku: "ETO-OR-M",
					priceInclTax: 10_000,
					compareAtPrice: null,
					colors: [],
					materials: [],
					size: "M",
					product: { id: "prod_1", title: "Collier", description: null },
					images: [],
				},
			},
		],
		...overrides,
	};
}

function makeLockedSku(overrides: Record<string, unknown> = {}) {
	return {
		id: "sku_1",
		isActive: true,
		inventory: 5,
		productStatus: "PUBLIC",
		productDeletedAt: null,
		deletedAt: null,
		...overrides,
	};
}

function makeCreatedOrder() {
	return {
		id: "order_1",
		orderNumber: "ORD-TEST-001",
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
		items: [],
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	mockTx.discountUsage.count.mockResolvedValue(0);
	mockTx.productSku.updateMany.mockResolvedValue({ count: 0 });
	mockTx.$queryRaw.mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// Fast path idempotency
// ---------------------------------------------------------------------------

describe("createOrderFromCheckoutSession — idempotency fast path", () => {
	it("returns existing order when one already exists for the session", async () => {
		const existing = {
			...makeCreatedOrder(),
			items: [
				{
					productTitle: "Collier",
					skuColor: null,
					skuColorHexes: null,
					skuMaterial: null,
					skuSize: "M",
					quantity: 1,
					price: 10_000,
					skuId: "sku_1",
					sku: { id: "sku_1", inventory: 4, sku: "ETO-OR-M" },
				},
			],
		};
		mockPrisma.order.findUnique.mockResolvedValue(existing);

		const result = await createOrderFromCheckoutSession(makeSession());

		expect(result.id).toBe("order_1");
		expect(result.items).toHaveLength(1);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Validation guards
// ---------------------------------------------------------------------------

describe("createOrderFromCheckoutSession — validation guards", () => {
	it("throws when neither metadata.cartId nor client_reference_id is provided", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		const session = makeSession({ metadata: {}, client_reference_id: null });

		await expect(createOrderFromCheckoutSession(session)).rejects.toThrow(
			/Missing cartId in metadata/,
		);
	});

	it("falls back to client_reference_id when metadata.cartId is missing", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		mockTx.order.findUnique.mockResolvedValue(null);
		mockTx.cart.findUnique.mockResolvedValue(null); // Cart not found
		const session = makeSession({ metadata: {}, client_reference_id: "cart_fallback" });

		await expect(createOrderFromCheckoutSession(session)).rejects.toThrow(
			/Cart not found or empty/,
		);

		const cartLookup = mockTx.cart.findUnique.mock.calls[0]?.[0];
		expect(cartLookup.where.id).toBe("cart_fallback");
	});

	it("throws when cart is not found", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		mockTx.order.findUnique.mockResolvedValue(null);
		mockTx.cart.findUnique.mockResolvedValue(null);

		await expect(createOrderFromCheckoutSession(makeSession())).rejects.toThrow(
			/Cart not found or empty/,
		);
	});

	it("throws when cart has no items", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		mockTx.order.findUnique.mockResolvedValue(null);
		mockTx.cart.findUnique.mockResolvedValue(makeCart({ items: [] }));

		await expect(createOrderFromCheckoutSession(makeSession())).rejects.toThrow(
			/Cart not found or empty/,
		);
	});

	it("returns existing order from inside-tx double-check (parallel webhook safety)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		mockTx.order.findUnique.mockResolvedValue({
			...makeCreatedOrder(),
			items: [],
		});

		const result = await createOrderFromCheckoutSession(makeSession());

		expect(result.id).toBe("order_1");
		expect(mockTx.cart.findUnique).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Stock FOR UPDATE + business error
// ---------------------------------------------------------------------------

describe("createOrderFromCheckoutSession — stock FOR UPDATE", () => {
	it("acquires FOR UPDATE lock on SKUs before checking inventory", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		mockTx.order.findUnique.mockResolvedValue(null);
		mockTx.cart.findUnique.mockResolvedValue(makeCart());
		mockTx.$queryRaw.mockResolvedValueOnce([makeLockedSku()]);
		mockTx.order.create.mockResolvedValue({ id: "order_1" });
		mockTx.order.findUniqueOrThrow.mockResolvedValue({ ...makeCreatedOrder(), items: [] });

		await createOrderFromCheckoutSession(makeSession());

		// First $queryRaw call should be the FOR UPDATE on ProductSku.
		const firstQueryCall = mockTx.$queryRaw.mock.calls[0];
		expect(firstQueryCall).toBeDefined();
		const sqlFragments = firstQueryCall?.[0] as TemplateStringsArray;
		const sqlText = sqlFragments.join("?");
		expect(sqlText).toContain('FROM "ProductSku"');
		expect(sqlText).toContain("FOR UPDATE");
	});

	it("throws BusinessError when stock is insufficient for any item", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		mockTx.order.findUnique.mockResolvedValue(null);
		mockTx.cart.findUnique.mockResolvedValue(makeCart());
		mockTx.$queryRaw.mockResolvedValueOnce([makeLockedSku({ inventory: 0 })]);

		await expect(createOrderFromCheckoutSession(makeSession())).rejects.toThrowError(BusinessError);
	});

	it("throws BusinessError when SKU is inactive or product is unpublished", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		mockTx.order.findUnique.mockResolvedValue(null);
		mockTx.cart.findUnique.mockResolvedValue(makeCart());
		mockTx.$queryRaw.mockResolvedValueOnce([makeLockedSku({ isActive: false })]);

		await expect(createOrderFromCheckoutSession(makeSession())).rejects.toThrowError(BusinessError);
	});

	it("throws when SKU is soft-deleted", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		mockTx.order.findUnique.mockResolvedValue(null);
		mockTx.cart.findUnique.mockResolvedValue(makeCart());
		mockTx.$queryRaw.mockResolvedValueOnce([makeLockedSku({ deletedAt: new Date() })]);

		await expect(createOrderFromCheckoutSession(makeSession())).rejects.toThrowError(BusinessError);
	});
});

// ---------------------------------------------------------------------------
// Defense-in-depth amount mismatch
// ---------------------------------------------------------------------------

describe("createOrderFromCheckoutSession — amount mismatch defense", () => {
	it("throws when Stripe captured less than Synclune total (potential fraud)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		mockTx.order.findUnique.mockResolvedValue(null);
		mockTx.cart.findUnique.mockResolvedValue(makeCart());
		mockTx.$queryRaw.mockResolvedValueOnce([makeLockedSku()]);

		// Subtotal 10_000 + shipping 500 = 10_500, but Stripe says only 5_000.
		const session = makeSession({ amount_total: 5_000 });

		await expect(createOrderFromCheckoutSession(session)).rejects.toThrow(/Amount mismatch/);
	});
});

// ---------------------------------------------------------------------------
// Discount FOR UPDATE + maxUsagePerUser race-guard
// REGRESSION : webhooks-audit-2026-05-17
// ---------------------------------------------------------------------------

describe("createOrderFromCheckoutSession — discount FOR UPDATE race-guard", () => {
	beforeEach(() => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		mockTx.order.findUnique.mockResolvedValue(null);
		mockTx.order.create.mockResolvedValue({ id: "order_1", orderNumber: "ORD-TEST-001" });
		mockTx.order.findUniqueOrThrow.mockResolvedValue({ ...makeCreatedOrder(), items: [] });
	});

	it("acquires FOR UPDATE lock on Discount and on DiscountUsage for the user (race-guard)", async () => {
		mockTx.cart.findUnique.mockResolvedValue(makeCart({ appliedDiscountCode: "WELCOME10" }));
		mockTx.$queryRaw
			.mockResolvedValueOnce([makeLockedSku()]) // stock FOR UPDATE
			.mockResolvedValueOnce([
				// discount FOR UPDATE
				{
					id: "discount_1",
					code: "WELCOME10",
					type: "PERCENTAGE",
					value: 10,
					minOrderAmount: null,
					maxUsageCount: null,
					maxUsagePerUser: 1, // <-- triggers DiscountUsage FOR UPDATE
					usageCount: 5,
					startsAt: new Date(),
					endsAt: null,
					isActive: true,
				},
			])
			.mockResolvedValueOnce([]); // DiscountUsage FOR UPDATE (0 prior usages)

		mockCheckDiscountEligibility.mockReturnValue({ eligible: true });
		mockCalculateDiscount.mockReturnValue(1_000);
		mockTx.$executeRaw.mockResolvedValue(1);

		await createOrderFromCheckoutSession(makeSession({ amount_total: 9_500 }));

		// 3 raw queries : SKU stock, Discount, DiscountUsage.
		expect(mockTx.$queryRaw).toHaveBeenCalledTimes(3);

		const discountSqlFragments = mockTx.$queryRaw.mock.calls[1]?.[0] as TemplateStringsArray;
		const discountSql = discountSqlFragments.join("?");
		expect(discountSql).toContain('FROM "Discount"');
		expect(discountSql).toContain("FOR UPDATE");

		const usageSqlFragments = mockTx.$queryRaw.mock.calls[2]?.[0] as TemplateStringsArray;
		const usageSql = usageSqlFragments.join("?");
		expect(usageSql).toContain('FROM "DiscountUsage"');
		expect(usageSql).toContain("FOR UPDATE");
	});

	it("skips DiscountUsage FOR UPDATE when no userId on cart (guest checkout)", async () => {
		mockTx.cart.findUnique.mockResolvedValue(
			makeCart({ userId: null, appliedDiscountCode: "WELCOME10" }),
		);
		mockTx.$queryRaw.mockResolvedValueOnce([makeLockedSku()]).mockResolvedValueOnce([
			{
				id: "discount_1",
				code: "WELCOME10",
				type: "PERCENTAGE",
				value: 10,
				minOrderAmount: null,
				maxUsageCount: null,
				maxUsagePerUser: 1,
				usageCount: 0,
				startsAt: new Date(),
				endsAt: null,
				isActive: true,
			},
		]);

		mockCheckDiscountEligibility.mockReturnValue({ eligible: true });
		mockCalculateDiscount.mockReturnValue(0);

		await createOrderFromCheckoutSession(makeSession({ amount_total: 10_500 }));

		// 2 raw queries only : stock + Discount. Pas de FOR UPDATE sur DiscountUsage
		// (qui ne tourne que si userId est non-null). emailCount via count() est
		// best-effort, hors lock.
		expect(mockTx.$queryRaw).toHaveBeenCalledTimes(2);
	});

	it("logs warning and skips discount when code no longer exists in DB", async () => {
		mockTx.cart.findUnique.mockResolvedValue(makeCart({ appliedDiscountCode: "REMOVED" }));
		mockTx.$queryRaw.mockResolvedValueOnce([makeLockedSku()]).mockResolvedValueOnce([]); // Discount table returns nothing

		await createOrderFromCheckoutSession(makeSession({ amount_total: 10_500 }));

		expect(mockTx.$executeRaw).not.toHaveBeenCalled();
		expect(mockCheckDiscountEligibility).not.toHaveBeenCalled();
	});

	it("falls back to discount from session.metadata.discountCode over cart.appliedDiscountCode", async () => {
		mockTx.cart.findUnique.mockResolvedValue(makeCart({ appliedDiscountCode: "FROM_CART" }));
		mockTx.$queryRaw.mockResolvedValueOnce([makeLockedSku()]).mockResolvedValueOnce([]);

		const session = makeSession({
			metadata: { cartId: "cart_1", discountCode: "FROM_SESSION" },
			amount_total: 10_500,
		});

		await createOrderFromCheckoutSession(session);

		const discountQueryFragments = mockTx.$queryRaw.mock.calls[1]?.[0] as TemplateStringsArray;
		const usedDiscountCode = mockTx.$queryRaw.mock.calls[1]?.[1];
		expect(usedDiscountCode).toBe("FROM_SESSION");
		expect(discountQueryFragments.join("?")).toContain('FROM "Discount"');
	});

	it("throws MAX_USAGE_REACHED BusinessError when atomic UPDATE returns 0 rows", async () => {
		mockTx.cart.findUnique.mockResolvedValue(makeCart({ appliedDiscountCode: "WELCOME10" }));
		mockTx.$queryRaw.mockResolvedValueOnce([makeLockedSku()]).mockResolvedValueOnce([
			{
				id: "discount_1",
				code: "WELCOME10",
				type: "PERCENTAGE",
				value: 10,
				minOrderAmount: null,
				maxUsageCount: 5,
				maxUsagePerUser: null,
				usageCount: 5, // already at max
				startsAt: new Date(),
				endsAt: null,
				isActive: true,
			},
		]);

		mockCheckDiscountEligibility.mockReturnValue({ eligible: true });
		mockCalculateDiscount.mockReturnValue(1_000);
		// Atomic UPDATE returns 0 rows when maxUsageCount race condition trips.
		mockTx.$executeRaw.mockResolvedValue(0);

		await expect(
			createOrderFromCheckoutSession(makeSession({ amount_total: 9_500 })),
		).rejects.toThrow(/limite d'utilisation/);
	});
});
