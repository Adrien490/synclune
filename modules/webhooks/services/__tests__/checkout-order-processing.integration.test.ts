/**
 * Integration test — le décrément de stock réel, sur DB réelle.
 *
 * @regression stock-decrement-concurrency
 *
 * Pourquoi ce fichier existe : `processOrderAtomically` est **le seul écrivain de
 * `ProductSku.inventory` sur le chemin client**. Toute la protection anti-survente y
 * repose sur trois mécanismes que les tests unitaires ne peuvent PAS valider, parce
 * qu'ils remplacent `$transaction` / `$queryRaw` par des mocks :
 *
 *  1. le `SELECT … FOR UPDATE` de re-validation (verrou de ligne réel) ;
 *  2. la sérialisation de deux webhooks concurrents sur le dernier exemplaire ;
 *  3. le `CHECK ProductSku_inventory_non_negative`, appliqué par le setup
 *     d'intégration mais qui n'était **asserté par aucun test** du repo.
 *
 * Avant ce fichier, l'unique test d'intégration « concurrence stock » du repo
 * (`modules/cart/services/__tests__/add-to-cart.integration.test.ts`) réimplémentait
 * dans le test un `FOR UPDATE` + `decrement` qui n'existe nulle part en production —
 * il restait donc vert quoi qu'il arrive au vrai chemin. Audit « validation stock
 * panier » 2026-07-30, P2-2/P2-3.
 *
 * Pré-requis : `INTEGRATION_DATABASE_URL` (cf `test/integration/setup.ts`).
 * Skippé silencieusement sans elle ; le job CI `tests-integration` l'exécute.
 *
 * NOTE : `processOrderFromPaymentIntent` lit le client `@/shared/lib/prisma` au
 * module-load. On l'importe DYNAMIQUEMENT après `getIntegrationPrismaClient()` (qui
 * pose `process.env.DATABASE_URL` sur le schéma worker) pour que le client de
 * production tape sur la base d'intégration — même contrainte que
 * `order-creation.service.integration.test.ts`.
 */
import { describe, it, expect, beforeAll } from "vitest";
import type Stripe from "stripe";
import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";
import { createTestProduct, createTestSku } from "@/test/integration/factories";
import type {
	processOrderFromPaymentIntent as ProcessOrderFn,
	OversellError as OversellErrorClass,
} from "@/modules/webhooks/services/checkout-order-processing.service";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

let counter = 0;
const uniq = () => `${++counter}`;

/** PaymentIntent minimal — seuls ces champs sont lus par le service. */
function fakePaymentIntent(id: string, amountReceived: number): Stripe.PaymentIntent {
	return {
		id,
		amount_received: amountReceived,
		currency: "eur",
		customer: null,
		metadata: {},
	} as unknown as Stripe.PaymentIntent;
}

