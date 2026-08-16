/**
 * @regression retractation-refund-finalization
 *
 * Exerce `finalizeRetractationRefund` contre un Postgres réel : la transaction
 * (transition REFUNDED + avoir + Order.status + restock) et l'unicité
 * `creditNoteNumber` sont validées par la base, pas par des mocks — le test
 * unitaire ne voit ni le `@unique`, ni l'atomicité réelle du `$transaction`.
 *
 * Muet sans INTEGRATION_DATABASE_URL (cf. conventions de tests).
 */
import { beforeEach, describe, expect, it } from "vitest";

import { finalizeRetractationRefund } from "@/modules/retractations/services/finalize-retractation-refund.service";
import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";
import {
	createTestOrder,
	createTestProduct,
	createTestVariant,
} from "@/test/integration/factories";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

describeIntegration("finalizeRetractationRefund — transaction contre le schéma réel", () => {
	let prisma: ReturnType<typeof getIntegrationPrismaClient>;

	beforeEach(() => {
		prisma = getIntegrationPrismaClient();
	});

	async function createAwaitingReturnRetractation(params?: { stock?: number; quantity?: number }) {
		const product = await createTestProduct();
		const variant = await createTestVariant(product.id, { stock: params?.stock ?? 5 });
		const order = await createTestOrder(
			[{ variantId: variant.id, quantity: params?.quantity ?? 2 }],
			{ status: "PAID" },
		);
		const retractation = await prisma.retractationRequest.create({
			data: {
				orderId: order.id,
				status: "AWAITING_RETURN",
				itemReceivedAt: new Date(),
			},
			select: { id: true },
		});
		return { retractationId: retractation.id, orderId: order.id, variantId: variant.id };
	}

	it("transition + avoir + Order REFUNDED dans UNE transaction, stock intact sans restock", async () => {
		const { retractationId, orderId, variantId } = await createAwaitingReturnRetractation();

		const result = await finalizeRetractationRefund({
			retractationId,
			stripeRefundId: "re_int_1",
			restock: false,
		});

		expect(result.outcome).toBe("refunded");
		expect(result.creditNoteNumber).toBe(1);

		const retractation = await prisma.retractationRequest.findUnique({
			where: { id: retractationId },
			select: { status: true, creditNoteNumber: true, stripeRefundId: true, refundedAt: true },
		});
		expect(retractation).toMatchObject({
			status: "REFUNDED",
			creditNoteNumber: 1,
			stripeRefundId: "re_int_1",
		});
		expect(retractation!.refundedAt).not.toBeNull();

		const order = await prisma.order.findUnique({
			where: { id: orderId },
			select: { status: true },
		});
		expect(order!.status).toBe("REFUNDED");

		const variant = await prisma.productVariant.findUnique({
			where: { id: variantId },
			select: { stock: true },
		});
		expect(variant!.stock).toBe(5);
	});

	it("restock opt-in : le stock remonte de la quantité commandée", async () => {
		const { retractationId, variantId } = await createAwaitingReturnRetractation({
			stock: 3,
			quantity: 2,
		});

		await finalizeRetractationRefund({
			retractationId,
			stripeRefundId: "re_int_2",
			restock: true,
		});

		const variant = await prisma.productVariant.findUnique({
			where: { id: variantId },
			select: { stock: true },
		});
		expect(variant!.stock).toBe(5);
	});

	it("le compteur d'avoirs est séquentiel entre demandes, et un rejeu est un noop sans numéro consommé", async () => {
		const first = await createAwaitingReturnRetractation();
		const second = await createAwaitingReturnRetractation();

		const r1 = await finalizeRetractationRefund({
			retractationId: first.retractationId,
			stripeRefundId: "re_int_3a",
			restock: false,
		});
		const r2 = await finalizeRetractationRefund({
			retractationId: second.retractationId,
			stripeRefundId: "re_int_3b",
			restock: false,
		});
		const replay = await finalizeRetractationRefund({
			retractationId: first.retractationId,
			stripeRefundId: "re_int_3a",
			restock: true,
		});

		expect(r1.creditNoteNumber).toBe(1);
		expect(r2.creditNoteNumber).toBe(2);
		expect(replay.outcome).toBe("noop");

		const max = await prisma.retractationRequest.aggregate({
			_max: { creditNoteNumber: true },
		});
		expect(max._max.creditNoteNumber).toBe(2);
	});
});
