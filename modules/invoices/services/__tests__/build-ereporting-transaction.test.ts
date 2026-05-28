import { describe, expect, it } from "vitest";
import { buildSalesTransaction, buildRefundTransaction } from "../build-ereporting-transaction";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";

type SalesOrder = Parameters<typeof buildSalesTransaction>[0]["order"];
type RefundOrder = Parameters<typeof buildRefundTransaction>[0]["order"];

function makeSalesOrder(overrides: Partial<SalesOrder> = {}): SalesOrder {
	return {
		id: "order-1",
		orderNumber: "SYN-2026-0001",
		paidAt: new Date("2026-05-27T18:00:00Z"),
		total: 9500,
		taxAmount: 0,
		currency: "EUR",
		paymentMethod: "CARD",
		shippingCountry: "FR",
		customerType: "B2C",
		stripePaymentIntentId: "pi_test_1",
		...overrides,
	} satisfies Pick<GetOrderReturn, keyof SalesOrder>;
}

function makeRefundOrder(overrides: Partial<RefundOrder> = {}): RefundOrder {
	return {
		orderNumber: "SYN-2026-0001",
		paymentMethod: "CARD",
		shippingCountry: "FR",
		customerType: "B2C",
		stripePaymentIntentId: "pi_test_1",
		...overrides,
	} satisfies Pick<GetOrderReturn, keyof RefundOrder>;
}

describe("buildSalesTransaction", () => {
	it("creates a SALES transaction with positive amountIncTax", () => {
		const result = buildSalesTransaction({ order: makeSalesOrder() });
		expect(result.type).toBe("SALES");
		expect(result.amountIncTax).toBe(9500);
		expect(result.amountExclTax).toBe(9500); // franchise = exclTax == inclTax
		expect(result.taxAmount).toBe(0);
	});

	it("snapshots orderId + null refundId", () => {
		const result = buildSalesTransaction({ order: makeSalesOrder() });
		expect(result.orderId).toBe("order-1");
		expect(result.refundId).toBeNull();
	});

	it("snapshots occurredAt from paidAt (not createdAt — Art. 50-0 CGI)", () => {
		const paidAt = new Date("2026-06-01T10:30:00Z");
		const result = buildSalesTransaction({ order: makeSalesOrder({ paidAt }) });
		expect(result.occurredAt).toEqual(paidAt);
		expect(result.payloadSnapshot.occurredAt).toBe(paidAt.toISOString());
	});

	it("captures the shipping country (= pays de consommation pour DGFiP)", () => {
		const result = buildSalesTransaction({
			order: makeSalesOrder({ shippingCountry: "BE" }),
		});
		expect(result.countryCode).toBe("BE");
		expect(result.payloadSnapshot.countryCode).toBe("BE");
	});

	it("payload snapshot includes orderNumber, customerType, paymentMethod", () => {
		const result = buildSalesTransaction({
			order: makeSalesOrder({ customerType: "B2B" }),
		});
		expect(result.payloadSnapshot.orderNumber).toBe("SYN-2026-0001");
		expect(result.payloadSnapshot.customerType).toBe("B2B");
		expect(result.payloadSnapshot.paymentMethod).toBe("CARD");
	});

	it("recomputes amountExclTax from total - taxAmount (regime reel preparation)", () => {
		const result = buildSalesTransaction({
			order: makeSalesOrder({ total: 12000, taxAmount: 2000 }),
		});
		expect(result.amountIncTax).toBe(12000);
		expect(result.amountExclTax).toBe(10000);
		expect(result.taxAmount).toBe(2000);
	});

	it("throws when paidAt is missing (caller must mark paid first)", () => {
		expect(() => buildSalesTransaction({ order: makeSalesOrder({ paidAt: null }) })).toThrow(
			/paidAt/,
		);
	});
});

