import { describe, expect, it } from "vitest";
import { buildSalesTransaction, buildRefundTransaction } from "../build-ereporting-transaction";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";

/**
 * @regression ereporting-snapshot-frozen-2026-05-28
 *
 * Garantit que le `payloadSnapshot` retourné par les builders SALES/REFUND est
 * une **copie indépendante** des objets d'entrée. Une mutation ultérieure de
 * `Order.total` (anonymisation RGPD, soft-delete, refund partiel, etc.) ne
 * doit JAMAIS altérer le snapshot — c'est précisément ce snapshot qui sera
 * transmis à la DGFiP (Art. L102 B LPF : immutabilité 10 ans).
 *
 * Couplé au stockage Prisma `Json` (JSONB Postgres = copie sérialisée), ces
 * tests verrouillent la garantie côté builder. Le couplage runtime DB est
 * vérifié par les tests d'intégration.
 */

type SalesOrder = Parameters<typeof buildSalesTransaction>[0]["order"];

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

describe("buildSalesTransaction — snapshot indépendant de la source", () => {
	it("mutating Order.total after build does NOT mutate payloadSnapshot.amountIncTax", () => {
		const order = makeSalesOrder({ total: 9500 });
		const payload = buildSalesTransaction({ order });

		const snapshotBefore = payload.payloadSnapshot.amountIncTax;
		expect(snapshotBefore).toBe(9500);

		// Mutation tardive (refund partiel, recalcul, etc.) — usage pathologique
		// qu'on doit immuniser au niveau builder.
		(order as { total: number }).total = 1;

		expect(payload.payloadSnapshot.amountIncTax).toBe(snapshotBefore);
		expect(payload.amountIncTax).toBe(snapshotBefore);
	});

	it("payloadSnapshot is a fresh object literal (no shared reference with input)", () => {
		const order = makeSalesOrder();
		const payload = buildSalesTransaction({ order });

		// payloadSnapshot doit être une struct neuve, pas une projection de
		// l'objet d'entrée — sinon le snapshot pourrait être muté via références.
		expect(payload.payloadSnapshot).not.toBe(order);
		// Le builder ne doit pas écrire de propriété sur la source.
		expect(Object.keys(order)).not.toContain("payloadSnapshot");
	});

	it("each build call returns a distinct snapshot object (no memoization leak)", () => {
		const order = makeSalesOrder();
		const a = buildSalesTransaction({ order });
		const b = buildSalesTransaction({ order });

		expect(a.payloadSnapshot).not.toBe(b.payloadSnapshot);
		expect(a.payloadSnapshot).toEqual(b.payloadSnapshot);
	});
});

describe("buildRefundTransaction — snapshot indépendant de la source", () => {
	it("mutating refund.amount after build does NOT mutate payloadSnapshot.amountIncTax", () => {
		const refund = {
			id: "refund-1",
			orderId: "order-1",
			amount: 2500,
			currency: "EUR",
			processedAt: new Date("2026-05-28T10:00:00Z"),
			reason: "CUSTOMER_REQUEST",
		};
		const order = {
			orderNumber: "SYN-2026-0001",
			paymentMethod: "CARD" as const,
			shippingCountry: "FR",
			customerType: "B2C" as const,
			stripePaymentIntentId: "pi_test_1",
			total: 2500,
			taxAmount: 0,
		};

		const payload = buildRefundTransaction({ refund, order });
		const snapshotBefore = payload.payloadSnapshot.amountIncTax;
		expect(snapshotBefore).toBe(-2500);

		// Mutation tardive (relecture après finalize, etc.)
		refund.amount = 0;

		expect(payload.payloadSnapshot.amountIncTax).toBe(snapshotBefore);
	});
});
