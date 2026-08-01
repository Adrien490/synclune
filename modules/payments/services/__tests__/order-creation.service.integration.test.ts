/**
 * Integration test — `createOrderInTransaction` sur DB réelle.
 *
 * @regression create-order-discount-atomicity
 *
 * Garde-fou : la création de commande (chemin de capture du paiement) exécute
 * deux verrous `SELECT ... FOR UPDATE` que le unit test
 * (`order-creation.service.test.ts`) ne peut PAS valider — il remplace
 * `$transaction`/`$queryRaw` par des mocks (cf règle CLAUDE.md : pas de mock DB
 * sur les flows transactionnels orders/payments). On les exerce ici contre un
 * vrai Postgres :
 *
 *  1. **Discount atomique** — `UPDATE "Discount" SET usageCount = usageCount + 1
 *     WHERE usageCount < maxUsageCount` (+ FOR UPDATE de la ligne). Deux commandes
 *     concurrentes consommant le dernier usage d'un code `maxUsageCount=1` :
 *     exactement UNE réussit, l'autre est rejetée, `usageCount` final = 1.
 *  2. **Réservation stock optimiste (by-design)** — le stock est VÉRIFIÉ
 *     (FOR UPDATE) mais PAS décrémenté ici (le décrément a lieu dans le webhook).
 *     Deux commandes concurrentes pour `inventory=1` réussissent TOUTES LES DEUX
 *     (le perdant est rejeté en aval au webhook + auto-refund ORD-STRIPE-009).
 *     Ce test verrouille ce comportement documenté pour qu'il ne soit pas « corrigé »
 *     par erreur ici.
 *  3. **Garde stock fonctionnelle** — quantity > inventory ⇒ BusinessError, prouvant
 *     que le SQL FOR UPDATE s'exécute réellement contre la DB.
 *  4. **Rollback tout-ou-rien** — un échec en cours de transaction (stock insuffisant
 *     sur le 2ᵉ item, ou violation FK APRÈS l'incrément raw SQL du usageCount) ne
 *     laisse AUCUN résidu : ni Order, ni OrderItem, ni DiscountUsage, usageCount
 *     inchangé (audit création-de-commande 2026-07-02).
 *
 * Pré-requis : `INTEGRATION_DATABASE_URL` (cf `test/integration/setup.ts`).
 * Skippé silencieusement si la variable est absente.
 *
 * NOTE : `createOrderInTransaction` importe le client `@/shared/lib/prisma`
 * (lu au module-load). On l'importe DYNAMIQUEMENT après
 * `getIntegrationPrismaClient()` (qui pose `process.env.DATABASE_URL` sur le
 * schéma worker) pour que le client de prod tape sur la DB d'intégration.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { DiscountType } from "@/app/generated/prisma/client";
import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";
import { createTestProduct, createTestSku } from "@/test/integration/factories";
import type { SkuDetailsResult } from "@/modules/cart/types/sku-validation.types";
import type {
	CreateOrderParams,
	createOrderInTransaction as CreateOrderFn,
} from "@/modules/payments/services/order-creation.service";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

let counter = 0;
const uniq = () => `${++counter}`;

function buildSkuDetails(sku: {
	id: string;
	sku: string;
	priceInclTax: number;
	compareAtPrice: number | null;
	product: { id: string; title: string; slug: string };
}): SkuDetailsResult {
	return {
		success: true,
		data: {
			sku: {
				id: sku.id,
				sku: sku.sku,
				priceInclTax: sku.priceInclTax,
				compareAtPrice: sku.compareAtPrice,
				isActive: true,
				colors: [],
				images: [],
				product: {
					id: sku.product.id,
					title: sku.product.title,
					slug: sku.product.slug,
					description: null,
				},
			},
		},
	};
}

function buildParams(
	overrides: Partial<CreateOrderParams> & {
		skuId: string;
		skuDetails: SkuDetailsResult;
		priceInclTax: number;
	},
): CreateOrderParams {
	const { skuId, skuDetails, priceInclTax, ...rest } = overrides;
	const quantity = rest.cartItems?.[0]?.quantity ?? 1;
	return {
		cartItems: [{ skuId, quantity }],
		skuDetailsResults: [skuDetails],
		subtotal: priceInclTax * quantity,
		shippingAddress: {
			addressLine1: "1 rue de Test",
			postalCode: "75001",
			city: "Paris",
			country: "FR",
		},
		firstName: "Marie",
		lastName: "Dupont",
		userId: null,
		finalEmail: `buyer-${uniq()}@test.local`,
		// Invariant #8 : provenance Stripe obligatoire dès la création. Unique par
		// commande — `Order.stripePaymentIntentId` porte une contrainte UNIQUE, et
		// deux commandes du même test se marcheraient dessus en P2002.
		paymentIntentId: `pi_int_${uniq()}`,
		...rest,
	};
}

describeIntegration("createOrderInTransaction — real DB lock semantics", () => {
	let prisma: ReturnType<typeof getIntegrationPrismaClient>;
	let createOrderInTransaction: typeof CreateOrderFn;

	beforeAll(async () => {
		// Pose process.env.DATABASE_URL sur le schéma worker AVANT d'importer le
		// service (dont le client @/shared/lib/prisma lit l'URL au module-load).
		prisma = getIntegrationPrismaClient();
		({ createOrderInTransaction } =
			await import("@/modules/payments/services/order-creation.service"));
	});

	it("applies a maxUsageCount=1 discount exactly once under 2 concurrent orders", async () => {
		const product = await createTestProduct();
		const sku = await createTestSku(product.id, { inventory: 100, priceInclTax: 5_000 });
		const code = `ATOMIC${uniq()}`;
		await prisma.discount.create({
			data: {
				code,
				type: DiscountType.FIXED_AMOUNT,
				value: 500, // 5€
				maxUsageCount: 1,
				usageCount: 0,
				isActive: true,
				startsAt: new Date("2020-01-01T00:00:00Z"),
			},
		});

		const skuDetails = buildSkuDetails({
			id: sku.id,
			sku: sku.sku,
			priceInclTax: sku.priceInclTax,
			compareAtPrice: sku.compareAtPrice,
			product: { id: product.id, title: product.title, slug: product.slug },
		});

		const mkParams = () =>
			buildParams({
				skuId: sku.id,
				skuDetails,
				priceInclTax: sku.priceInclTax,
				discountCode: code,
			});

		const results = await Promise.allSettled([
			createOrderInTransaction(mkParams()),
			createOrderInTransaction(mkParams()),
		]);

		const fulfilled = results.filter((r) => r.status === "fulfilled");
		const rejected = results.filter((r) => r.status === "rejected");

		// Exactement 1 succès, 1 rejet : le code promo n'est pas sur-consommé.
		expect(fulfilled).toHaveLength(1);
		expect(rejected).toHaveLength(1);

		const discount = await prisma.discount.findUnique({ where: { code } });
		expect(discount?.usageCount).toBe(1);

		const usages = await prisma.discountUsage.count({ where: { discountCode: code } });
		expect(usages).toBe(1);
	});

	it("documents optimistic stock reservation: 2 concurrent orders for inventory=1 BOTH succeed (decrement happens at webhook)", async () => {
		const product = await createTestProduct();
		const sku = await createTestSku(product.id, { inventory: 1, priceInclTax: 5_000 });

		const skuDetails = buildSkuDetails({
			id: sku.id,
			sku: sku.sku,
			priceInclTax: sku.priceInclTax,
			compareAtPrice: sku.compareAtPrice,
			product: { id: product.id, title: product.title, slug: product.slug },
		});

		const mkParams = () =>
			buildParams({ skuId: sku.id, skuDetails, priceInclTax: sku.priceInclTax });

		const results = await Promise.allSettled([
			createOrderInTransaction(mkParams()),
			createOrderInTransaction(mkParams()),
		]);

		// Réservation optimiste : les deux passent la VÉRIFICATION (pas de décrément ici).
		expect(results.every((r) => r.status === "fulfilled")).toBe(true);

		const orders = await prisma.order.count({ where: { customerName: "Marie Dupont" } });
		expect(orders).toBe(2);

		// Le stock n'est PAS décrémenté à ce stade (le webhook le fera, et y rejettera le perdant).
		const fresh = await prisma.productSku.findUnique({ where: { id: sku.id } });
		expect(fresh?.inventory).toBe(1);
	});

	it("rejects with BusinessError when requested quantity exceeds inventory (real FOR UPDATE read)", async () => {
		const product = await createTestProduct();
		const sku = await createTestSku(product.id, { inventory: 1, priceInclTax: 5_000 });

		const skuDetails = buildSkuDetails({
			id: sku.id,
			sku: sku.sku,
			priceInclTax: sku.priceInclTax,
			compareAtPrice: sku.compareAtPrice,
			product: { id: product.id, title: product.title, slug: product.slug },
		});

		await expect(
			createOrderInTransaction(
				buildParams({
					skuId: sku.id,
					skuDetails,
					priceInclTax: sku.priceInclTax,
					cartItems: [{ skuId: sku.id, quantity: 2 }],
				}),
			),
		).rejects.toThrow(/insuffisant/i);
	});

	it("rolls back everything (order, items, discount usage) when a later stock check fails mid-transaction", async () => {
		const product = await createTestProduct();
		const skuOk = await createTestSku(product.id, { inventory: 10, priceInclTax: 3_000 });
		const skuLow = await createTestSku(product.id, { inventory: 1, priceInclTax: 2_000 });
		const code = `RLBK${uniq()}`;
		await prisma.discount.create({
			data: {
				code,
				type: DiscountType.FIXED_AMOUNT,
				value: 500,
				usageCount: 0,
				isActive: true,
				startsAt: new Date("2020-01-01T00:00:00Z"),
			},
		});
		const email = `rollback-${uniq()}@test.local`;

		const detailsOk = buildSkuDetails({
			id: skuOk.id,
			sku: skuOk.sku,
			priceInclTax: skuOk.priceInclTax,
			compareAtPrice: skuOk.compareAtPrice,
			product: { id: product.id, title: product.title, slug: product.slug },
		});
		const detailsLow = buildSkuDetails({
			id: skuLow.id,
			sku: skuLow.sku,
			priceInclTax: skuLow.priceInclTax,
			compareAtPrice: skuLow.compareAtPrice,
			product: { id: product.id, title: product.title, slug: product.slug },
		});

		await expect(
			createOrderInTransaction(
				buildParams({
					skuId: skuOk.id,
					skuDetails: detailsOk,
					priceInclTax: skuOk.priceInclTax,
					cartItems: [
						{ skuId: skuOk.id, quantity: 1 },
						{ skuId: skuLow.id, quantity: 5 }, // > inventory=1 → BusinessError en cours de tx
					],
					skuDetailsResults: [detailsOk, detailsLow],
					subtotal: 1 * 3_000 + 5 * 2_000,
					discountCode: code,
					finalEmail: email,
				}),
			),
		).rejects.toThrow(/insuffisant/i);

		// Tout-ou-rien : aucun résidu en DB.
		expect(await prisma.order.count({ where: { customerEmail: email } })).toBe(0);
		expect(await prisma.discountUsage.count({ where: { discountCode: code } })).toBe(0);
		const discount = await prisma.discount.findUnique({ where: { code } });
		expect(discount?.usageCount).toBe(0);
	});

	it("rolls back the raw-SQL usageCount increment when a write fails AFTER it (FK violation on order item snapshot)", async () => {
		const product = await createTestProduct();
		const sku = await createTestSku(product.id, { inventory: 10, priceInclTax: 5_000 });
		const code = `RLBKFK${uniq()}`;
		await prisma.discount.create({
			data: {
				code,
				type: DiscountType.FIXED_AMOUNT,
				value: 500,
				usageCount: 0,
				isActive: true,
				startsAt: new Date("2020-01-01T00:00:00Z"),
			},
		});
		const email = `rollback-fk-${uniq()}@test.local`;

		// productId inexistant dans le snapshot : le check stock passe (raw SQL par
		// skuId + JOIN sur le VRAI productId), l'incrément usageCount passe, puis
		// orderItem.create viole la FK productId → rollback INTÉGRAL de la tx,
		// y compris l'UPDATE raw SQL du usageCount.
		const poisonedDetails = buildSkuDetails({
			id: sku.id,
			sku: sku.sku,
			priceInclTax: sku.priceInclTax,
			compareAtPrice: sku.compareAtPrice,
			product: { id: "prod_missing_fk", title: product.title, slug: product.slug },
		});

		await expect(
			createOrderInTransaction(
				buildParams({
					skuId: sku.id,
					skuDetails: poisonedDetails,
					priceInclTax: sku.priceInclTax,
					discountCode: code,
					finalEmail: email,
				}),
			),
		).rejects.toThrow();

		// L'incrément raw SQL est bien annulé avec le reste.
		const discount = await prisma.discount.findUnique({ where: { code } });
		expect(discount?.usageCount).toBe(0);
		expect(await prisma.discountUsage.count({ where: { discountCode: code } })).toBe(0);
		expect(await prisma.order.count({ where: { customerEmail: email } })).toBe(0);
	});
});
