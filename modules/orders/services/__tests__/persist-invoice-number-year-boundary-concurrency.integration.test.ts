/**
 * @regression persist-invoice-number-year-boundary-concurrency
 *
 * EINV-TEST-002 — Concurrence DB réelle de `persistInvoiceNumber()` À LA FRONTIÈRE
 * D'ANNÉE (31/12 23:59 → 01/01).
 *
 * Garantie Art. 286 CGI : l'advisory lock est keyé par année
 * (`pg_advisory_xact_lock(1_000_000 + year)`) et l'année est dérivée de `paidAt`
 * en Europe/Paris (EINV-SEQ-002). Deux cohortes de transactions concurrentes dont
 * les `paidAt` tombent dans des années adjacentes (2026 vs 2027) :
 *   - prennent des locks DIFFÉRENTS (1_002_026 vs 1_002_027) ;
 *   - écrivent dans des espaces de séquence DISJOINTS (`F-2026-*` vs `F-2027-*`).
 * Résultat attendu : AUCUN gap ni collision, chaque année reste séquentielle
 * gap-free indépendamment de l'entrelacement.
 *
 * Sans la dérivation par `paidAt` (ex: `new Date().getFullYear()`), une génération
 * tardive franchissant minuit attribuerait le mauvais millésime → trou ou doublon.
 *
 * Pré-requis : INTEGRATION_DATABASE_URL pointant sur Postgres dédié. Skip silencieux
 * sinon. Cf test/integration/setup.ts. Import du client via
 * `@/test/integration/prisma-client` UNIQUEMENT (jamais `@/shared/lib/prisma`).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";
import { createTestUser, createTestProduct, createTestSku } from "@/test/integration/factories";
import { persistInvoiceNumber } from "../persist-invoice-number.service";
import { OrderStatus, PaymentStatus, type Order } from "@/app/generated/prisma/client";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

// Europe/Paris en hiver = UTC+1 → ces instants UTC tombent sans ambiguïté dans
// l'année voulue côté Paris (23:30 le 31/12/2026 ; 01:30 le 01/01/2027).
const PAID_AT_2026 = new Date("2026-12-31T22:30:00.000Z");
const PAID_AT_2027 = new Date("2027-01-01T00:30:00.000Z");

async function createPaidOrder(
	prisma: ReturnType<typeof getIntegrationPrismaClient>,
	userId: string,
	skuId: string,
	suffix: string,
	paidAt: Date,
): Promise<Order> {
	return prisma.order.create({
		data: {
			userId,
			orderNumber: `SYN-YB-${suffix}`,
			customerEmail: "yearboundary@test.local",
			customerName: "Test YearBoundary",
			customerType: "B2C",
			shippingFirstName: "Test",
			shippingLastName: "YearBoundary",
			shippingAddress1: "1 rue test",
			shippingPostalCode: "75001",
			shippingCity: "Paris",
			shippingCountry: "FR",
			shippingPhone: "+33600000000",
			status: OrderStatus.PROCESSING,
			paymentStatus: PaymentStatus.PAID,
			paidAt,
			stripePaymentIntentId: `pi_yb_${suffix}`,
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

/** Extrait la suite triée des numéros de séquence d'un préfixe F-YYYY-. */
function sortedSequencesFor(prefix: string, invoiceNumbers: string[]): number[] {
	return invoiceNumbers
		.filter((n) => n.startsWith(prefix))
		.map((n) => parseInt(n.slice(prefix.length), 10))
		.sort((a, b) => a - b);
}

/** Asserte que `seqs` forme une suite contiguë gap-free de longueur `expectedLen`. */
function expectContiguous(seqs: number[], expectedLen: number): void {
	expect(seqs).toHaveLength(expectedLen);
	const min = seqs[0]!;
	const max = seqs[seqs.length - 1]!;
	expect(max - min).toBe(expectedLen - 1);
	seqs.forEach((seq, i) => {
		expect(seq).toBe(min + i);
	});
	// Pas de doublon (Set même cardinalité).
	expect(new Set(seqs).size).toBe(expectedLen);
}

describeIntegration(
	"persistInvoiceNumber — concurrence à la frontière d'année (EINV-TEST-002)",
	() => {
		let prisma: ReturnType<typeof getIntegrationPrismaClient>;

		beforeEach(async () => {
			prisma = getIntegrationPrismaClient();
		});

		it("10 tx concurrentes mêlant paidAt 2026 et 2027 → 2 séquences disjointes gap-free, 0 collision", async () => {
			const user = await createTestUser();
			const product = await createTestProduct();
			const sku = await createTestSku(product.id);

			const COUNT_PER_YEAR = 5;
			const orders2026: Order[] = [];
			const orders2027: Order[] = [];
			const runId = Date.now();
			for (let i = 0; i < COUNT_PER_YEAR; i++) {
				const tag = `${i}-${runId}`;
				orders2026.push(await createPaidOrder(prisma, user.id, sku.id, `26-${tag}`, PAID_AT_2026));
				orders2027.push(await createPaidOrder(prisma, user.id, sku.id, `27-${tag}`, PAID_AT_2027));
			}

			// Entrelace les deux cohortes et lance TOUT en parallèle : les tx 2026
			// (lock 1_002_026) et 2027 (lock 1_002_027) franchissent la frontière
			// simultanément. Aucune ne doit interférer avec l'autre.
			const interleaved = [...orders2026, ...orders2027].sort((a, b) =>
				a.orderNumber.localeCompare(b.orderNumber),
			);
			const results = await Promise.all(
				interleaved.map((order) => persistInvoiceNumber(order.id, user.id)),
			);

			expect(results.every((r) => r !== null)).toBe(true);
			const invoiceNumbers = results.map((r) => r!.invoiceNumber);

			// Chaque numéro respecte le millésime dérivé de SON paidAt (pas du wall-clock).
			expect(invoiceNumbers.filter((n) => n.startsWith("F-2026-"))).toHaveLength(COUNT_PER_YEAR);
			expect(invoiceNumbers.filter((n) => n.startsWith("F-2027-"))).toHaveLength(COUNT_PER_YEAR);

			// Aucun chevauchement cross-année + chaque année gap-free.
			expectContiguous(sortedSequencesFor("F-2026-", invoiceNumbers), COUNT_PER_YEAR);
			expectContiguous(sortedSequencesFor("F-2027-", invoiceNumbers), COUNT_PER_YEAR);

			// Tous les numéros sont globalement distincts (pas de collision cross-année).
			expect(new Set(invoiceNumbers).size).toBe(COUNT_PER_YEAR * 2);

			// Vérification persistée : chaque order porte le millésime de son paidAt.
			const persisted2026 = await prisma.order.findMany({
				where: { id: { in: orders2026.map((o) => o.id) } },
				select: { invoiceNumber: true, invoiceStatus: true },
			});
			expect(persisted2026.every((o) => o.invoiceNumber?.startsWith("F-2026-"))).toBe(true);
			expect(persisted2026.every((o) => o.invoiceStatus === "GENERATED")).toBe(true);

			const persisted2027 = await prisma.order.findMany({
				where: { id: { in: orders2027.map((o) => o.id) } },
				select: { invoiceNumber: true, invoiceStatus: true },
			});
			expect(persisted2027.every((o) => o.invoiceNumber?.startsWith("F-2027-"))).toBe(true);
			expect(persisted2027.every((o) => o.invoiceStatus === "GENERATED")).toBe(true);
		});
	},
);
