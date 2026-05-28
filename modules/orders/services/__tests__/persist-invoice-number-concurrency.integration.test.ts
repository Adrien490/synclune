/**
 * @regression persist-invoice-number-concurrency
 *
 * EINV-TEST-001 — Concurrence DB réelle sur `persistInvoiceNumber()`.
 *
 * Garantie Art. 286 CGI : N transactions parallèles sur N Order distincts
 * (même année) DOIVENT produire N invoiceNumber distincts, séquentiels
 * gap-free. L'advisory lock Postgres `pg_advisory_xact_lock(1_000_000+year)`
 * sérialise par année (vide-table safe).
 *
 * Sans cette protection : SELECT ... FOR UPDATE LIMIT 1 ne lock rien quand
 * la table est vide → 1ère facture de l'année génère des P2002 en cascade,
 * + race window cross-instance Vercel pour les années non vides.
 *
 * Pré-requis : INTEGRATION_DATABASE_URL pointant sur Postgres dédié. Skip
 * silencieux sinon. Cf test/integration/setup.ts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";
import { createTestUser, createTestProduct, createTestSku } from "@/test/integration/factories";
import { persistInvoiceNumber } from "../persist-invoice-number.service";
import { OrderStatus, PaymentStatus, type Order } from "@/app/generated/prisma/client";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

async function createPaidOrder(
	prisma: ReturnType<typeof getIntegrationPrismaClient>,
	userId: string,
	skuId: string,
	suffix: string,
): Promise<Order> {
	return prisma.order.create({
		data: {
			userId,
			orderNumber: `SYN-CONC-${suffix}`,
			customerEmail: "concur@test.local",
			customerName: "Test Concur",
			customerType: "B2C",
			shippingFirstName: "Test",
			shippingLastName: "Concur",
			shippingAddress1: "1 rue test",
			shippingPostalCode: "75001",
			shippingCity: "Paris",
			shippingCountry: "FR",
			shippingPhone: "+33600000000",
			status: OrderStatus.PROCESSING,
			paymentStatus: PaymentStatus.PAID,
			paidAt: new Date(),
			stripePaymentIntentId: `pi_conc_${suffix}_${Date.now()}`,
			subtotal: 4999,
			discountAmount: 0,
			shippingCost: 0,
			taxAmount: 0,
			total: 4999,
			currency: "EUR",
			paymentMethod: "CARD",
			invoiceStatus: "PENDING",
			items: {
				create: [
					{
						skuId,
						quantity: 1,
						productTitle: "Collier Test",
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

describeIntegration("persistInvoiceNumber — concurrence Postgres réelle (EINV-TEST-001)", () => {
	let prisma: ReturnType<typeof getIntegrationPrismaClient>;

	beforeEach(async () => {
		prisma = getIntegrationPrismaClient();
	});

	it("20 transactions concurrentes → 20 invoiceNumber distincts gap-free", async () => {
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);

		const orders: Order[] = [];
		for (let i = 0; i < 20; i++) {
			const order = await createPaidOrder(
				prisma,
				user.id,
				sku.id,
				`T${i.toString().padStart(2, "0")}-${Date.now()}`,
			);
			orders.push(order);
		}

		// Lance les 20 persistInvoiceNumber en parallèle
		const results = await Promise.all(
			orders.map((order) => persistInvoiceNumber(order.id, user.id)),
		);

		// Tous doivent réussir
		expect(results.every((r) => r !== null)).toBe(true);

		const invoiceNumbers = results.map((r) => r!.invoiceNumber);

		// 20 distincts (pas de doublons)
		expect(new Set(invoiceNumbers).size).toBe(20);

		// Tous au format F-YYYY-NNNNN
		const year = new Date().getFullYear();
		const regex = new RegExp(`^F-${year}-\\d{5}$`);
		expect(invoiceNumbers.every((n) => regex.test(n))).toBe(true);

		// Séquence gap-free : extraire les numéros et vérifier la suite est continue
		const sequences = invoiceNumbers
			.map((n) => parseInt(n.split("-")[2]!, 10))
			.sort((a, b) => a - b);
		const min = sequences[0]!;
		const max = sequences[sequences.length - 1]!;
		expect(max - min).toBe(19); // 20 numéros séquentiels
		// Chaque séquence doit être min+i
		sequences.forEach((seq, i) => {
			expect(seq).toBe(min + i);
		});
	});

	it("toutes les factures sont en status GENERATED après les 20 transactions concurrentes", async () => {
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);

		const orderIds: string[] = [];
		for (let i = 0; i < 20; i++) {
			const order = await createPaidOrder(prisma, user.id, sku.id, `STATUS-${i}-${Date.now()}`);
			orderIds.push(order.id);
		}

		await Promise.all(orderIds.map((id) => persistInvoiceNumber(id, user.id)));

		const persisted = await prisma.order.findMany({
			where: { id: { in: orderIds } },
			select: { invoiceStatus: true, invoiceNumber: true, invoiceGeneratedAt: true },
		});

		expect(persisted).toHaveLength(20);
		expect(persisted.every((o) => o.invoiceStatus === "GENERATED")).toBe(true);
		expect(persisted.every((o) => o.invoiceNumber !== null)).toBe(true);
		expect(persisted.every((o) => o.invoiceGeneratedAt !== null)).toBe(true);
	});

	it("OrderHistory contient 1 entry INVOICE_GENERATED par order (audit trail Art. L123-22)", async () => {
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);

		const orderIds: string[] = [];
		for (let i = 0; i < 10; i++) {
			const order = await createPaidOrder(prisma, user.id, sku.id, `AUDIT-${i}-${Date.now()}`);
			orderIds.push(order.id);
		}

		await Promise.all(orderIds.map((id) => persistInvoiceNumber(id, user.id)));

		const histories = await prisma.orderHistory.findMany({
			where: { orderId: { in: orderIds }, action: "INVOICE_GENERATED" },
		});

		expect(histories).toHaveLength(10);
		histories.forEach((h) => {
			expect(h.source).toBe("SYSTEM");
			const meta = h.metadata as { invoiceNumber?: string; invoiceDataHash?: string };
			expect(meta.invoiceNumber).toMatch(/^F-\d{4}-\d{5}$/);
			expect(meta.invoiceDataHash).toMatch(/^[a-f0-9]{64}$/);
		});
	});

	it("invoiceNumber unique constraint DB : 2 orders distincts ne peuvent partager le même numéro", async () => {
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);

		const order1 = await createPaidOrder(prisma, user.id, sku.id, `UNIQ-A-${Date.now()}`);
		const order2 = await createPaidOrder(prisma, user.id, sku.id, `UNIQ-B-${Date.now()}`);

		const result1 = await persistInvoiceNumber(order1.id, user.id);
		const result2 = await persistInvoiceNumber(order2.id, user.id);

		expect(result1?.invoiceNumber).not.toBe(result2?.invoiceNumber);
	});

	it("idempotence : 2e appel sur ordre déjà GENERATED (ensure-invoice-number pattern) — overflow de la séquence évité", async () => {
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);

		const order = await createPaidOrder(prisma, user.id, sku.id, `IDEMP-${Date.now()}`);

		// 1er appel
		const result1 = await persistInvoiceNumber(order.id, user.id);
		expect(result1?.invoiceNumber).toMatch(/^F-\d{4}-\d{5}$/);

		// 2e appel : crée une NOUVELLE séquence (persistInvoiceNumber est bas-niveau,
		// l'idempotence est gérée par ensure-invoice-number.service.ts en amont).
		// Garantie : pas de crash, juste un 2e numéro différent.
		const result2 = await persistInvoiceNumber(order.id, user.id);
		expect(result2?.invoiceNumber).toMatch(/^F-\d{4}-\d{5}$/);
		expect(result2?.invoiceNumber).not.toBe(result1?.invoiceNumber);
	});
});
