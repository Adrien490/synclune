/**
 * @regression credit-note-cross-table-unique-db-guard
 *
 * Durcissement EINV-PRISMA-001 (audit numérotation gap-free 2026-07-09) —
 * trigger DB `check_credit_note_cross_table_unique` (migration 20260709).
 *
 * Les contraintes UNIQUE sur `Order.creditNoteNumber` et
 * `Refund.creditNoteNumber` sont PER-TABLE : sans le trigger, une écriture SQL
 * manuelle (ou un script bugué) contournant l'advisory lock 2_000_000+year
 * pourrait attribuer le même numéro A-YYYY-NNNNN dans les deux tables —
 * doublon indétectable par contrainte (violation Art. 286 CGI, détectée
 * seulement a posteriori par check-sequence-continuity).
 *
 * Ce test valide que la DB elle-même rejette (SQLSTATE 23505 → Prisma P2002)
 * toute écriture cross-table dupliquée, dans les deux directions, sans faux
 * positif sur les écritures légitimes.
 *
 * Pré-requis : INTEGRATION_DATABASE_URL (skip silencieux sinon). Le trigger
 * est appliqué par test/integration/setup.ts après `db push` (les migrations
 * raw-SQL ne sont pas rejouées par db push).
 */

import { describe, it, expect } from "vitest";
import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";
import { createTestUser, createTestProduct, createTestSku } from "@/test/integration/factories";
import {
	OrderStatus,
	PaymentStatus,
	RefundReason,
	RefundStatus,
	type Order,
	type Refund,
} from "@/app/generated/prisma/client";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

// Concaténation volontaire (pas de template `A-${...}`) : cohérent avec la
// convention du guard no-manual-invoice-creation — seuls les services SSOT
// émettent la forme template canonique.
const creditNote = (seq: number): string =>
	"A-" + new Date().getFullYear() + "-" + String(seq).padStart(5, "0");

