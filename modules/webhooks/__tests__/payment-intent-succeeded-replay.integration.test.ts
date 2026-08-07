/**
 * @regression payment-intent-succeeded-replay
 *
 * EINV-TEST-006 — Replay payment_intent.succeeded sur même PaymentIntent.
 *
 * Cas réel : Stripe peut re-livrer un webhook plusieurs fois sous 24 h (retry
 * automatique sur 5xx, pendant 3 jours) — seule source de rejeu depuis le retrait
 * du bouton `retry-webhooks` (audit V2, Lot 3). Multi-instance Vercel peut traiter
 * le même event en parallèle.
 *
 * Invariants :
 *   1. Un seul `invoiceNumber` persisté pour l'order (idempotence via
 *      `ensureInvoiceNumberPersisted` skip si déjà set)
 *   3. Pas de P2002 surface au caller
 *
 * Ce test exerce le service réel `ensureInvoiceNumberPersisted`
 * sur DB Postgres avec advisory locks réels.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";
import { createTestOrder, createTestProduct, createTestSku } from "@/test/integration/factories";
import { ensureInvoiceNumberPersisted } from "@/modules/orders/services/ensure-invoice-number.service";
import { OrderStatus, PaymentStatus, type Order } from "@/app/generated/prisma/client";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

/** `paidAt` et `stripePaymentIntentId` sont remplis d'office par la factory sur un PAID. */
async function createPaidOrder(skuId: string): Promise<Order> {
	return createTestOrder([{ skuId }], {
		status: OrderStatus.PROCESSING,
		paymentStatus: PaymentStatus.PAID,
		invoiceStatus: null,
	});
}

describeIntegration("payment_intent.succeeded — replay idempotent (EINV-TEST-006)", () => {
	let prisma: ReturnType<typeof getIntegrationPrismaClient>;

	beforeEach(() => {
		prisma = getIntegrationPrismaClient();
	});

	it("5 replays ensureInvoiceNumberPersisted parallèles → 1 seul invoiceNumber persisté", async () => {
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);
		const order = await createPaidOrder(sku.id);

		// Simule 5 instances Vercel recevant le même webhook event
		await Promise.all(Array.from({ length: 5 }, () => ensureInvoiceNumberPersisted(order.id)));

		const persisted = await prisma.order.findUniqueOrThrow({
			where: { id: order.id },
			select: { invoiceNumber: true, invoiceStatus: true },
		});

		// Un seul invoiceNumber gagne, status GENERATED
		expect(persisted.invoiceNumber).toMatch(/^F-\d{4}-\d{5}$/);
		expect(persisted.invoiceStatus).toBe("GENERATED");
	});

	it("ensureInvoice puis 4 replays → noop sur les 4 (skip si déjà set)", async () => {
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);
		const order = await createPaidOrder(sku.id);

		// 1er appel séquentiel (pose le numéro)
		await ensureInvoiceNumberPersisted(order.id);
		const after1 = await prisma.order.findUniqueOrThrow({
			where: { id: order.id },
			select: { invoiceNumber: true, invoiceGeneratedAt: true },
		});

		// 4 replays : doivent skip
		await Promise.all(Array.from({ length: 4 }, () => ensureInvoiceNumberPersisted(order.id)));
		const after5 = await prisma.order.findUniqueOrThrow({
			where: { id: order.id },
			select: { invoiceNumber: true, invoiceGeneratedAt: true },
		});

		// Même invoiceNumber + même invoiceGeneratedAt (pas écrasé)
		expect(after5.invoiceNumber).toBe(after1.invoiceNumber);
		expect(after5.invoiceGeneratedAt?.getTime()).toBe(after1.invoiceGeneratedAt?.getTime());
	});
});
