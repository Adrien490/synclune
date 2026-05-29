/**
 * @regression ereporting-requeue-rejected-abandoned
 *
 * Cycle de re-queue end-to-end contre un Postgres réel : une transaction
 * e-reporting d'un batch qui échoue terminalement (REJECTED/ABANDONED) est
 * détachée (`batchId = null`, `status = PENDING`) par
 * `submit-ereporting-batch.service.ts`, puis DOIT être ré-agrégée par
 * `build-ereporting-batch` dans un NOUVEAU batch — sans jamais violer le unique
 * `[orderId, type]` (on réutilise la MÊME ligne, on n'en crée pas une nouvelle).
 *
 * Le détachement lui-même (étape submit) est verrouillé en unitaire par
 * `ereporting-requeue-on-terminal-failure.regression.test.ts`. Ici on prouve la
 * partie réellement dépendante de Postgres : `build` reprend une transaction qui
 * a DÉJÀ porté un batchId, et l'index unique partiel-null ne bloque pas la
 * ré-agrégation.
 *
 * Pré-requis : INTEGRATION_DATABASE_URL + INVOICE_ENABLE_EREPORTING=true.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";
import { createTestUser, createTestProduct, createTestSku } from "@/test/integration/factories";
import { recordSalesEReporting } from "../record-ereporting.service";
import { buildEReportingBatch } from "@/modules/cron/services/build-ereporting-batch.service";
import {
	EReportingStatus,
	OrderStatus,
	PaymentStatus,
	type Order,
} from "@/app/generated/prisma/client";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

/** Order PAID dont `paidAt` est dans le passé pour que `build` le ré-agrège
 * (build ignore la journée UTC en cours). */
async function createPastPaidOrder(
	prisma: ReturnType<typeof getIntegrationPrismaClient>,
	userId: string,
	skuId: string,
	totalCents: number,
	paidAt: Date,
): Promise<Order> {
	return prisma.order.create({
		data: {
			userId,
			orderNumber: `SYN-RQUE-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			customerEmail: "rque@test.local",
			customerName: "RQUE Test",
			customerType: "B2C",
			shippingFirstName: "R",
			shippingLastName: "QUE",
			shippingAddress1: "1 rue",
			shippingPostalCode: "75001",
			shippingCity: "Paris",
			shippingCountry: "FR",
			shippingPhone: "+33600000000",
			status: OrderStatus.PROCESSING,
			paymentStatus: PaymentStatus.PAID,
			paidAt,
			stripePaymentIntentId: `pi_rque_${Date.now()}_${Math.random()}`,
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
						productTitle: "RQUE",
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

describeIntegration("re-queue → rebuild d'une transaction e-reporting (Postgres réel)", () => {
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

	it("transaction re-queuée → build la ré-agrège dans un NOUVEAU batch, sans doublon", async () => {
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);
		const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
		const order = await createPastPaidOrder(prisma, user.id, sku.id, 4999, twoDaysAgo);

		// 1. Crée la transaction SALES (PENDING, batchId=null).
		const recorded = await recordSalesEReporting(order.id);
		expect(recorded).not.toBe("error");

		const created = await prisma.eReportingTransaction.findFirstOrThrow({
			where: { orderId: order.id, type: "SALES" },
			select: { id: true, batchId: true, status: true },
		});
		expect(created.batchId).toBeNull();
		expect(created.status).toBe(EReportingStatus.PENDING);

		// 2. Premier build → batch B1, transaction rattachée.
		await buildEReportingBatch();
		const afterBuild1 = await prisma.eReportingTransaction.findUniqueOrThrow({
			where: { id: created.id },
			select: { id: true, batchId: true },
		});
		expect(afterBuild1.batchId).not.toBeNull();
		const batchId1 = afterBuild1.batchId as string;

		// 3. Simule le re-queue effectué par submit sur échec terminal
		//    (REJECTED/ABANDONED) : détache + repasse PENDING. Le batch B1 reste un
		//    tombstone. (La logique submit est verrouillée en unitaire ; ici on
		//    valide la reprise par build côté Postgres.)
		await prisma.eReportingTransaction.updateMany({
			where: { batchId: batchId1 },
			data: { batchId: null, status: EReportingStatus.PENDING },
		});

		// 4. Second build → DOIT créer un NOUVEAU batch B2 et y rattacher la MÊME
		//    ligne transaction. Aucune violation du unique [orderId, type].
		await buildEReportingBatch();
		const afterBuild2 = await prisma.eReportingTransaction.findUniqueOrThrow({
			where: { id: created.id },
			select: { id: true, batchId: true, status: true },
		});
		expect(afterBuild2.batchId).not.toBeNull();
		expect(afterBuild2.batchId).not.toBe(batchId1); // nouveau batch
		expect(afterBuild2.status).toBe(EReportingStatus.PENDING);

		// 5. Anti-doublon : exactement UNE transaction pour cet order (réutilisation
		//    de la même ligne, jamais de create — preuve que le unique ne bloque pas
		//    la re-mise-en-file).
		const count = await prisma.eReportingTransaction.count({
			where: { orderId: order.id, type: "SALES" },
		});
		expect(count).toBe(1);

		// 6. B1 subsiste comme tombstone (les deux batches existent).
		const batchCount = await prisma.eReportingBatch.count();
		expect(batchCount).toBe(2);
	});

	it("transaction ACCEPTED (rattachée) n'est PAS reprise par un build ultérieur", async () => {
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);
		const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
		const order = await createPastPaidOrder(prisma, user.id, sku.id, 3000, twoDaysAgo);

		await recordSalesEReporting(order.id);
		await buildEReportingBatch();

		const tx = await prisma.eReportingTransaction.findFirstOrThrow({
			where: { orderId: order.id, type: "SALES" },
			select: { id: true, batchId: true },
		});
		const batchId1 = tx.batchId as string;

		// Simule une transmission ACCEPTED : status propagé, RESTE rattachée.
		await prisma.eReportingTransaction.updateMany({
			where: { batchId: batchId1 },
			data: { status: EReportingStatus.ACCEPTED },
		});

		// Un build ultérieur ne doit rien reprendre (filtre batchId IS NULL + PENDING).
		await buildEReportingBatch();
		const after = await prisma.eReportingTransaction.findUniqueOrThrow({
			where: { id: tx.id },
			select: { batchId: true, status: true },
		});
		expect(after.batchId).toBe(batchId1); // inchangé
		expect(after.status).toBe(EReportingStatus.ACCEPTED);
		expect(await prisma.eReportingBatch.count()).toBe(1); // pas de nouveau batch
	});
});
