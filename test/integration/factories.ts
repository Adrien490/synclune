/**
 * Factories pour les integration tests : créent rapidement des entités DB
 * cohérentes pour les flows critical path (cart, orders, refunds).
 *
 * Toutes les factories acceptent des overrides partiels et retournent
 * l'entité créée avec son id. Utilisent `getIntegrationPrismaClient()`
 * pour garantir qu'on cible la DB d'intégration.
 */
import { getIntegrationPrismaClient } from "./prisma-client";
import {
	OrderStatus,
	PaymentStatus,
	PublicationStatus,
	type Order,
	type Prisma,
	type Product,
	type ProductSku,
	type User,
} from "@/app/generated/prisma/client";

let counter = 0;
const uniq = () => `${Date.now()}-${++counter}`;

export async function createTestUser(overrides: Partial<User> = {}): Promise<User> {
	const prisma = getIntegrationPrismaClient();
	const id = `user_${uniq()}`;
	return prisma.user.create({
		data: {
			id,
			email: `${id}@test.local`,
			emailVerified: true,
			name: "Test User",
			role: "USER",
			createdAt: new Date(),
			updatedAt: new Date(),
			...overrides,
		},
	});
}

export async function createTestProduct(overrides: Partial<Product> = {}): Promise<Product> {
	const prisma = getIntegrationPrismaClient();
	const slug = `product-${uniq()}`;
	return prisma.product.create({
		data: {
			slug,
			title: `Test Product ${slug}`,
			description: "Integration test product",
			status: PublicationStatus.PUBLIC,
			...overrides,
		},
	});
}

export async function createTestSku(
	productId: string,
	overrides: Partial<ProductSku> = {},
): Promise<ProductSku> {
	const prisma = getIntegrationPrismaClient();
	return prisma.productSku.create({
		data: {
			sku: `SKU-${uniq()}`,
			productId,
			priceInclTax: 5_000, // 50€
			compareAtPrice: null,
			inventory: 10,
			isActive: true,
			...overrides,
		},
	});
}

/** Une ligne de commande — seul `skuId` est obligatoire. */
export interface TestOrderItemInput {
	skuId: string;
	quantity?: number;
	/** Prix TTC unitaire figé au snapshot. Défaut : 4999. */
	price?: number;
	productTitle?: string;
	productImageUrl?: string | null;
	skuColor?: string | null;
	skuMaterial?: string | null;
	skuSize?: string | null;
}

export type TestOrderOverrides = Partial<Omit<Prisma.OrderUncheckedCreateInput, "items">>;

const DEFAULT_ITEM_PRICE = 4_999;

/**
 * Crée une commande + ses lignes, conformes au schéma ET aux CHECK bruts.
 *
 * ## Pourquoi cette factory existe
 *
 * Douze suites `*.integration.test.ts` recopiaient chacune leur propre fixture
 * `prisma.order.create`. Quand l'audit de schéma a droppé `Order.userId`,
 * `Order.discountAmount`, `Order.taxAmount`, `Order.currency` et les cinq colonnes
 * fiscales d'`OrderItem` (2026-08-04 → 08-05), **aucune** n'a suivi : les douze
 * levaient `PrismaClientValidationError` dès la fixture, donc toute la preuve de
 * concurrence du dépôt (FOR UPDATE anti-survente, numérotation gap-free Art. 286
 * CGI, trigger d'unicité cross-table des avoirs) était morte.
 *
 * Rien ne l'a vu : `tsc` passe (le `SelectSubset` de Prisma type `data` depuis
 * l'argument lui-même, les clés excédentaires imbriquées échappent au contrôle),
 * le contract test `transactional-writes-schema-validity` excluait `__tests__`, et
 * le job CI mourait avant sur `prisma generate`. Une SSOT rend la prochaine
 * migration mécanique : un seul site à corriger.
 *
 * ## Les trois CHECK qu'elle satisfait par construction
 *
 * - `Order_total_formula` : `total = GREATEST(0, subtotal + shippingCost)` — les
 *   deux montants sont dérivés des lignes, pas saisis à la main.
 * - `Order_paid_requires_paidAt` et `Order_paid_requires_stripe_proof` : demander
 *   `paymentStatus: PAID` remplit `paidAt` et `stripePaymentIntentId` d'office.
 *   Un test qui veut EXERCER la violation passe explicitement `null` — la clé
 *   présente dans `overrides` gagne toujours, y compris à `null`.
 */
export async function createTestOrder(
	items: TestOrderItemInput[],
	overrides: TestOrderOverrides = {},
): Promise<Order> {
	const prisma = getIntegrationPrismaClient();
	const suffix = uniq();

	const lines = items.map((item) => ({
		skuId: item.skuId,
		quantity: item.quantity ?? 1,
		price: item.price ?? DEFAULT_ITEM_PRICE,
		productTitle: item.productTitle ?? "Bijou Test",
		productImageUrl: item.productImageUrl ?? null,
		skuColor: item.skuColor ?? null,
		skuMaterial: item.skuMaterial ?? null,
		skuSize: item.skuSize ?? null,
	}));

	// Les trois montants sont posés APRÈS le spread d'overrides (cf. `data` plus bas) :
	// surcharger `subtotal` seul doit continuer de produire un `total` cohérent, sinon
	// la factory fabriquerait elle-même la violation de `Order_total_formula` qu'un
	// appelant n'a pas demandée. Forcer l'incohérence reste possible — en passant
	// `total` explicitement.
	const subtotal = overrides.subtotal ?? lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
	const shippingCost = overrides.shippingCost ?? 0;
	const total = overrides.total ?? subtotal + shippingCost;
	const isPaid = (overrides.paymentStatus ?? PaymentStatus.PENDING) === PaymentStatus.PAID;

	// `"key" in overrides` et non `??` : un test qui veut prouver qu'un CHECK
	// rejette bien l'état incohérent doit pouvoir imposer `null`.
	const paidDefaults = isPaid
		? {
				...("paidAt" in overrides ? {} : { paidAt: new Date() }),
				...("stripePaymentIntentId" in overrides
					? {}
					: { stripePaymentIntentId: `pi_test_${suffix}` }),
			}
		: {};

	return prisma.order.create({
		data: {
			orderNumber: `CMD-TEST-${suffix}`,
			customerEmail: "cliente@test.local",
			customerName: "Marie Dupont",
			shippingFirstName: "Marie",
			shippingLastName: "Dupont",
			shippingAddress1: "1 rue des Lilas",
			shippingPostalCode: "75001",
			shippingCity: "Paris",
			shippingCountry: "FR",
			shippingPhone: "+33600000000",
			status: OrderStatus.PENDING,
			paymentStatus: PaymentStatus.PENDING,
			...paidDefaults,
			...overrides,
			subtotal,
			shippingCost,
			total,
			items: { create: lines },
		},
	});
}
