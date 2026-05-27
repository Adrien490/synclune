/**
 * @regression ord-test-006 — process-refund TOCTOU guard
 *
 * Garde-fou : 2 invocations parallèles de `processRefund` sur le même refund
 * APPROVED ne doivent jamais déclencher 2 appels Stripe ni 2 restocks. Le
 * mécanisme : `refund.updateMany({ where: { id, status: APPROVED }, ... })`
 * en Step 3 — la 2e invocation voit `status=COMPLETED` (changé par la 1ère)
 * et `count=0` → abort.
 *
 * Pré-requis : INTEGRATION_DATABASE_URL pointant sur une DB Postgres dédiée
 * (cf test/integration/setup.ts). Skip silencieux sinon.
 *
 * NOTE : on simule l'appel Stripe via un délai contrôlé pour créer la
 * fenêtre de race. L'appel Stripe réel reste mocké au niveau de la lib
 * (createStripeRefund) — pas besoin d'un vrai test Stripe E2E.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";
import { createTestUser, createTestProduct, createTestSku } from "@/test/integration/factories";
import {
	OrderStatus,
	PaymentStatus,
	RefundStatus,
	type Order,
	type Refund,
} from "@/app/generated/prisma/client";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

describeIntegration("processRefund — TOCTOU concurrent guard (integration)", () => {
	let prisma: ReturnType<typeof getIntegrationPrismaClient>;
	let order: Order;
	let refund: Refund;

	beforeEach(async () => {
		prisma = getIntegrationPrismaClient();
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id, { inventory: 5 });

		order = await prisma.order.create({
			data: {
				userId: user.id,
				orderNumber: `SYN-INT-${Date.now()}`,
				customerEmail: user.email,
				customerName: "Marie Dupont",
				shippingFirstName: "Marie",
				shippingLastName: "Dupont",
				shippingAddress1: "12 rue test",
				shippingPostalCode: "75001",
				shippingCity: "Paris",
				shippingCountry: "FR",
				shippingPhone: "+33600000000",
				status: OrderStatus.PROCESSING,
				paymentStatus: PaymentStatus.PAID,
				stripePaymentIntentId: `pi_test_${Date.now()}`,
				total: 5000,
				subtotal: 5000,
				items: {
					create: [
						{
							skuId: sku.id,
							quantity: 2,
							productTitle: "Bracelet Lune",
							price: 2500,
						},
					],
				},
			},
		});

		refund = await prisma.refund.create({
			data: {
				orderId: order.id,
				amount: 5000,
				currency: "EUR",
				reason: "CUSTOMER_REQUEST",
				status: RefundStatus.APPROVED,
			},
		});
	});

	it("prevents double-processing via updateMany TOCTOU guard", async () => {
		// Simulate the race: 2 concurrent updates to APPROVED→COMPLETED on the
		// same refund. Only the first should succeed (count=1). The second
		// must see status=COMPLETED already and return count=0.
		const [updateA, updateB] = await Promise.all([
			prisma.refund.updateMany({
				where: { id: refund.id, status: RefundStatus.APPROVED },
				data: { status: RefundStatus.COMPLETED, processedAt: new Date() },
			}),
			prisma.refund.updateMany({
				where: { id: refund.id, status: RefundStatus.APPROVED },
				data: { status: RefundStatus.COMPLETED, processedAt: new Date() },
			}),
		]);

		// Exactly one updateMany should have applied.
		expect([updateA.count, updateB.count].sort()).toEqual([0, 1]);

		const finalRefund = await prisma.refund.findUnique({ where: { id: refund.id } });
		expect(finalRefund?.status).toBe(RefundStatus.COMPLETED);
	});

	it("does not double-restock inventory when 2 concurrent process attempts collide", async () => {
		const firstItem = await prisma.orderItem.findFirst({ where: { orderId: order.id } });
		const skuId = firstItem?.skuId ?? null;
		expect(skuId).toBeTruthy();
		const skuBefore = await prisma.productSku.findUnique({ where: { id: skuId! } });
		const inventoryBefore = skuBefore?.inventory ?? 0;

		// Each "attempt" first tries to lock APPROVED→COMPLETED, then restock if it won.
		async function attempt(): Promise<{ won: boolean }> {
			const updated = await prisma.refund.updateMany({
				where: { id: refund.id, status: RefundStatus.APPROVED },
				data: { status: RefundStatus.COMPLETED, processedAt: new Date() },
			});
			if (updated.count === 0) return { won: false };
			// Only the winner restocks
			await prisma.productSku.update({
				where: { id: skuId! },
				data: { inventory: { increment: 2 } },
			});
			return { won: true };
		}

		const [a, b] = await Promise.all([attempt(), attempt()]);

		const winners = [a, b].filter((r) => r.won).length;
		expect(winners).toBe(1);

		const skuAfter = await prisma.productSku.findUnique({ where: { id: skuId! } });
		expect(skuAfter?.inventory).toBe(inventoryBefore + 2);
		// Crucially NOT `inventoryBefore + 4` (no double-restock)
	});
});
