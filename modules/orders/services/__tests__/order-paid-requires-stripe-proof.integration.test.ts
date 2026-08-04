/**
 * @regression order-paid-requires-stripe-proof-db-guard
 *
 * Filet DB de l'invariant #8 « Pas de vente manuelle / pas de caisse » (NF 525),
 * migration 20260731120000 — audit invariant 8 du 2026-07-31.
 *
 * L'invariant tenait jusqu'ici sur l'application seule : deux writers PAID, tous
 * deux ancrés sur un PaymentIntent, plus le scan statique
 * `no-manual-paid-order.regression.test.ts`. Ni l'un ni l'autre ne voit une
 * écriture SQL manuelle ou un script bugué — exactement le vecteur que le trigger
 * d'unicité des avoirs couvre déjà pour l'Art. 286. Une commande PAID sans preuve
 * PSP produit une facture fiscale sans encaissement (Art. 286 / 289-I CGI).
 *
 * Ce test valide les deux CHECK dans les deux sens : rejet des états interdits,
 * ET absence de faux positif sur les deux écritures légitimes — la transition
 * PAID nominale, et la purge RGPD 10 ans qui nulle `stripePaymentIntentId` sur
 * une ligne restée PAID.
 *
 * Pré-requis : INTEGRATION_DATABASE_URL (skip silencieux sinon). Les CHECK sont
 * appliqués par test/integration/setup.ts, qui rejoue `prisma/sql/raw-guards.sql`
 * après `db push` (db push ignore le SQL brut).
 */

import { describe, it, expect } from "vitest";
import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";
import { createTestProduct, createTestSku } from "@/test/integration/factories";
import { OrderStatus, PaymentStatus, type Order } from "@/app/generated/prisma/client";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

type IntegrationPrisma = ReturnType<typeof getIntegrationPrismaClient>;

/**
 * Crée une commande PENDING conforme (aucun CHECK ne s'applique hors de l'état
 * PAID), prête à être poussée dans un état interdit par les tests.
 */
