import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * @regression order-currency-guard-2026-05-29
 *
 * Audit F1 (2026-05-29) : `processOrderAtomically` ne comparait que le montant
 * encaissé (`amount_received`/`amount_total`) au `order.total`, jamais la DEVISE.
 * Les gardes montant comparent des centiers entiers bruts — un encaissement
 * "5000" dans une devise faible aurait satisfait un order EUR de 5000c. EUR-only
 * aujourd'hui (CHECK Order_currency_eur_check + PI créé `currency:"eur"`), mais
 * cette garde défense-en-profondeur protège tout futur PI multi-devises.
 *
 * Verrou : un mismatch devise DOIT lever (commande non marquée PAID), un match
 * (insensible à la casse) DOIT laisser passer.
 */

const { mockTx, mockPrisma } = vi.hoisted(() => {
	const mockTx = {
		order: { findUnique: vi.fn(), update: vi.fn() },
		productSku: { update: vi.fn(), updateMany: vi.fn() },
		// STOCK-LEDGER-001 : le décrément de vente écrit désormais un StockMovement.
		stockMovement: { create: vi.fn() },
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

import { processOrderFromPaymentIntent } from "../checkout-order-processing.service";

const baseOrder = {
	id: "order-1",
	orderNumber: "CMD-001",
	userId: "user-1",
	paymentStatus: "PENDING",
	status: "PENDING",
	currency: "EUR",
	total: 5000,
	items: [
		{
			skuId: "sku-pi-1",
			quantity: 2,
			price: 2500,
			productTitle: "Bracelet",
			skuColor: null,
			skuMaterial: null,
			skuSize: null,
			sku: {
				id: "sku-pi-1",
				inventory: 10,
				sku: "SKU-1",
				product: { id: "product-pi-1", slug: "bague-pi" },
			},
		},
	],
};

function makePaymentIntent(overrides = {}) {
	return {
		id: "pi_123",
		amount_received: 5000,
		currency: "eur",
		metadata: {},
		...overrides,
	} as never;
}

beforeEach(() => {
	vi.clearAllMocks();
	mockTx.order.findUnique.mockResolvedValue(baseOrder);
	mockPrisma.order.findUnique.mockResolvedValue({ status: "PENDING" });
	mockTx.$queryRaw.mockResolvedValue([
		{
			id: "sku-pi-1",
			inventory: 10,
			isActive: true,
			deletedAt: null,
			productStatus: "PUBLIC",
			productDeletedAt: null,
		},
	]);
	mockTx.productSku.update.mockResolvedValue({});
	mockTx.productSku.updateMany.mockResolvedValue({ count: 0 });
	mockTx.cartItem.deleteMany.mockResolvedValue({});
	mockTx.order.update.mockResolvedValue({});
});

describe("processOrderAtomically — currency guard (F1)", () => {
	it("throws on currency mismatch and never marks the order PAID", async () => {
		await expect(
			processOrderFromPaymentIntent("order-1", makePaymentIntent({ currency: "usd" })),
		).rejects.toThrow(/Currency mismatch/);
		// La garde se déclenche AVANT tout décrément stock / update commande.
		expect(mockTx.productSku.update).not.toHaveBeenCalled();
		expect(mockTx.order.update).not.toHaveBeenCalled();
	});

	it("passes when the PI currency matches order.currency (case-insensitive)", async () => {
		await processOrderFromPaymentIntent("order-1", makePaymentIntent({ currency: "eur" }));
		expect(mockTx.productSku.update).toHaveBeenCalledWith({
			where: { id: "sku-pi-1" },
			data: { inventory: { decrement: 2 } },
		});
	});
});
