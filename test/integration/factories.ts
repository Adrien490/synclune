/**
 * Factories pour les integration tests : créent rapidement des entités DB
 * cohérentes pour les flows critical path (cart, orders).
 *
 * Toutes les factories acceptent des overrides partiels et retournent
 * l'entité créée avec son id. Utilisent `getIntegrationPrismaClient()`
 * pour garantir qu'on cible la DB d'intégration.
 *
 * Schéma lean (migration lot 2) : plus de User/PaymentStatus/PublicationStatus,
 * Order = { stripeSessionId, email, amount*Cents, status }, OrderItem =
 * snapshots { nameSnapshot, variantSnapshot, unitPriceCents }.
 */
import { getIntegrationPrismaClient } from "./prisma-client";
import {
	OrderStatus,
	type Order,
	type Prisma,
	type Product,
	type ProductVariant,
} from "@/app/generated/prisma/client";

let counter = 0;
const uniq = () => `${Date.now()}-${++counter}`;

export async function createTestProduct(overrides: Partial<Product> = {}): Promise<Product> {
	const prisma = getIntegrationPrismaClient();
	const slug = `product-${uniq()}`;
	return prisma.product.create({
		data: {
			slug,
			name: `Test Product ${slug}`,
			description: "Integration test product",
			priceCents: 5_000,
			active: true,
			...overrides,
		},
	});
}

/** @public Réserve des suites d'intégration (lot 7+) — exempté du rapport knip. */
export async function createTestVariant(
	productId: string,
	overrides: Partial<ProductVariant> = {},
): Promise<ProductVariant> {
	const prisma = getIntegrationPrismaClient();
	return prisma.productVariant.create({
		data: {
			productId,
			// null = hérite du prix produit ; les tests qui veulent un override le passent
			priceCents: null,
			stock: 10,
			active: true,
			size: `T-${uniq()}`,
			...overrides,
		},
	});
}

/** @public Une ligne de commande — seul `variantId` est obligatoire. Réserve des suites d'intégration (lot 7+). */
export interface TestOrderItemInput {
	variantId: string;
	productId?: string | null;
	quantity?: number;
	/** Prix TTC unitaire figé au snapshot. Défaut : 4999. */
	unitPriceCents?: number;
	nameSnapshot?: string;
	variantSnapshot?: string | null;
}

/** @public Réserve des suites d'intégration (lot 7+). */
export type TestOrderOverrides = Partial<Omit<Prisma.OrderUncheckedCreateInput, "items">>;

const DEFAULT_ITEM_PRICE = 4_999;

/**
 * Crée une commande + ses lignes, conformes au schéma lean.
 *
 * Les montants sont dérivés des lignes (surcharger `amountItemsCents` seul
 * garde un `amountTotalCents` cohérent) ; un test peut forcer l'incohérence
 * en passant `amountTotalCents` explicitement.
 */
/** @public Réserve des suites d'intégration (lot 7+) — exempté du rapport knip. */
export async function createTestOrder(
	items: TestOrderItemInput[],
	overrides: TestOrderOverrides = {},
): Promise<Order> {
	const prisma = getIntegrationPrismaClient();
	const suffix = uniq();

	const lines = items.map((item) => ({
		variantId: item.variantId,
		productId: item.productId ?? null,
		quantity: item.quantity ?? 1,
		unitPriceCents: item.unitPriceCents ?? DEFAULT_ITEM_PRICE,
		nameSnapshot: item.nameSnapshot ?? "Bijou Test",
		variantSnapshot: item.variantSnapshot ?? null,
	}));

	const amountItemsCents =
		overrides.amountItemsCents ?? lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
	const amountShippingCents = overrides.amountShippingCents ?? 0;
	const amountTotalCents = overrides.amountTotalCents ?? amountItemsCents + amountShippingCents;

	return prisma.order.create({
		data: {
			stripeSessionId: `cs_test_${suffix}`,
			email: "cliente@test.local",
			customerName: "Marie Dupont",
			shippingLine1: "1 rue des Lilas",
			shippingZip: "75001",
			shippingCity: "Paris",
			shippingCountry: "FR",
			status: OrderStatus.PENDING,
			...overrides,
			amountItemsCents,
			amountShippingCents,
			amountTotalCents,
			items: { create: lines },
		},
	});
}
