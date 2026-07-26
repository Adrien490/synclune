/**
 * @regression void-invoice-concurrency
 *
 * EINV-TEST-002 — Concurrence DB réelle sur `voidInvoice()`.
 *
 * Garantie Art. 272-I CGI : N transactions parallèles sur N Order distincts
 * avec facture GENERATED DOIVENT produire N creditNoteNumber distincts gap-free
 * (format `A-YYYY-NNNNN`). Advisory lock `pg_advisory_xact_lock(2_000_000+year)`
 * — offset distinct du lock facture (1_000_000+year) pour ne pas sérialiser
 * facture + avoir mutuellement.
 *
 * Pré-requis : INTEGRATION_DATABASE_URL set. Skip silencieux sinon.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";
import { createTestUser, createTestProduct, createTestSku } from "@/test/integration/factories";
import { persistInvoiceNumber } from "../persist-invoice-number.service";
import { voidInvoice } from "../void-invoice.service";
import {
	HistorySource,
	OrderStatus,
	PaymentStatus,
	type Order,
} from "@/app/generated/prisma/client";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

async function createPaidOrderWithInvoice(
	prisma: ReturnType<typeof getIntegrationPrismaClient>,
	userId: string,
	skuId: string,
	suffix: string,
): Promise<Order> {
	const order = await prisma.order.create({
		data: {
			userId,
			orderNumber: `SYN-VOID-${suffix}`,
			customerEmail: "void@test.local",
			customerName: "Void Test",
			shippingFirstName: "Test",
			shippingLastName: "Void",
			shippingAddress1: "1 rue",
			shippingPostalCode: "75001",
			shippingCity: "Paris",
			shippingCountry: "FR",
			shippingPhone: "+33600000000",
			status: OrderStatus.PROCESSING,
			paymentStatus: PaymentStatus.PAID,
			paidAt: new Date(),
			stripePaymentIntentId: `pi_void_${suffix}_${Date.now()}`,
			subtotal: 4999,
			discountAmount: 0,
			shippingCost: 0,
			taxAmount: 0,
			total: 4999,
			currency: "EUR",
			paymentMethod: "CARD",
			invoiceStatus: "PENDING",
			items: {
				create: [
					{
						skuId,
						quantity: 1,
						productTitle: "Bague Void",
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
	const persisted = await persistInvoiceNumber(order.id, userId);
	if (!persisted) {
		throw new Error(`Failed to persist invoice number for order ${order.id}`);
	}
	return prisma.order.findUniqueOrThrow({ where: { id: order.id } });
}

describeIntegration("voidInvoice — concurrence Postgres réelle (EINV-TEST-002)", () => {
	let prisma: ReturnType<typeof getIntegrationPrismaClient>;

	beforeEach(async () => {
		prisma = getIntegrationPrismaClient();
	});

	it("10 transactions concurrentes → 10 creditNoteNumber distincts gap-free", async () => {
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);

		const orders: Order[] = [];
		for (let i = 0; i < 10; i++) {
			const o = await createPaidOrderWithInvoice(prisma, user.id, sku.id, `B-${i}-${Date.now()}`);
			orders.push(o);
		}

		// Lance les 10 voidInvoice en parallèle
		const results = await Promise.all(
			orders.map((order) =>
				voidInvoice({
					orderId: order.id,
					authorId: null,
					authorName: "System",
					source: HistorySource.SYSTEM,
					reason: "Test concurrence",
				}),
			),
		);

		// Tous doivent avoir le kind voided
		const voided = results.filter(
			(r): r is Extract<typeof r, { kind: "voided" }> => r.kind === "voided",
		);
		expect(voided).toHaveLength(10);

		const creditNoteNumbers = voided.map((r) => r.creditNoteNumber);

		// 10 distincts
		expect(new Set(creditNoteNumbers).size).toBe(10);

		// Format A-YYYY-NNNNN
		const year = new Date().getFullYear();
		const regex = new RegExp(`^A-${year}-\\d{5}$`);
		expect(creditNoteNumbers.every((n) => regex.test(n))).toBe(true);

		// Gap-free
		const sequences = creditNoteNumbers
			.map((n) => parseInt(n.split("-")[2]!, 10))
			.sort((a, b) => a - b);
		const min = sequences[0]!;
		expect(sequences[sequences.length - 1]! - min).toBe(9);
		sequences.forEach((s, i) => expect(s).toBe(min + i));
	});

	it("idempotence — 2 voidInvoice concurrents sur le MÊME order → 1 avoir + 1 noop already-voided", async () => {
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);
		const order = await createPaidOrderWithInvoice(prisma, user.id, sku.id, `SAME-${Date.now()}`);

		const [result1, result2] = await Promise.all([
			voidInvoice({
				orderId: order.id,
				authorId: null,
				authorName: "System",
				source: HistorySource.SYSTEM,
				reason: "Test 1",
			}),
			voidInvoice({
				orderId: order.id,
				authorId: null,
				authorName: "System",
				source: HistorySource.SYSTEM,
				reason: "Test 2",
			}),
		]);

		// Exactement un voided + un noop (already-voided) — ordre non garanti
		const kinds = [result1.kind, result2.kind].sort();
		expect(kinds).toEqual(["noop", "voided"]);

		// L'Order ne doit avoir QU'UN SEUL creditNoteNumber
		const persisted = await prisma.order.findUniqueOrThrow({
			where: { id: order.id },
			select: { creditNoteNumber: true, invoiceStatus: true },
		});
		expect(persisted.invoiceStatus).toBe("VOIDED");
		expect(persisted.creditNoteNumber).toMatch(/^A-\d{4}-\d{5}$/);
	});

	it("OrderHistory contient 1 entry INVOICE_VOIDED par order voided", async () => {
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);

		const orders: Order[] = [];
		for (let i = 0; i < 5; i++) {
			orders.push(
				await createPaidOrderWithInvoice(prisma, user.id, sku.id, `HIST-${i}-${Date.now()}`),
			);
		}

		await Promise.all(
			orders.map((o) =>
				voidInvoice({
					orderId: o.id,
					authorId: null,
					authorName: "System",
					source: HistorySource.SYSTEM,
					reason: "Avoir test",
				}),
			),
		);

		const histories = await prisma.orderHistory.findMany({
			where: { orderId: { in: orders.map((o) => o.id) }, action: "INVOICE_VOIDED" },
		});

		expect(histories).toHaveLength(5);
	});

	it("voidInvoice + persistInvoiceNumber concurrents sur des orders distincts (advisory locks séparés)", async () => {
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);

		// 5 orders avec facture déjà persistée pour void + 5 orders sans facture pour persist
		const ordersForVoid: Order[] = [];
		for (let i = 0; i < 5; i++) {
			ordersForVoid.push(
				await createPaidOrderWithInvoice(prisma, user.id, sku.id, `MIX-V-${i}-${Date.now()}`),
			);
		}

		const ordersForPersist: Order[] = [];
		for (let i = 0; i < 5; i++) {
			const o = await prisma.order.create({
				data: {
					userId: user.id,
					orderNumber: `SYN-MIX-P-${i}-${Date.now()}`,
					customerEmail: "mix@test.local",
					customerName: "Mix Test",
					shippingFirstName: "X",
					shippingLastName: "Y",
					shippingAddress1: "1 r",
					shippingPostalCode: "75001",
					shippingCity: "Paris",
					shippingCountry: "FR",
					shippingPhone: "+33600000000",
					status: OrderStatus.PROCESSING,
					paymentStatus: PaymentStatus.PAID,
					paidAt: new Date(),
					stripePaymentIntentId: `pi_mix_p_${i}_${Date.now()}`,
					subtotal: 4999,
					total: 4999,
					currency: "EUR",
					paymentMethod: "CARD",
					invoiceStatus: "PENDING",
					items: {
						create: [
							{
								skuId: sku.id,
								quantity: 1,
								productTitle: "Test",
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
			ordersForPersist.push(o);
		}

		// Lance les 10 ops en parallèle (5 void + 5 persist)
		const [voidResults, persistResults] = await Promise.all([
			Promise.all(
				ordersForVoid.map((o) =>
					voidInvoice({
						orderId: o.id,
						authorId: null,
						authorName: "System",
						source: HistorySource.SYSTEM,
						reason: "test",
					}),
				),
			),
			Promise.all(ordersForPersist.map((o) => persistInvoiceNumber(o.id, user.id))),
		]);

		expect(voidResults.filter((r) => r.kind === "voided")).toHaveLength(5);
		expect(persistResults.filter((r) => r !== null)).toHaveLength(5);

		// Vérifie les numéros sont du bon format + distincts au sein de chaque type
		const creditNotes = voidResults
			.filter((r): r is Extract<typeof r, { kind: "voided" }> => r.kind === "voided")
			.map((r) => r.creditNoteNumber);
		const invoices = persistResults.filter((r) => r !== null).map((r) => r!.invoiceNumber);

		expect(new Set(creditNotes).size).toBe(5);
		expect(new Set(invoices).size).toBe(5);
		expect(creditNotes.every((c) => /^A-\d{4}-\d{5}$/.test(c))).toBe(true);
		expect(invoices.every((i) => /^F-\d{4}-\d{5}$/.test(i))).toBe(true);
	});
});