describeIntegration("processOrderFromPaymentIntent — décrément de stock (DB réelle)", () => {
	let prisma: ReturnType<typeof getIntegrationPrismaClient>;
	let processOrder: typeof ProcessOrderFn;
	let OversellError: typeof OversellErrorClass;

	beforeAll(async () => {
		prisma = getIntegrationPrismaClient();
		const mod = await import("@/modules/webhooks/services/checkout-order-processing.service");
		processOrder = mod.processOrderFromPaymentIntent;
		OversellError = mod.OversellError;
	});

	/** Crée une commande PENDING prête à être encaissée, avec son OrderItem. */
	async function seedPendingOrder(skuId: string, quantity: number, unitPrice: number) {
		const total = unitPrice * quantity;
		return prisma.order.create({
			data: {
				orderNumber: `SYN-TEST-${uniq()}`,
				status: "PENDING",
				paymentStatus: "PENDING",
				subtotal: total,
				discountAmount: 0,
				shippingCost: 0,
				taxAmount: 0,
				total,
				currency: "eur",
				// Snapshots figés au checkout, tous NOT NULL au schéma (invariant 5).
				customerEmail: "client@example.com",
				customerName: "Marie Dupont",
				shippingFirstName: "Marie",
				shippingLastName: "Dupont",
				shippingAddress1: "1 rue des Lilas",
				shippingPostalCode: "75001",
				shippingCity: "Paris",
				shippingPhone: "+33600000000",
				items: {
					create: {
						skuId,
						quantity,
						price: unitPrice,
						productTitle: "Bague Test",
					},
				},
			},
			select: { id: true },
		});
	}

	it("décrémente réellement le stock et passe la commande PAID", async () => {
		const product = await createTestProduct();
		const sku = await createTestSku(product.id, { inventory: 5 });
		const order = await seedPendingOrder(sku.id, 2, sku.priceInclTax);

		await processOrder(order.id, fakePaymentIntent(`pi_${uniq()}`, sku.priceInclTax * 2));

		const fresh = await prisma.productSku.findUnique({ where: { id: sku.id } });
		expect(fresh?.inventory).toBe(3);

		const updated = await prisma.order.findUnique({
			where: { id: order.id },
			select: { paymentStatus: true },
		});
		expect(updated?.paymentStatus).toBe("PAID");
	});

	// Le cœur du sujet : deux webhooks concurrents sur le DERNIER exemplaire.
	// Le `FOR UPDATE` doit sérialiser ; le perdant doit lever `OversellError`
	// AVANT tout décrément, et l'inventaire finir à 0 — jamais à -1.
	it("sérialise deux encaissements concurrents sur le dernier exemplaire", async () => {
		const product = await createTestProduct();
		const sku = await createTestSku(product.id, { inventory: 1 });
		const orderA = await seedPendingOrder(sku.id, 1, sku.priceInclTax);
		const orderB = await seedPendingOrder(sku.id, 1, sku.priceInclTax);

		const results = await Promise.allSettled([
			processOrder(orderA.id, fakePaymentIntent(`pi_${uniq()}`, sku.priceInclTax)),
			processOrder(orderB.id, fakePaymentIntent(`pi_${uniq()}`, sku.priceInclTax)),
		]);

		const fulfilled = results.filter((r) => r.status === "fulfilled");
		const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

		// Exactement un gagnant, exactement un perdant.
		expect(fulfilled).toHaveLength(1);
		expect(rejected).toHaveLength(1);
		// …et le perdant est typé, pour que `handleOversell` puisse le rembourser
		// (ORD-STRIPE-009). Un échec générique partirait en retry Stripe infini.
		expect(rejected[0]!.reason).toBeInstanceOf(OversellError);

		// L'invariant : une seule unité vendue, jamais de stock négatif.
		const fresh = await prisma.productSku.findUnique({ where: { id: sku.id } });
		expect(fresh?.inventory).toBe(0);
	});

	it("refuse un encaissement dont la quantité dépasse le stock (OversellError)", async () => {
		const product = await createTestProduct();
		const sku = await createTestSku(product.id, { inventory: 1 });
		const order = await seedPendingOrder(sku.id, 3, sku.priceInclTax);

		await expect(
			processOrder(order.id, fakePaymentIntent(`pi_${uniq()}`, sku.priceInclTax * 3)),
		).rejects.toBeInstanceOf(OversellError);

		// Rien n'a bougé : le throw précède le décrément.
		const fresh = await prisma.productSku.findUnique({ where: { id: sku.id } });
		expect(fresh?.inventory).toBe(1);
	});

	// Le CHECK est la dernière ligne de défense, jamais atteinte par le chemin
	// applicatif (la re-validation throw avant). On l'exerce ici en direct : sans
	// cette assertion, rien dans le repo ne prouvait qu'il est réellement appliqué
	// à la base — `db push` ne rejoue pas les migrations, et le fichier de gardes
	// brutes pourrait cesser d'être appliqué sans que personne ne le remarque.
	it("le CHECK inventory_non_negative interdit un stock négatif", async () => {
		const product = await createTestProduct();
		const sku = await createTestSku(product.id, { inventory: 1 });

		await expect(
			prisma.productSku.update({
				where: { id: sku.id },
				data: { inventory: { decrement: 2 } },
			}),
		).rejects.toThrow();

		const fresh = await prisma.productSku.findUnique({ where: { id: sku.id } });
		expect(fresh?.inventory).toBe(1);
	});
});
