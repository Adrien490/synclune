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
import { createTestOrder, createTestProduct, createTestSku } from "@/test/integration/factories";
import { persistInvoiceNumber } from "../persist-invoice-number.service";
import { OrderStatus, PaymentStatus, type Order } from "@/app/generated/prisma/client";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

async function createPaidOrder(skuId: string, suffix: string): Promise<Order> {
	return createTestOrder([{ skuId, productTitle: "Collier Test" }], {
		orderNumber: `SYN-CONC-${suffix}`,
		status: OrderStatus.PROCESSING,
		paymentStatus: PaymentStatus.PAID,
		invoiceStatus: null,
	});
}

describeIntegration("persistInvoiceNumber — concurrence Postgres réelle (EINV-TEST-001)", () => {
	let prisma: ReturnType<typeof getIntegrationPrismaClient>;

	beforeEach(async () => {
		prisma = getIntegrationPrismaClient();
	});

	it("20 transactions concurrentes → 20 invoiceNumber distincts gap-free", async () => {
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);

		const orders: Order[] = [];
		for (let i = 0; i < 20; i++) {
			const order = await createPaidOrder(
				sku.id,
				`T${i.toString().padStart(2, "0")}-${Date.now()}`,
			);
			orders.push(order);
		}

		// Lance les 20 persistInvoiceNumber en parallèle
		const results = await Promise.all(orders.map((order) => persistInvoiceNumber(order.id)));

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
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);

		const orderIds: string[] = [];
		for (let i = 0; i < 20; i++) {
			const order = await createPaidOrder(sku.id, `STATUS-${i}-${Date.now()}`);
			orderIds.push(order.id);
		}

		await Promise.all(orderIds.map((id) => persistInvoiceNumber(id)));

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
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);

		const orderIds: string[] = [];
		for (let i = 0; i < 10; i++) {
			const order = await createPaidOrder(sku.id, `AUDIT-${i}-${Date.now()}`);
			orderIds.push(order.id);
		}

		await Promise.all(orderIds.map((id) => persistInvoiceNumber(id)));

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
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);

		const order1 = await createPaidOrder(sku.id, `UNIQ-A-${Date.now()}`);
		const order2 = await createPaidOrder(sku.id, `UNIQ-B-${Date.now()}`);

		const result1 = await persistInvoiceNumber(order1.id);
		const result2 = await persistInvoiceNumber(order2.id);

		expect(result1?.invoiceNumber).not.toBe(result2?.invoiceNumber);
	});

	it("idempotence séquentielle (EINV-SEQ-006) : 2e appel sur order déjà GENERATED retourne le MÊME numéro (pas d'overwrite ni de gap)", async () => {
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);

		const order = await createPaidOrder(sku.id, `IDEMP-${Date.now()}`);

		// 1er appel — attribue F-YYYY-NNNNN.
		const result1 = await persistInvoiceNumber(order.id);
		expect(result1?.invoiceNumber).toMatch(/^F-\d{4}-\d{5}$/);

		// 2e appel : la garde d'idempotence SOUS le lock re-lit le numéro de cette
		// commande et le retourne tel quel — il NE doit PAS générer un nouveau
		// numéro (sinon mutation Art. 286 + orphelinisation du 1er = gap).
		const result2 = await persistInvoiceNumber(order.id);
		expect(result2?.invoiceNumber).toBe(result1?.invoiceNumber);

		// L'order conserve le numéro initial.
		const persisted = await prisma.order.findUniqueOrThrow({
			where: { id: order.id },
			select: { invoiceNumber: true },
		});
		expect(persisted.invoiceNumber).toBe(result1?.invoiceNumber);

		// Exactement UNE entrée d'audit INVOICE_GENERATED (le noop n'en crée pas).
		const histories = await prisma.orderHistory.findMany({
			where: { orderId: order.id, action: "INVOICE_GENERATED" },
		});
		expect(histories).toHaveLength(1);
	});

	it("idempotence concurrente (EINV-SEQ-006) : N persistInvoiceNumber parallèles sur le MÊME order → 1 seul numéro, 0 gap (race eager webhook + lazy download)", async () => {
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);

		const order = await createPaidOrder(sku.id, `RACE-${Date.now()}`);

		// 5 appels concurrents simulant webhook eager + fallback lazy route + retry
		// Stripe + cron sync-async tombant ensemble dans la fenêtre PAID-sans-numéro.
		const results = await Promise.all(
			Array.from({ length: 5 }, () => persistInvoiceNumber(order.id)),
		);

		// Tous réussissent et retournent le MÊME numéro (un seul gagnant écrit, les
		// autres re-lisent sous lock et renvoient l'existant).
		expect(results.every((r) => r !== null)).toBe(true);
		const numbers = new Set(results.map((r) => r!.invoiceNumber));
		expect(numbers.size).toBe(1);

		// 1 seul numéro persisté + 1 seule entrée d'audit (pas d'overwrite/gap).
		const persisted = await prisma.order.findUniqueOrThrow({
			where: { id: order.id },
			select: { invoiceNumber: true },
		});
		expect(persisted.invoiceNumber).toBe([...numbers][0]);
		const histories = await prisma.orderHistory.findMany({
			where: { orderId: order.id, action: "INVOICE_GENERATED" },
		});
		expect(histories).toHaveLength(1);
	});
});