describe("buildRefundTransaction", () => {
	it("creates a REFUND transaction with NEGATIVE amountIncTax", () => {
		const result = buildRefundTransaction({
			refund: {
				id: "refund-1",
				orderId: "order-1",
				amount: 2500,
				currency: "EUR",
				processedAt: new Date("2026-05-28T10:00:00Z"),
				reason: "CUSTOMER_REQUEST",
			},
			order: makeRefundOrder(),
		});
		expect(result.type).toBe("REFUND");
		expect(result.amountIncTax).toBe(-2500);
		expect(result.amountExclTax).toBe(-2500); // franchise
		expect(result.taxAmount).toBe(0);
	});

	it("snapshots refundId + null orderId (FK pointe sur Refund seul)", () => {
		const result = buildRefundTransaction({
			refund: {
				id: "refund-1",
				orderId: "order-1",
				amount: 2500,
				currency: "EUR",
				processedAt: new Date(),
				reason: "DEFECTIVE",
			},
			order: makeRefundOrder(),
		});
		expect(result.orderId).toBeNull();
		expect(result.refundId).toBe("refund-1");
	});

	it("payload snapshot includes parentOrderNumber + refundReason for traceability", () => {
		const result = buildRefundTransaction({
			refund: {
				id: "refund-1",
				orderId: "order-1",
				amount: 2500,
				currency: "EUR",
				processedAt: new Date("2026-05-28T10:00:00Z"),
				reason: "DEFECTIVE",
			},
			order: makeRefundOrder({ orderNumber: "SYN-2026-0001" }),
		});
		expect(result.payloadSnapshot.parentOrderNumber).toBe("SYN-2026-0001");
		expect(result.payloadSnapshot.refundReason).toBe("DEFECTIVE");
	});

	it("snapshots occurredAt from refund.processedAt (date d'encaissement négatif)", () => {
		const processedAt = new Date("2026-06-15T14:30:00Z");
		const result = buildRefundTransaction({
			refund: {
				id: "refund-1",
				orderId: "order-1",
				amount: 1000,
				currency: "EUR",
				processedAt,
				reason: "OTHER",
			},
			order: makeRefundOrder(),
		});
		expect(result.occurredAt).toEqual(processedAt);
	});

	it("inherits paymentMethod and countryCode from the parent order", () => {
		const result = buildRefundTransaction({
			refund: {
				id: "refund-1",
				orderId: "order-1",
				amount: 1000,
				currency: "EUR",
				processedAt: new Date(),
				reason: "OTHER",
			},
			order: makeRefundOrder({ paymentMethod: "CARD", shippingCountry: "DE" }),
		});
		expect(result.paymentMethod).toBe("CARD");
		expect(result.countryCode).toBe("DE");
	});

	it("throws when processedAt is missing (caller must finalize refund first)", () => {
		expect(() =>
			buildRefundTransaction({
				refund: {
					id: "refund-1",
					orderId: "order-1",
					amount: 1000,
					currency: "EUR",
					processedAt: null,
					reason: "OTHER",
				},
				order: makeRefundOrder(),
			}),
		).toThrow(/processedAt/);
	});
});

describe("buildEReportingTransaction — DB constraint compatibility", () => {
	it("SALES amountIncTax is positive (matches DB CHECK constraint)", () => {
		const result = buildSalesTransaction({ order: makeSalesOrder() });
		expect(result.amountIncTax).toBeGreaterThan(0);
	});

	it("REFUND amountIncTax is negative (matches DB CHECK constraint)", () => {
		const result = buildRefundTransaction({
			refund: {
				id: "refund-1",
				orderId: "order-1",
				amount: 1000,
				currency: "EUR",
				processedAt: new Date(),
				reason: "OTHER",
			},
			order: makeRefundOrder(),
		});
		expect(result.amountIncTax).toBeLessThan(0);
	});

	it("countryCode is always ISO 3166-1 alpha-2 (matches DB CHECK)", () => {
		const sales = buildSalesTransaction({ order: makeSalesOrder() });
		expect(sales.countryCode).toMatch(/^[A-Z]{2}$/);
		const refund = buildRefundTransaction({
			refund: {
				id: "r",
				orderId: "o",
				amount: 100,
				currency: "EUR",
				processedAt: new Date(),
				reason: "OTHER",
			},
			order: makeRefundOrder({ shippingCountry: "IT" }),
		});
		expect(refund.countryCode).toMatch(/^[A-Z]{2}$/);
	});

	it("XOR source : orderId XOR refundId is null (matches DB CHECK)", () => {
		const sales = buildSalesTransaction({ order: makeSalesOrder() });
		expect((sales.orderId === null) !== (sales.refundId === null)).toBe(true);

		const refund = buildRefundTransaction({
			refund: {
				id: "r",
				orderId: "o",
				amount: 100,
				currency: "EUR",
				processedAt: new Date(),
				reason: "OTHER",
			},
			order: makeRefundOrder(),
		});
		expect((refund.orderId === null) !== (refund.refundId === null)).toBe(true);
	});
});
