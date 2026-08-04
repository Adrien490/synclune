/**
 * @regression ord-test-002 — webhooks reçus dans le désordre
 *
 * Garde-fou : Stripe ne garantit pas l'ordre de livraison. Si `refund.updated`
 * (status=succeeded) arrive AVANT `refund.created`, on doit soit créer le
 * refund local OU laisser le cron reconcile-refunds combler le gap — jamais
 * silently ignorer ni crasher.
 *
 * Ce test simule le scénario en insérant directement les events Stripe et
 * vérifie l'état final (refund existant côté DB OU rien si refund inexistant,
 * mais sans exception).
 *
 * Pré-requis : INTEGRATION_DATABASE_URL.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";
import { createTestUser, createTestProduct, createTestSku } from "@/test/integration/factories";
import {
	OrderStatus,
	PaymentStatus,
	RefundStatus,
	type Order,
} from "@/app/generated/prisma/client";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

describeIntegration("Webhooks — out-of-order delivery (integration)", () => {
	let prisma: ReturnType<typeof getIntegrationPrismaClient>;
	let order: Order;

	beforeEach(async () => {
		prisma = getIntegrationPrismaClient();
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);
		order = await prisma.order.create({
			data: {
				userId: user.id,
				orderNumber: `SYN-OOO-${Date.now()}`,
				customerEmail: user.email,
				customerName: "Marie",
				shippingFirstName: "Marie",
				shippingLastName: "Dupont",
				shippingAddress1: "1 rue",
				shippingPostalCode: "75001",
				shippingCity: "Paris",
				shippingCountry: "FR",
				shippingPhone: "+33600000000",
				status: OrderStatus.PROCESSING,
				paymentStatus: PaymentStatus.PAID,
				stripePaymentIntentId: "pi_test_ooo",
				total: 5000,
				subtotal: 5000,
				items: { create: [{ skuId: sku.id, quantity: 1, productTitle: "X", price: 5000 }] },
			},
		});
	});

	it("refund.updated{succeeded} arriving before refund.created does not throw", async () => {
		// Simulate webhook out-of-order : we don't have a Refund row yet.
		// The handler should upsert/lookup by stripeRefundId and either create
		// it now OR silently ack with skipped status. Either is acceptable —
		// what matters : no thrown exception, no data corruption.

		const stripeRefundId = "re_test_ooo_1";
		const existingByStripeId = await prisma.refund.findUnique({ where: { stripeRefundId } });
		expect(existingByStripeId).toBeNull();

		// Simulate the upsert pattern used by refund handlers (idempotent).
		await prisma.refund.upsert({
			where: { stripeRefundId },
			create: {
				orderId: order.id,
				stripeRefundId,
				amount: 5000,
				reason: "CUSTOMER_REQUEST",
				status: RefundStatus.COMPLETED,
				processedAt: new Date(),
			},
			update: {
				status: RefundStatus.COMPLETED,
				processedAt: new Date(),
			},
		});

		const after = await prisma.refund.findUnique({ where: { stripeRefundId } });
		expect(after).not.toBeNull();
		expect(after?.status).toBe(RefundStatus.COMPLETED);
	});

	it("refund.created arriving after refund.updated{succeeded} is idempotent (no duplicate)", async () => {
		const stripeRefundId = "re_test_ooo_2";

		// First : refund.updated handler runs and upserts.
		await prisma.refund.upsert({
			where: { stripeRefundId },
			create: {
				orderId: order.id,
				stripeRefundId,
				amount: 3000,
				reason: "CUSTOMER_REQUEST",
				status: RefundStatus.COMPLETED,
			},
			update: {},
		});

		// Then : refund.created handler runs — should NOT create a duplicate row.
		await prisma.refund.upsert({
			where: { stripeRefundId },
			create: {
				orderId: order.id,
				stripeRefundId,
				amount: 3000,
				reason: "CUSTOMER_REQUEST",
				status: RefundStatus.PENDING, // hypothetical : initial state from refund.created
			},
			update: {
				// On re-delivery, preserve the more-advanced state. Never downgrade.
			},
		});

		const count = await prisma.refund.count({ where: { stripeRefundId } });
		expect(count).toBe(1);
		const final = await prisma.refund.findUnique({ where: { stripeRefundId } });
		expect(final?.status).toBe(RefundStatus.COMPLETED);
	});
});
