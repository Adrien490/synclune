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
		// Franchise par défaut (taxAmount = 0) → part TVA remboursement = 0.
		total: 9500,
		taxAmount: 0,
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

	it("operationCategory est exposé en champ top-level (GOODS défaut), PAS dans le snapshot figé", () => {
		// Décision verrouillée (Art. L102 B) : le snapshot reste minimal et figé ;
		// operationCategory vit en colonne top-level + sera enrichie côté transmission
		// à l'activation (cf. derive-operation-category.regression + ereporting-vat-breakdown).
		const dflt = buildSalesTransaction({ order: makeSalesOrder() });
		expect(dflt.operationCategory).toBe("GOODS");
		expect(Object.keys(dflt.payloadSnapshot)).not.toContain("operationCategory");

		const services = buildSalesTransaction({
			order: makeSalesOrder(),
			operationCategory: "SERVICES",
		});
		expect(services.operationCategory).toBe("SERVICES");
		expect(Object.keys(services.payloadSnapshot)).not.toContain("operationCategory");
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

	// EINV-GLOBAL-011 — dérivation de la part TVA du remboursement au prorata
	// du taux effectif de la commande parente (au lieu d'un 0 codé en dur).
	describe("dérivation TVA au prorata (EINV-GLOBAL-011)", () => {
		it("franchise (order.taxAmount=0) → taxAmount=0 + exclTax==incTax (inchangé)", () => {
			const result = buildRefundTransaction({
				refund: {
					id: "refund-1",
					orderId: "order-1",
					amount: 2500,
					currency: "EUR",
					processedAt: new Date(),
					reason: "CUSTOMER_REQUEST",
				},
				order: makeRefundOrder({ total: 9500, taxAmount: 0 }),
			});
			expect(result.taxAmount).toBe(0);
			expect(result.amountExclTax).toBe(-2500);
			expect(result.payloadSnapshot.taxAmount).toBe(0);
		});

		it("régime réel : taxAmount au prorata = round(refund × tax / total), magnitude positive", () => {
			// Commande 12000 TTC dont 2000 TVA (≈16,67% effectif). Refund total → tax = 2000.
			const result = buildRefundTransaction({
				refund: {
					id: "refund-1",
					orderId: "order-1",
					amount: 12000,
					currency: "EUR",
					processedAt: new Date(),
					reason: "CUSTOMER_REQUEST",
				},
				order: makeRefundOrder({ total: 12000, taxAmount: 2000 }),
			});
			expect(result.taxAmount).toBe(2000); // magnitude positive (CHECK taxAmount >= 0)
			expect(result.amountIncTax).toBe(-12000); // négatif (CHECK amountIncTax < 0)
			expect(result.amountExclTax).toBe(-10000); // HT négatif = -12000 + 2000
		});

		it("refund partiel : part TVA proportionnelle arrondie", () => {
			// Commande 12000 TTC / 2000 TVA. Refund 3000 → tax = round(3000×2000/12000)=500.
			const result = buildRefundTransaction({
				refund: {
					id: "refund-1",
					orderId: "order-1",
					amount: 3000,
					currency: "EUR",
					processedAt: new Date(),
					reason: "PARTIAL",
				},
				order: makeRefundOrder({ total: 12000, taxAmount: 2000 }),
			});
			expect(result.taxAmount).toBe(500);
			expect(result.amountIncTax).toBe(-3000);
			expect(result.amountExclTax).toBe(-2500); // -3000 + 500
		});

		it("ne produit jamais une part TVA supérieure au montant remboursé", () => {
			const result = buildRefundTransaction({
				refund: {
					id: "refund-1",
					orderId: "order-1",
					amount: 100,
					currency: "EUR",
					processedAt: new Date(),
					reason: "OTHER",
				},
				// taxAmount aberrant > total → borné à refund.amount.
				order: makeRefundOrder({ total: 100, taxAmount: 999 }),
			});
			expect(result.taxAmount).toBeLessThanOrEqual(100);
			expect(result.taxAmount).toBeGreaterThanOrEqual(0);
		});
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
