/**
 * @regression ereporting-sales-refund-delta
 *
 * EINV-TEST-017 — Delta SALES + REFUND = 0 après refund total.
 *
 * Conformité Art. 50-0 CGI (micro-entreprise — CA à l'encaissement) :
 * l'export DGFiP doit refléter le CA net après remboursements. La règle :
 *   somme(amountIncTax) sur SALES + somme(amountIncTax) sur REFUND = 0
 *   pour un order intégralement remboursé.
 *
 * Le `amountIncTax` est positif pour SALES, négatif pour REFUND
 * (cf `build-ereporting-transaction.ts` — vérifié par contrainte CHECK DB).
 *
 * Pré-requis : INTEGRATION_DATABASE_URL + INVOICE_ENABLE_EREPORTING=true.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";
import { createTestUser, createTestProduct, createTestSku } from "@/test/integration/factories";
import { recordSalesEReporting, recordRefundEReporting } from "../record-ereporting.service";
import {
	OrderStatus,
	PaymentStatus,
	RefundStatus,
	type Order,
} from "@/app/generated/prisma/client";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

async function createPaidOrder(
	prisma: ReturnType<typeof getIntegrationPrismaClient>,
	userId: string,
	skuId: string,
	totalCents: number,
): Promise<Order> {
	return prisma.order.create({
		data: {
			userId,
			orderNumber: `SYN-ERPT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			customerEmail: "erpt@test.local",
			customerName: "ERPT Test",
			customerType: "B2C",
			shippingFirstName: "E",
			shippingLastName: "RPT",
			shippingAddress1: "1 rue",
			shippingPostalCode: "75001",
			shippingCity: "Paris",
			shippingCountry: "FR",
			shippingPhone: "+33600000000",
			status: OrderStatus.PROCESSING,
			paymentStatus: PaymentStatus.PAID,
			paidAt: new Date(),
			stripePaymentIntentId: `pi_erpt_${Date.now()}_${Math.random()}`,
			subtotal: totalCents,
			total: totalCents,
			currency: "EUR",
			paymentMethod: "CARD",
			invoiceStatus: "PENDING",
			items: {
				create: [
					{
						skuId,
						quantity: 1,
						productTitle: "ERPT",
						price: totalCents,
						taxRate: 0,
						taxAmount: 0,
						lineTotalExcludingTax: totalCents,
						lineTotalIncludingTax: totalCents,
						taxCategoryCode: "ZB",
					},
				],
			},
		},
	});
}

describeIntegration(
	"recordSalesEReporting + recordRefundEReporting — delta=0 (EINV-TEST-017)",
	() => {
		let prisma: ReturnType<typeof getIntegrationPrismaClient>;
		const previousFlag = process.env.INVOICE_ENABLE_EREPORTING;

		beforeEach(() => {
			prisma = getIntegrationPrismaClient();
			process.env.INVOICE_ENABLE_EREPORTING = "true";
		});

		afterEach(() => {
			if (previousFlag === undefined) {
				delete process.env.INVOICE_ENABLE_EREPORTING;
			} else {
				process.env.INVOICE_ENABLE_EREPORTING = previousFlag;
			}
		});

		it("SALES (+4999) + REFUND total (-4999) → delta = 0", async () => {
			const user = await createTestUser();
			const product = await createTestProduct();
			const sku = await createTestSku(product.id);
			const order = await createPaidOrder(prisma, user.id, sku.id, 4999);

			// 1. Enregistre la SALES post-paiement
			await recordSalesEReporting(order.id);

			// 2. Crée le Refund COMPLETED + enregistre la REFUND transaction
			const refund = await prisma.refund.create({
				data: {
					orderId: order.id,
					amount: 4999,
					currency: "EUR",
					reason: "CUSTOMER_REQUEST",
					status: RefundStatus.COMPLETED,
					processedAt: new Date(),
				},
			});
			await recordRefundEReporting(refund.id);

			// 3. Vérifie le delta DB
			const transactions = await prisma.eReportingTransaction.findMany({
				where: {
					OR: [{ orderId: order.id }, { refundId: refund.id }],
				},
				select: { type: true, amountIncTax: true },
			});

			expect(transactions).toHaveLength(2);

			const salesTotal = transactions
				.filter((t) => t.type === "SALES")
				.reduce((sum, t) => sum + t.amountIncTax, 0);
			const refundTotal = transactions
				.filter((t) => t.type === "REFUND")
				.reduce((sum, t) => sum + t.amountIncTax, 0);

			expect(salesTotal).toBe(4999);
			expect(refundTotal).toBe(-4999);
			expect(salesTotal + refundTotal).toBe(0);
		});

		it("multi-orders : delta global = somme nette (CA réel)", async () => {
			const user = await createTestUser();
			const product = await createTestProduct();
			const sku = await createTestSku(product.id);

			// 3 ventes (1000 + 2000 + 5000 = 8000)
			const o1 = await createPaidOrder(prisma, user.id, sku.id, 1000);
			const o2 = await createPaidOrder(prisma, user.id, sku.id, 2000);
			const o3 = await createPaidOrder(prisma, user.id, sku.id, 5000);

			await recordSalesEReporting(o1.id);
			await recordSalesEReporting(o2.id);
			await recordSalesEReporting(o3.id);

			// 1 refund total sur o2 (-2000)
			const refundO2 = await prisma.refund.create({
				data: {
					orderId: o2.id,
					amount: 2000,
					currency: "EUR",
					reason: "DEFECTIVE",
					status: RefundStatus.COMPLETED,
					processedAt: new Date(),
				},
			});
			await recordRefundEReporting(refundO2.id);

			// CA net attendu : 1000 + (2000 - 2000) + 5000 = 6000
			const all = await prisma.eReportingTransaction.findMany({
				where: { orderId: { in: [o1.id, o2.id, o3.id] } },
				select: { type: true, amountIncTax: true },
			});
			const refunds = await prisma.eReportingTransaction.findMany({
				where: { refundId: refundO2.id },
				select: { amountIncTax: true },
			});

			const sales = all.reduce((sum, t) => sum + t.amountIncTax, 0);
			const refundSum = refunds.reduce((sum, t) => sum + t.amountIncTax, 0);
			const ca = sales + refundSum;

			expect(ca).toBe(6000);
		});

		it("idempotence cross-fonction : 2× recordSales + 2× recordRefund → toujours delta=0", async () => {
			const user = await createTestUser();
			const product = await createTestProduct();
			const sku = await createTestSku(product.id);
			const order = await createPaidOrder(prisma, user.id, sku.id, 3000);

			await recordSalesEReporting(order.id);
			await recordSalesEReporting(order.id); // replay

			const refund = await prisma.refund.create({
				data: {
					orderId: order.id,
					amount: 3000,
					currency: "EUR",
					reason: "CUSTOMER_REQUEST",
					status: RefundStatus.COMPLETED,
					processedAt: new Date(),
				},
			});
			await recordRefundEReporting(refund.id);
			await recordRefundEReporting(refund.id); // replay

			const transactions = await prisma.eReportingTransaction.findMany({
				where: { OR: [{ orderId: order.id }, { refundId: refund.id }] },
				select: { type: true, amountIncTax: true },
			});

			// Toujours 2 transactions (idempotence)
			expect(transactions).toHaveLength(2);

			const delta = transactions.reduce((sum, t) => sum + t.amountIncTax, 0);
			expect(delta).toBe(0);
		});
	},
);
