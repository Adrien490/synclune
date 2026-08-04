import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * @regression checkout-duplicate-sku-stock-aggregation
 *
 * Audit « Checkout Stripe Elements » (2026-07-26), finding F4.
 *
 * `processOrderAtomically` validait le stock LIGNE PAR LIGNE contre un snapshot
 * `FOR UPDATE` pris en une fois. Deux `OrderItem` portant le même `skuId`
 * (3 + 3 sur un stock de 5) passaient donc chacun le contrôle, puis cumulaient
 * leur décrément → violation du CHECK `ProductSku_inventory_non_negative` DANS
 * la transaction, hors des chemins typés `OversellError` / `AmountMismatchError` :
 * client débité, commande jamais PAID, retries Stripe en boucle.
 *
 * `confirmCheckoutSchema` rejette désormais les doublons en entrée
 * (checkout-cart-items-bounds), mais cette garde-ci reste le filet pour les
 * commandes déjà en base et tout futur writer (import, admin, seed).
 *
 * Verrou : quantités AGRÉGÉES par SKU avant comparaison, un seul décrément par
 * SKU, et `OversellError` (pas une erreur Prisma brute) quand le cumul dépasse.
 */

const { mockTx, mockPrisma } = vi.hoisted(() => {
	const mockTx = {
		order: { findUnique: vi.fn(), update: vi.fn() },
		productSku: { update: vi.fn(), updateMany: vi.fn() },
		cartItem: { deleteMany: vi.fn() },
		// [[CART-DISCOUNT-003]] purge du code promo panier après paiement réussi
		cart: { updateMany: vi.fn() },
		$queryRaw: vi.fn(),
	};
	const mockPrisma = {
		$transaction: vi.fn(async (cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
		order: { findUnique: vi.fn() },
	};
	return { mockTx, mockPrisma };
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/prisma-tx-options", () => ({
	TX_TIMEOUT_LONG: 30000,
	TX_MAX_WAIT_LONG: 30000,
}));

vi.mock("@/modules/orders/utils/order-audit", () => ({
	createOrderAuditTx: vi.fn(),
}));

vi.mock("./payment-intent.service", () => ({
	initiateAutomaticRefund: vi.fn().mockResolvedValue({ success: true }),
}));

import { processOrderFromPaymentIntent, OversellError } from "../checkout-order-processing.service";

const DUPLICATED_SKU = "sku-dup-1";

/** Commande portant DEUX lignes sur le même SKU (cumul = 6). */
function orderWithDuplicateLines(quantities: [number, number]) {
	return {
		id: "order-1",
		orderNumber: "CMD-001",
		paymentStatus: "PENDING",
		status: "PENDING",
		total: 5000,
		items: quantities.map((quantity) => ({
			skuId: DUPLICATED_SKU,
			quantity,
			price: 2500,
			productTitle: "Bracelet",
			skuColor: null,
			skuMaterial: null,
			skuSize: null,
			sku: {
				id: DUPLICATED_SKU,
				inventory: 5,
				sku: "SKU-DUP",
				product: { id: "product-dup", slug: "bracelet" },
			},
		})),
	};
}

function makePaymentIntent() {
	return {
		id: "pi_123",
		amount_received: 5000,
		currency: "eur",
		metadata: {},
	} as never;
}

function mockStock(inventory: number) {
	mockTx.$queryRaw.mockResolvedValue([
		{
			id: DUPLICATED_SKU,
			inventory,
			isActive: true,
			deletedAt: null,
			productStatus: "PUBLIC",
			productDeletedAt: null,
		},
	]);
}

beforeEach(() => {
	vi.clearAllMocks();
	mockPrisma.order.findUnique.mockResolvedValue({ status: "PENDING" });
	mockTx.productSku.update.mockResolvedValue({});
	mockTx.productSku.updateMany.mockResolvedValue({ count: 0 });
	mockTx.cartItem.deleteMany.mockResolvedValue({});
	mockTx.order.update.mockResolvedValue({});
});

describe("processOrderAtomically — agrégation du stock par SKU (F4)", () => {
	it("lève OversellError quand le CUMUL des lignes d'un même SKU dépasse le stock", async () => {
		mockTx.order.findUnique.mockResolvedValue(orderWithDuplicateLines([3, 3]));
		mockStock(5);

		await expect(processOrderFromPaymentIntent("order-1", makePaymentIntent())).rejects.toThrow(
			OversellError,
		);
		// Aucun décrément partiel : le throw précède toute écriture.
		expect(mockTx.productSku.update).not.toHaveBeenCalled();
		expect(mockTx.order.update).not.toHaveBeenCalled();
	});

	it("décrémente une seule fois par SKU, avec la quantité cumulée", async () => {
		mockTx.order.findUnique.mockResolvedValue(orderWithDuplicateLines([2, 2]));
		mockStock(5);

		await processOrderFromPaymentIntent("order-1", makePaymentIntent());

		expect(mockTx.productSku.update).toHaveBeenCalledTimes(1);
		expect(mockTx.productSku.update).toHaveBeenCalledWith({
			where: { id: DUPLICATED_SKU },
			data: { inventory: { decrement: 4 } },
		});
	});

	it("reste correct sur le cas nominal (une ligne par SKU)", async () => {
		mockTx.order.findUnique.mockResolvedValue({
			...orderWithDuplicateLines([2, 2]),
			items: [
				{
					skuId: DUPLICATED_SKU,
					quantity: 2,
					price: 2500,
					productTitle: "Bracelet",
					skuColor: null,
					skuMaterial: null,
					skuSize: null,
					sku: {
						id: DUPLICATED_SKU,
						inventory: 5,
						sku: "SKU-DUP",
						product: { id: "product-dup", slug: "bracelet" },
					},
				},
			],
		});
		mockStock(5);

		await processOrderFromPaymentIntent("order-1", makePaymentIntent());

		expect(mockTx.productSku.update).toHaveBeenCalledWith({
			where: { id: DUPLICATED_SKU },
			data: { inventory: { decrement: 2 } },
		});
	});
});