async function createPendingOrder(
	prisma: IntegrationPrisma,
	skuId: string,
	suffix: string,
): Promise<Order> {
	return prisma.order.create({
		data: {
			orderNumber: `SYN-PAIDGUARD-${suffix}`,
			customerEmail: "paidguard@test.local",
			customerName: "Test PaidGuard",
			shippingFirstName: "Test",
			shippingLastName: "PaidGuard",
			shippingAddress1: "1 rue test",
			shippingPostalCode: "75001",
			shippingCity: "Paris",
			shippingCountry: "FR",
			shippingPhone: "+33600000000",
			status: OrderStatus.PENDING,
			paymentStatus: PaymentStatus.PENDING,
			subtotal: 4999,
			discountAmount: 0,
			shippingCost: 0,
			taxAmount: 0,
			total: 4999,
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

/**
 * Une violation de CHECK est levée en SQLSTATE 23514. Prisma ne lui donne pas de
 * code Pxxxx stable selon l'adaptateur : on assert sur le NOM de la contrainte,
 * qui est ce qui compte (un rejet par une AUTRE contrainte rendrait le test vert
 * pour la mauvaise raison).
 */
function expectCheckRejection(e: unknown, constraint: string): void {
	expect(e).not.toBeNull();
	const message = e instanceof Error ? e.message : String(e);
	expect(message).toContain(constraint);
}

async function captureError(fn: () => Promise<unknown>): Promise<unknown> {
	try {
		await fn();
		return null;
	} catch (e) {
		return e;
	}
}

describeIntegration(
	"Order — la DB refuse un encaissement sans preuve Stripe (invariant #8)",
	() => {
		it("UPDATE → PAID sans stripePaymentIntentId est rejeté", async () => {
			const prisma = getIntegrationPrismaClient();
			const product = await createTestProduct();
			const sku = await createTestSku(product.id);
			const order = await createPendingOrder(prisma, sku.id, `A-${Date.now()}`);

			const thrown = await captureError(() =>
				prisma.order.update({
					where: { id: order.id },
					data: {
						paymentStatus: PaymentStatus.PAID,
						status: OrderStatus.PROCESSING,
						paidAt: new Date(),
					},
				}),
			);
			expectCheckRejection(thrown, "Order_paid_requires_stripe_proof");

			// Aucune écriture partielle : la commande est restée PENDING.
			const persisted = await prisma.order.findUniqueOrThrow({
				where: { id: order.id },
				select: { paymentStatus: true, paidAt: true },
			});
			expect(persisted.paymentStatus).toBe(PaymentStatus.PENDING);
			expect(persisted.paidAt).toBeNull();
		});

		it("CREATE direct d'une commande PAID sans PaymentIntent est rejeté", async () => {
			const prisma = getIntegrationPrismaClient();
			const product = await createTestProduct();
			const sku = await createTestSku(product.id);

			// C'est le scénario « vente manuelle » exact : un script qui fabrique une
			// commande déjà encaissée sans être passé par le checkout Stripe.
			const thrown = await captureError(() =>
				prisma.order.create({
					data: {
						orderNumber: `SYN-PAIDGUARD-CASH-${Date.now()}`,
						customerEmail: "cash@test.local",
						customerName: "Vente Comptoir",
						shippingFirstName: "Vente",
						shippingLastName: "Comptoir",
						shippingAddress1: "1 rue test",
						shippingPostalCode: "75001",
						shippingCity: "Paris",
						shippingCountry: "FR",
						shippingPhone: "+33600000000",
						status: OrderStatus.PROCESSING,
						paymentStatus: PaymentStatus.PAID,
						paidAt: new Date(),
						subtotal: 4999,
						discountAmount: 0,
						shippingCost: 0,
						taxAmount: 0,
						total: 4999,
						items: {
							create: [
								{
									skuId: sku.id,
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
				}),
			);
			expectCheckRejection(thrown, "Order_paid_requires_stripe_proof");
		});

		it("PAID sans paidAt est rejeté (cohérence EINV-SEQ-008)", async () => {
			const prisma = getIntegrationPrismaClient();
			const product = await createTestProduct();
			const sku = await createTestSku(product.id);
			const order = await createPendingOrder(prisma, sku.id, `B-${Date.now()}`);

			const thrown = await captureError(() =>
				prisma.order.update({
					where: { id: order.id },
					data: {
						paymentStatus: PaymentStatus.PAID,
						status: OrderStatus.PROCESSING,
						stripePaymentIntentId: `pi_paidguard_${Date.now()}`,
						// paidAt volontairement omis : `persistInvoiceNumber` laisserait
						// passer cet état par la seconde branche de sa disjonction.
					},
				}),
			);
			expectCheckRejection(thrown, "Order_paid_requires_paidAt");
		});

		it("la transition PAID nominale (PI + paidAt) passe — pas de faux positif", async () => {
			const prisma = getIntegrationPrismaClient();
			const product = await createTestProduct();
			const sku = await createTestSku(product.id);
			const order = await createPendingOrder(prisma, sku.id, `C-${Date.now()}`);

			const updated = await prisma.order.update({
				where: { id: order.id },
				data: {
					paymentStatus: PaymentStatus.PAID,
					status: OrderStatus.PROCESSING,
					paidAt: new Date(),
					stripePaymentIntentId: `pi_paidguard_ok_${Date.now()}`,
				},
				select: { paymentStatus: true },
			});
			expect(updated.paymentStatus).toBe(PaymentStatus.PAID);
		});

		it("la purge RGPD 10 ans peut nuller le PaymentIntent d'une ligne restée PAID", async () => {
			const prisma = getIntegrationPrismaClient();
			const product = await createTestProduct();
			const sku = await createTestSku(product.id);
			const order = await createPendingOrder(prisma, sku.id, `D-${Date.now()}`);

			await prisma.order.update({
				where: { id: order.id },
				data: {
					paymentStatus: PaymentStatus.PAID,
					status: OrderStatus.PROCESSING,
					paidAt: new Date(),
					stripePaymentIntentId: `pi_paidguard_purge_${Date.now()}`,
				},
			});

			// Reproduit `hard-delete-retention` : scrub ET marqueur dans le MÊME update.
			// C'est ce qui rend la branche `piiPurgedAt` du CHECK sûre — un CHECK est
			// évalué par ligne APRÈS l'instruction, jamais entre deux colonnes.
			const purged = await prisma.order.update({
				where: { id: order.id },
				data: { stripePaymentIntentId: null, piiPurgedAt: new Date() },
				select: { paymentStatus: true, stripePaymentIntentId: true, piiPurgedAt: true },
			});
			expect(purged.paymentStatus).toBe(PaymentStatus.PAID);
			expect(purged.stripePaymentIntentId).toBeNull();
			expect(purged.piiPurgedAt).not.toBeNull();
		});

		it("scrubber le PaymentIntent SANS poser piiPurgedAt reste rejeté", async () => {
			const prisma = getIntegrationPrismaClient();
			const product = await createTestProduct();
			const sku = await createTestSku(product.id);
			const order = await createPendingOrder(prisma, sku.id, `E-${Date.now()}`);

			await prisma.order.update({
				where: { id: order.id },
				data: {
					paymentStatus: PaymentStatus.PAID,
					status: OrderStatus.PROCESSING,
					paidAt: new Date(),
					stripePaymentIntentId: `pi_paidguard_nomark_${Date.now()}`,
				},
			});

			// Garde-fou du garde-fou : si une future purge séparait le scrub du
			// marqueur, elle casserait ici — et c'est le comportement voulu, pas un
			// test à assouplir.
			const thrown = await captureError(() =>
				prisma.order.update({
					where: { id: order.id },
					data: { stripePaymentIntentId: null },
				}),
			);
			expectCheckRejection(thrown, "Order_paid_requires_stripe_proof");
		});
	},
);
