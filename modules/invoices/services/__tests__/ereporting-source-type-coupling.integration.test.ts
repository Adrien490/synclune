/**
 * @regression ereporting-source-type-coupling
 *
 * Verrouille le couplage type↔source de la CHECK `EReportingTransaction_source_xor`.
 *
 * Avant le renforcement (migration 20260529120000), la contrainte n'imposait que
 * « exactement une FK renseignée » (XOR orderId/refundId) — un SALES rattaché à un
 * refundId ou un REFUND rattaché à un orderId passait la garde DB. La CHECK voisine
 * `amount_sign_matches_type` ne fermait pas le trou (un SALES amountIncTax>0 + refundId
 * satisfait les deux).
 *
 * Après : SALES/PAYMENT ⇒ orderId NOT NULL & refundId NULL ; REFUND ⇒ refundId NOT NULL
 * & orderId NULL. Ce test verrouille ce couplage au niveau Postgres (backstop du service
 * record-ereporting.service.ts — Invariant 9 CLAUDE.md).
 *
 * Dépend du comportement réel Postgres (CHECK) ⇒ test d'intégration, pas de mock
 * (règle CLAUDE.md : pas de mock DB sur la logique qui dépend du moteur).
 *
 * Pré-requis : INTEGRATION_DATABASE_URL.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
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

async function createPaidOrder(
	prisma: ReturnType<typeof getIntegrationPrismaClient>,
	userId: string,
	skuId: string,
	totalCents: number,
): Promise<Order> {
	return prisma.order.create({
		data: {
			userId,
			orderNumber: `SYN-ERSC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			customerEmail: "ersc@test.local",
			customerName: "ERSC Test",
			customerType: "B2C",
			shippingFirstName: "E",
			shippingLastName: "RSC",
			shippingAddress1: "1 rue",
			shippingPostalCode: "75001",
			shippingCity: "Paris",
			shippingCountry: "FR",
			shippingPhone: "+33600000000",
			status: OrderStatus.PROCESSING,
			paymentStatus: PaymentStatus.PAID,
			paidAt: new Date(),
			stripePaymentIntentId: `pi_ersc_${Date.now()}_${Math.random()}`,
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
						productTitle: "ERSC",
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

const BASE_TX = {
	occurredAt: new Date(),
	countryCode: "FR",
	paymentMethod: "CARD" as const,
	amountExclTax: 0,
	taxAmount: 0,
	currency: "EUR",
	payloadSnapshot: {},
};

describeIntegration("EReportingTransaction_source_xor — couplage type↔source", () => {
	let prisma: ReturnType<typeof getIntegrationPrismaClient>;

	beforeEach(() => {
		prisma = getIntegrationPrismaClient();
	});

	afterEach(async () => {
		await prisma.eReportingTransaction.deleteMany({});
	});

	it("rejette un SALES rattaché à un refundId (orderId null)", async () => {
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);
		const order = await createPaidOrder(prisma, user.id, sku.id, 4999);
		const refund = await prisma.refund.create({
			data: {
				orderId: order.id,
				amount: 4999,
				currency: "EUR",
				reason: "CUSTOMER_REQUEST",
				status: RefundStatus.COMPLETED,
				processedAt: new Date(),
			},
		});

		await expect(
			prisma.eReportingTransaction.create({
				data: {
					...BASE_TX,
					type: "SALES",
					orderId: null,
					refundId: refund.id, // mauvaise source pour un SALES
					amountIncTax: 4999, // positif → passe amount_sign_matches_type
				},
			}),
		).rejects.toThrow(/source_xor/);
	});

	it("rejette un REFUND rattaché à un orderId (refundId null)", async () => {
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);
		const order = await createPaidOrder(prisma, user.id, sku.id, 4999);

		await expect(
			prisma.eReportingTransaction.create({
				data: {
					...BASE_TX,
					type: "REFUND",
					orderId: order.id, // mauvaise source pour un REFUND
					refundId: null,
					amountIncTax: -4999, // négatif → passe amount_sign_matches_type
				},
			}),
		).rejects.toThrow(/source_xor/);
	});

	it("accepte un SALES légitime (orderId set, refundId null, montant positif)", async () => {
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);
		const order = await createPaidOrder(prisma, user.id, sku.id, 4999);

		const created = await prisma.eReportingTransaction.create({
			data: {
				...BASE_TX,
				type: "SALES",
				orderId: order.id,
				refundId: null,
				amountIncTax: 4999,
			},
		});

		expect(created.id).toBeTruthy();
		expect(created.orderId).toBe(order.id);
		expect(created.refundId).toBeNull();
	});

	it("accepte un REFUND légitime (refundId set, orderId null, montant négatif)", async () => {
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);
		const order = await createPaidOrder(prisma, user.id, sku.id, 4999);
		const refund = await prisma.refund.create({
			data: {
				orderId: order.id,
				amount: 4999,
				currency: "EUR",
				reason: "CUSTOMER_REQUEST",
				status: RefundStatus.COMPLETED,
				processedAt: new Date(),
			},
		});

		const created = await prisma.eReportingTransaction.create({
			data: {
				...BASE_TX,
				type: "REFUND",
				orderId: null,
				refundId: refund.id,
				amountIncTax: -4999,
			},
		});

		expect(created.id).toBeTruthy();
		expect(created.refundId).toBe(refund.id);
		expect(created.orderId).toBeNull();
	});
});
