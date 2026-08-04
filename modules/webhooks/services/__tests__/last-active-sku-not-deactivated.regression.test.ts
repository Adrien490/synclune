import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * @regression STOCK-LAST-ACTIVE-SKU-001
 *
 * Audit « SKUs et variantes » (2026-07-30), P0-1.
 *
 * Le webhook d'encaissement désactivait en masse tout SKU tombé à 0 :
 *
 *     tx.productSku.updateMany({
 *         where: { id: { in: skuIds }, inventory: 0 },
 *         data: { isActive: false },
 *     })
 *
 * Ce `updateMany` aveugle contournait `assertPublicProductKeepsActiveSku`, dont
 * les DEUX seuls appelants sont des Server Actions admin (`update-sku`,
 * `update-sku-status`) : l'invariant « un produit PUBLIC garde ≥1 SKU actif »
 * était donc opposable à l'admin, et **jamais à une vente**.
 *
 * Conséquence sur un produit mono-SKU — la forme dominante ici, `update-product`
 * éditant un `defaultSku` inline : vendre la dernière unité laissait le produit
 * PUBLIC sans aucun SKU actif. `GET_PRODUCT_SELECT` filtrant `isActive: true`, la
 * relation revenait vide et la PDP faisait `notFound()`. Et comme
 * `buildProductWhereClause` n'exige nulle part un SKU actif, la carte restait
 * affichée en grille : **lien interne cassé** vers un 404, doublé d'une URL
 * indexée qui 404 (et ne revient pas seule), plus la disparition du bouton
 * « prévenez-moi » de la wishlist — la seule capture de demande — précisément
 * quand la demande est maximale.
 *
 * Verrou : le dernier SKU actif d'un produit PUBLIC reste actif à `inventory: 0`.
 * C'est l'état que la vitrine sait déjà rendre (« rupture de stock »),
 * `isSkuAvailable` exigeant `inventory > 0` et add-to-cart rejetant sous
 * `FOR UPDATE`. Les produits non PUBLIC et les SKU ayant un frère actif restent
 * désactivés comme avant.
 */

const { mockTx, mockPrisma } = vi.hoisted(() => {
	const mockTx = {
		order: { findUnique: vi.fn(), update: vi.fn() },
		productSku: { update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
		cartItem: { deleteMany: vi.fn() },
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

import { processOrderFromPaymentIntent } from "../checkout-order-processing.service";

const SKU_ID = "sku-last-1";
const PRODUCT_ID = "product-last-1";

/** Commande d'une ligne qui vide exactement le stock du SKU. */
function orderBuyingLastUnit(skuId = SKU_ID, productId = PRODUCT_ID) {
	return {
		id: "order-1",
		orderNumber: "CMD-001",
		paymentStatus: "PENDING",
		status: "PENDING",
		customerEmail: "a@b.c",
		customerFirstName: "A",
		customerLastName: "B",
		total: 2500,
		items: [
			{
				skuId,
				quantity: 1,
				price: 2500,
				productTitle: "Bague",
				skuColor: null,
				skuMaterial: null,
				skuSize: null,
				sku: {
					id: skuId,
					inventory: 1,
					sku: "SKU-LAST",
					product: { id: productId, slug: "bague" },
				},
			},
		],
	};
}

function makePaymentIntent() {
	return { id: "pi_123", amount_received: 2500, currency: "eur", metadata: {} } as never;
}

/** Le SKU est verrouillé avec `inventory: 1` → le décrément de 1 le met à 0. */
function lockStock(productStatus: string, skuId = SKU_ID) {
	mockTx.$queryRaw.mockResolvedValue([
		{
			id: skuId,
			inventory: 1,
			isActive: true,
			deletedAt: null,
			productStatus,
			productDeletedAt: null,
		},
	]);
}

beforeEach(() => {
	vi.clearAllMocks();
	mockPrisma.order.findUnique.mockResolvedValue({ status: "PENDING" });
	mockTx.productSku.update.mockResolvedValue({});
	mockTx.productSku.updateMany.mockResolvedValue({ count: 1 });
	mockTx.cartItem.deleteMany.mockResolvedValue({});
	mockTx.order.update.mockResolvedValue({});
});

describe("STOCK-LAST-ACTIVE-SKU-001 — le dernier SKU actif d'un produit PUBLIC survit à la rupture", () => {
	it("ne désactive PAS le seul SKU actif d'un produit PUBLIC tombé à 0", async () => {
		mockTx.order.findUnique.mockResolvedValue(orderBuyingLastUnit());
		lockStock("PUBLIC");
		// Un seul SKU actif sur ce produit : le désactiver laisserait la PDP en 404.
		mockTx.productSku.findMany.mockResolvedValue([{ productId: PRODUCT_ID }]);

		await processOrderFromPaymentIntent("order-1", makePaymentIntent());

		// Le stock est bien décrémenté…
		expect(mockTx.productSku.update).toHaveBeenCalledWith({
			where: { id: SKU_ID },
			data: { inventory: { decrement: 1 } },
		});
		// …mais aucune désactivation n'est émise.
		expect(mockTx.productSku.updateMany).not.toHaveBeenCalled();
	});

	it("désactive le SKU tombé à 0 quand un frère actif subsiste", async () => {
		mockTx.order.findUnique.mockResolvedValue(orderBuyingLastUnit());
		lockStock("PUBLIC");
		// Deux SKU actifs : en désactiver un laisse le produit achetable.
		mockTx.productSku.findMany.mockResolvedValue([
			{ productId: PRODUCT_ID },
			{ productId: PRODUCT_ID },
		]);

		await processOrderFromPaymentIntent("order-1", makePaymentIntent());

		expect(mockTx.productSku.updateMany).toHaveBeenCalledWith({
			where: { id: { in: [SKU_ID] } },
			data: { isActive: false },
		});
	});

	// Pas de cas « produit non PUBLIC » ici : il est INATTEIGNABLE par ce chemin.
	// La re-validation de l'étape 3 exige `sku.productStatus === "PUBLIC"` et lève
	// `OversellError` sinon — on ne peut donc pas acheter le SKU d'un produit DRAFT
	// ou ARCHIVED, et tout candidat qui atteint la désactivation est forcément
	// PUBLIC. Asserter cette branche ici la rendrait verte sur une condition
	// impossible ; elle est couverte là où l'entrée est réellement contrôlée :
	// `modules/skus/services/__tests__/validate-public-active-sku.service.test.ts`.

	it("n'interroge pas les frères actifs quand aucun SKU n'atteint 0", async () => {
		mockTx.order.findUnique.mockResolvedValue(orderBuyingLastUnit());
		// Stock 5 pour une quantité 1 → reste 4, aucun candidat.
		mockTx.$queryRaw.mockResolvedValue([
			{
				id: SKU_ID,
				inventory: 5,
				isActive: true,
				deletedAt: null,
				productStatus: "PUBLIC",
				productDeletedAt: null,
			},
		]);

		await processOrderFromPaymentIntent("order-1", makePaymentIntent());

		expect(mockTx.productSku.findMany).not.toHaveBeenCalled();
		expect(mockTx.productSku.updateMany).not.toHaveBeenCalled();
	});
});
