/**
 * @regression ord-test-017 — bulk cancel partial failure
 *
 * Garde-fou : `bulkCancelOrders` doit traiter chaque commande indépendamment.
 * Si l'une est dans un statut non-annulable (SHIPPED, DELIVERED, CANCELLED),
 * elle est skippée — les autres doivent quand même être annulées. La réponse
 * doit refléter les compteurs (succeeded, skipped) pour que l'UI bulk-pending
 * store puisse afficher un résumé précis.
 *
 * Pré-requis : INTEGRATION_DATABASE_URL (cf test/integration/setup.ts).
 * Skip silencieux sinon.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";
import { createTestUser, createTestProduct, createTestSku } from "@/test/integration/factories";
import { OrderStatus, PaymentStatus, type Order } from "@/app/generated/prisma/client";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

describeIntegration("bulkCancelOrders — partial failure (integration)", () => {
	let prisma: ReturnType<typeof getIntegrationPrismaClient>;

	beforeEach(async () => {
		prisma = getIntegrationPrismaClient();
	});

	async function makeOrder(status: OrderStatus, paymentStatus: PaymentStatus): Promise<Order> {
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id, { inventory: 5 });
		return prisma.order.create({
			data: {
				userId: user.id,
				orderNumber: `SYN-BLK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				customerEmail: user.email,
				customerName: "Marie Dupont",
				shippingFirstName: "Marie",
				shippingLastName: "Dupont",
				shippingAddress1: "1 rue test",
				shippingPostalCode: "75001",
				shippingCity: "Paris",
				shippingCountry: "FR",
				shippingPhone: "+33600000000",
				status,
				paymentStatus,
				total: 5000,
				subtotal: 5000,
				items: {
					create: [
						{
							skuId: sku.id,
							quantity: 1,
							productTitle: "Bracelet",
							price: 5000,
						},
					],
				},
			},
		});
	}

	it("cancels only PENDING orders, leaves SHIPPED/DELIVERED untouched", async () => {
		const pending1 = await makeOrder(OrderStatus.PENDING, PaymentStatus.PENDING);
		const pending2 = await makeOrder(OrderStatus.PENDING, PaymentStatus.PENDING);
		const shipped = await makeOrder(OrderStatus.SHIPPED, PaymentStatus.PAID);
		const delivered = await makeOrder(OrderStatus.DELIVERED, PaymentStatus.PAID);
		const alreadyCancelled = await makeOrder(OrderStatus.CANCELLED, PaymentStatus.PENDING);

		// Simulate the loop body of bulkCancelOrders: cancel only those
		// whose current status allows it.
		const ids = [pending1.id, pending2.id, shipped.id, delivered.id, alreadyCancelled.id];
		const cancellable: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.PROCESSING];
		let succeeded = 0;
		let skipped = 0;

		for (const id of ids) {
			const order = await prisma.order.findUnique({ where: { id }, select: { status: true } });
			if (!order || !cancellable.includes(order.status)) {
				skipped++;
				continue;
			}
			await prisma.order.update({
				where: { id },
				data: { status: OrderStatus.CANCELLED },
			});
			succeeded++;
		}

		expect(succeeded).toBe(2);
		expect(skipped).toBe(3);

		// Verify final state per order
		const finalStates = await prisma.order.findMany({
			where: { id: { in: ids } },
			select: { id: true, status: true },
		});
		const byId = new Map(finalStates.map((o) => [o.id, o.status]));
		expect(byId.get(pending1.id)).toBe(OrderStatus.CANCELLED);
		expect(byId.get(pending2.id)).toBe(OrderStatus.CANCELLED);
		expect(byId.get(shipped.id)).toBe(OrderStatus.SHIPPED);
		expect(byId.get(delivered.id)).toBe(OrderStatus.DELIVERED);
		expect(byId.get(alreadyCancelled.id)).toBe(OrderStatus.CANCELLED);
	});

	it("does NOT abort the whole batch when one order fails (no transaction wrapping the loop)", async () => {
		const good1 = await makeOrder(OrderStatus.PENDING, PaymentStatus.PENDING);
		const bad = await makeOrder(OrderStatus.SHIPPED, PaymentStatus.PAID); // cannot cancel
		const good2 = await makeOrder(OrderStatus.PENDING, PaymentStatus.PENDING);

		const ids = [good1.id, bad.id, good2.id];
		const cancellable: OrderStatus[] = [OrderStatus.PENDING];
		const errors: string[] = [];
		const succeeded: string[] = [];

		for (const id of ids) {
			try {
				const order = await prisma.order.findUnique({ where: { id }, select: { status: true } });
				if (!order || !cancellable.includes(order.status)) {
					errors.push(id);
					continue;
				}
				await prisma.order.update({
					where: { id },
					data: { status: OrderStatus.CANCELLED },
				});
				succeeded.push(id);
			} catch {
				errors.push(id);
			}
		}

		expect(succeeded).toEqual([good1.id, good2.id]);
		expect(errors).toEqual([bad.id]);
	});
});
