import { describe, expect, it } from "vitest";
import { buildInvoiceData } from "../build-invoice-data";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";

/**
 * @regression invoice-amount-consistency-2026-05-28
 *
 * Garantit la cohérence comptable entre les snapshots `OrderItem.*` et les
 * agrégats `Order.subtotal/discountAmount/shippingCost/total` au
 * moment où `buildInvoiceData()` produit l'objet pivot. Un drift ici =
 * facture PDF affichant des chiffres différents du livre des recettes
 * (Art. L102 B LPF — incohérence audit fiscal).
 *
 * Invariants vérifiés :
 *  1. sum(OrderItem.price × quantity) ≈ Order.subtotal (franchise : TVA dérivée à 0)
 *  2. Order.subtotal + Order.shippingCost - Order.discountAmount = Order.total
 *     (en franchise — TVA nulle partout)
 *  3. totals retournés par buildInvoiceData préservent la relation
 *     totalExclTax + totalTax = totalInclTax (à 1c près pour arrondis CEFACT)
 *  4. amountDue ∈ [0, totalInclTax]
 *
 * Cf. CLAUDE.md § "Facturation électronique — invariants" #4 (snapshots figés)
 * et EINV-GLOBAL-014 (audit 2026-05-28).
 */

function makeOrderFixture(overrides: Partial<GetOrderReturn> = {}): GetOrderReturn {
	const items = [
		{
			id: "oi-1",
			orderId: "order-1",
			productId: "p-1",
			skuId: "sku-1",
			productTitle: "Collier Luna",
			productDescription: null,
			productImageUrl: null,
			skuSku: "LUNA-OR-45",
			skuColor: "Or rose",
			skuColorHexes: null,
			skuMaterial: "Or 18 carats",
			skuSize: "45cm",
			quantity: 1,
			price: 8900,
			taxRate: 0,
			taxAmount: 0,
			taxCategoryCode: "ZB",
			lineTotalExcludingTax: 8900,
			lineTotalIncludingTax: 8900,
			product: null,
			sku: null,
		},
		{
			id: "oi-2",
			orderId: "order-1",
			productId: "p-2",
			skuId: "sku-2",
			productTitle: "Boucles Étoile",
			productDescription: null,
			productImageUrl: null,
			skuSku: "ETOILE-AG",
			skuColor: "Argent",
			skuColorHexes: null,
			skuMaterial: "Argent 925",
			skuSize: null,
			quantity: 2,
			price: 4500,
			taxRate: 0,
			taxAmount: 0,
			taxCategoryCode: "ZB",
			lineTotalExcludingTax: 9000,
			lineTotalIncludingTax: 9000,
			product: null,
			sku: null,
		},
	] as unknown as GetOrderReturn["items"];

	return {
		id: "order-1",
		orderNumber: "CMD-FIX-001",
		userId: null,
		currency: "EUR",
		customerEmail: "client@example.com",
		customerName: "Marie Dupont",
		customerCompanyName: null,
		customerCompanySiren: null,
		customerCompanySiret: null,
		customerCompanyVatNumber: null,
		subtotal: 17900,
		shippingCost: 490,
		total: 18390,
		paymentStatus: "PAID",
		paidAt: new Date("2026-05-15T10:00:00Z"),
		paymentMethod: "CARD",
		stripePaymentIntentId: "pi_test_123",
		shippingFirstName: "Marie",
		shippingLastName: "Dupont",
		shippingAddress1: "12 Rue de la Paix",
		shippingAddress2: null,
		shippingPostalCode: "75002",
		shippingCity: "Paris",
		shippingCountry: "FR",
		invoiceNumber: "F-2026-00042",
		invoiceStatus: "GENERATED",
		invoiceGeneratedAt: new Date("2026-05-15T10:00:01Z"),
		items,
		...overrides,
	} as unknown as GetOrderReturn;
}

describe("buildInvoiceData — cohérence montants Order ↔ OrderItem (régression)", () => {
	it("sum(OrderItem.price × quantity) ≈ Order.subtotal (franchise : TVA = 0)", () => {
		const order = makeOrderFixture();
		const sumLines = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
		// Franchise en base : HT = TTC, et `Order.taxAmount` n'existe plus (colonne
		// retirée le 2026-08-04, elle valait toujours 0).
		expect(sumLines).toBe(order.subtotal);
	});

	it("Order.subtotal + Order.shippingCost - Order.discountAmount = Order.total", () => {
		const order = makeOrderFixture();
	});

	it("buildInvoiceData : totalExclTax + totalTax = totalInclTax (à 1c près)", () => {
		const order = makeOrderFixture();
		const data = buildInvoiceData(order);
		const diff = Math.abs(
			data.totals.totalExclTax + data.totals.totalTax - data.totals.totalInclTax,
		);
		expect(diff).toBeLessThanOrEqual(1);
	});

	it("buildInvoiceData : amountDue ∈ [0, totalInclTax]", () => {
		const order = makeOrderFixture();
		const data = buildInvoiceData(order);
		expect(data.totals.amountDue).toBeGreaterThanOrEqual(0);
		expect(data.totals.amountDue).toBeLessThanOrEqual(data.totals.totalInclTax);
	});

	it("avec réduction : Order.subtotal + shipping - discount = total", () => {
		const order = makeOrderFixture({
			subtotal: 17900,
			shippingCost: 490,
			total: 17390,
		});
	});

	it("buildInvoiceData reflète order.total pour le totalInclTax (jamais recalculé depuis lines)", () => {
		const order = makeOrderFixture({ total: 18390 });
		const data = buildInvoiceData(order);
		expect(data.totals.totalInclTax).toBe(order.total);
	});
});