async function createPaidOrder(
	prisma: ReturnType<typeof getIntegrationPrismaClient>,
	userId: string,
	skuId: string,
	suffix: string,
): Promise<Order> {
	return prisma.order.create({
		data: {
			userId,
			orderNumber: `SYN-XTBL-${suffix}`,
			customerEmail: "crosstable@test.local",
			customerName: "Test CrossTable",
			shippingFirstName: "Test",
			shippingLastName: "CrossTable",
			shippingAddress1: "1 rue test",
			shippingPostalCode: "75001",
			shippingCity: "Paris",
			shippingCountry: "FR",
			shippingPhone: "+33600000000",
			status: OrderStatus.PROCESSING,
			paymentStatus: PaymentStatus.PAID,
			paidAt: new Date(),
			stripePaymentIntentId: `pi_xtbl_${suffix}_${Date.now()}`,
			subtotal: 4999,
			discountAmount: 0,
			shippingCost: 0,
			taxAmount: 0,
			total: 4999,
			currency: "EUR",
			paymentMethod: "CARD",
			invoiceStatus: null,
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

async function createCompletedRefund(
	prisma: ReturnType<typeof getIntegrationPrismaClient>,
	orderId: string,
): Promise<Refund> {
	return prisma.refund.create({
		data: {
			orderId,
			amount: 1000,
			reason: RefundReason.CUSTOMER_REQUEST,
			status: RefundStatus.COMPLETED,
			processedAt: new Date(),
		},
	});
}

function expectCrossTableRejection(e: unknown): void {
	// SQLSTATE 23505 levé par le trigger → mappé P2002 par Prisma. On accepte
	// aussi le message brut au cas où le mapping driver-adapter évoluerait.
	const code = (e as { code?: string }).code;
	const message = e instanceof Error ? e.message : String(e);
	expect(
		code === "P2002" || /deja attribue|23505|CreditNote_cross_table_unique/.test(message),
	).toBe(true);
}

describeIntegration(
	"creditNoteNumber — unicité cross-table Order/Refund garantie par la DB (trigger 20260709)",
	() => {
		it("Order porte un numéro → l'écrire sur un Refund est rejeté (23505/P2002)", async () => {
			const prisma = getIntegrationPrismaClient();
			const user = await createTestUser();
			const product = await createTestProduct();
			const sku = await createTestSku(product.id);
			const order = await createPaidOrder(prisma, user.id, sku.id, `A-${Date.now()}`);
			const refund = await createCompletedRefund(prisma, order.id);

			const number = creditNote(1);
			await prisma.order.update({
				where: { id: order.id },
				data: { creditNoteNumber: number, creditNoteGeneratedAt: new Date() },
			});

			let thrown: unknown = null;
			try {
				await prisma.refund.update({
					where: { id: refund.id },
					data: { creditNoteNumber: number, creditNoteGeneratedAt: new Date() },
				});
			} catch (e) {
				thrown = e;
			}
			expect(thrown).not.toBeNull();
			expectCrossTableRejection(thrown);

			// Le Refund est resté vierge — pas d'écriture partielle.
			const persisted = await prisma.refund.findUniqueOrThrow({
				where: { id: refund.id },
				select: { creditNoteNumber: true },
			});
			expect(persisted.creditNoteNumber).toBeNull();
		});

		it("Refund porte un numéro → l'écrire sur un Order est rejeté (23505/P2002)", async () => {
			const prisma = getIntegrationPrismaClient();
			const user = await createTestUser();
			const product = await createTestProduct();
			const sku = await createTestSku(product.id);
			const order = await createPaidOrder(prisma, user.id, sku.id, `B-${Date.now()}`);
			const refund = await createCompletedRefund(prisma, order.id);

			const number = creditNote(2);
			await prisma.refund.update({
				where: { id: refund.id },
				data: { creditNoteNumber: number, creditNoteGeneratedAt: new Date() },
			});

			let thrown: unknown = null;
			try {
				await prisma.order.update({
					where: { id: order.id },
					data: { creditNoteNumber: number, creditNoteGeneratedAt: new Date() },
				});
			} catch (e) {
				thrown = e;
			}
			expect(thrown).not.toBeNull();
			expectCrossTableRejection(thrown);

			const persisted = await prisma.order.findUniqueOrThrow({
				where: { id: order.id },
				select: { creditNoteNumber: true },
			});
			expect(persisted.creditNoteNumber).toBeNull();
		});

		it("pas de faux positif : numéros distincts acceptés dans les deux tables + réécriture idempotente du même numéro sur la même ligne", async () => {
			const prisma = getIntegrationPrismaClient();
			const user = await createTestUser();
			const product = await createTestProduct();
			const sku = await createTestSku(product.id);
			const order = await createPaidOrder(prisma, user.id, sku.id, `C-${Date.now()}`);
			const refund = await createCompletedRefund(prisma, order.id);

			const orderNumber = creditNote(3);
			const refundNumber = creditNote(4);

			await prisma.order.update({
				where: { id: order.id },
				data: { creditNoteNumber: orderNumber, creditNoteGeneratedAt: new Date() },
			});
			await prisma.refund.update({
				where: { id: refund.id },
				data: { creditNoteNumber: refundNumber, creditNoteGeneratedAt: new Date() },
			});

			// Réécriture idempotente (même valeur, même ligne) : le trigger ne
			// compare que L'AUTRE table — pas d'auto-collision.
			await prisma.order.update({
				where: { id: order.id },
				data: { creditNoteNumber: orderNumber },
			});

			const [persistedOrder, persistedRefund] = await Promise.all([
				prisma.order.findUniqueOrThrow({
					where: { id: order.id },
					select: { creditNoteNumber: true },
				}),
				prisma.refund.findUniqueOrThrow({
					where: { id: refund.id },
					select: { creditNoteNumber: true },
				}),
			]);
			expect(persistedOrder.creditNoteNumber).toBe(orderNumber);
			expect(persistedRefund.creditNoteNumber).toBe(refundNumber);
		});
	},
);
