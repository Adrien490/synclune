/**
 * @regression invoice-route-concurrency
 *
 * EINV-TEST-005 — Concurrence DB sur la route `/api/orders/[orderNumber]/invoice`.
 *
 * Cas réel : double-clic utilisateur OU prefetch Next.js + click sur Order
 * sans `invoiceNumber` encore persisté (race avec le webhook
 * `payment_intent.succeeded` pas encore arrivé). Les 2 requêtes voient
 * `invoiceNumber = null` et appellent `persistInvoiceNumber()` en parallèle.
 *
 * Invariant : grâce à `pg_advisory_xact_lock(1_000_000+year)`, la séquence
 * gap-free est préservée. **Le contrat actuel** (cf service) : chaque appel
 * obtient un numéro distinct. L'idempotence côté Order (un seul invoiceNumber
 * conservé) est gérée en amont par `ensureInvoiceNumberPersisted` qui skip
 * si l'order a déjà un numéro.
 *
 * Ce test vérifie : la séquence ne casse PAS sous double-clic, même si on
 * "gaspille" éventuellement un numéro (acceptable Art. 286 — gap-free
 * concerne la séquence émise, pas les tentatives).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";
import { createTestUser, createTestProduct, createTestSku } from "@/test/integration/factories";
import { persistInvoiceNumber } from "@/modules/orders/services/persist-invoice-number.service";
import { OrderStatus, PaymentStatus, type Order } from "@/app/generated/prisma/client";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

async function createPaidOrderWithoutInvoice(
	prisma: ReturnType<typeof getIntegrationPrismaClient>,
	userId: string,
	skuId: string,
): Promise<Order> {
	return prisma.order.create({
		data: {
			userId,
			orderNumber: `SYN-RT-${Date.now()}`,
			customerEmail: "rt@test.local",
			customerName: "Route Test",
			shippingFirstName: "Route",
			shippingLastName: "Test",
			shippingAddress1: "1 rue",
			shippingPostalCode: "75001",
			shippingCity: "Paris",
			shippingCountry: "FR",
			shippingPhone: "+33600000000",
			status: OrderStatus.PROCESSING,
			paymentStatus: PaymentStatus.PAID,
			paidAt: new Date(),
			stripePaymentIntentId: `pi_rt_${Date.now()}`,
			subtotal: 4999,
			total: 4999,
			paymentMethod: "CARD",
			invoiceStatus: null,
			items: {
				create: [
					{
						skuId,
						quantity: 1,
						productTitle: "Test",
						price: 4999,
						taxRate: 0,
						taxAmount: 0,
						lineTotalExcludingTax: 4999,
						lineTotalIncludingTax: 4999,
						taxCategoryCode: "ZB",
					},
				],
			},
		},
	});
}

describeIntegration("GET /api/orders/[orderNumber]/invoice — concurrence (EINV-TEST-005)", () => {
	let prisma: ReturnType<typeof getIntegrationPrismaClient>;

	beforeEach(() => {
		prisma = getIntegrationPrismaClient();
	});

	it("double persistInvoiceNumber parallèle sur même order → séquence DB intacte (gap-free préservé)", async () => {
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);
		const order = await createPaidOrderWithoutInvoice(prisma, user.id, sku.id);

		// Simule 2 GET concurrents sur Order sans invoiceNumber
		const [r1, r2] = await Promise.all([
			persistInvoiceNumber(order.id),
			persistInvoiceNumber(order.id),
		]);

		// Les deux réussissent et obtiennent des numéros distincts
		// (le service ne court-circuite pas — c'est `ensureInvoice` qui le fait)
		expect(r1).not.toBeNull();
		expect(r2).not.toBeNull();
		expect(r1!.invoiceNumber).not.toBe(r2!.invoiceNumber);

		// Vérification gap-free dans la DB : les deux numéros sont consécutifs
		const year = new Date().getFullYear();
		const seq1 = parseInt(r1!.invoiceNumber.split("-")[2]!, 10);
		const seq2 = parseInt(r2!.invoiceNumber.split("-")[2]!, 10);
		expect(Math.abs(seq2 - seq1)).toBe(1);
		expect(r1!.invoiceNumber.startsWith(`F-${year}-`)).toBe(true);

		// L'Order final ne garde QUE le DERNIER invoiceNumber persisté (winner)
		// — c'est le comportement attendu : ensureInvoiceNumberPersisted en amont
		// court-circuite si déjà set, donc côté route on n'expose pas ce cas.
		const finalOrder = await prisma.order.findUniqueOrThrow({
			where: { id: order.id },
			select: { invoiceNumber: true, invoiceStatus: true },
		});
		expect(finalOrder.invoiceNumber).toMatch(/^F-\d{4}-\d{5}$/);
		expect(finalOrder.invoiceStatus).toBe("GENERATED");
	});

	it("5 persistInvoiceNumber parallèles → 5 numéros consécutifs sans P2002 surface au caller", async () => {
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);
		const order = await createPaidOrderWithoutInvoice(prisma, user.id, sku.id);

		const results = await Promise.all(
			Array.from({ length: 5 }, () => persistInvoiceNumber(order.id)),
		);

		const successful = results.filter((r) => r !== null);
		expect(successful).toHaveLength(5);

		const numbers = successful.map((r) => r!.invoiceNumber).sort();
		expect(new Set(numbers).size).toBe(5);

		// Tous au format F-YYYY-NNNNN
		expect(numbers.every((n) => /^F-\d{4}-\d{5}$/.test(n))).toBe(true);

		// Consécutifs (max - min = 4)
		const seqs = numbers.map((n) => parseInt(n.split("-")[2]!, 10));
		expect(Math.max(...seqs) - Math.min(...seqs)).toBe(4);
	});
});
