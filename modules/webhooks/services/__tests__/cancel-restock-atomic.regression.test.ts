import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * @regression idem-cancel-002-restock-atomic
 *
 * Audit idempotence 2026-07-02 (P1-1) — double restock au rejeu de
 * `payment_intent.canceled`.
 *
 * Bug verrouillé : le restock (`restoreStockForOrder`) était une transaction
 * SÉPARÉE committée AVANT `markOrderAsCancelled`. Un crash entre les deux
 * commits laissait l'event webhook en PROCESSING → repassé FAILED par le cron
 * retry-webhooks → re-dispatch → l'order relu était toujours PROCESSING →
 * l'inventaire était ré-incrémenté une 2ᵉ fois (phantom stock → survente).
 *
 * Fix : le restock vit DANS la transaction de `markOrderAsCancelled` et n'est
 * exécuté que si le claim conditionnel CANCELLED (updateMany) est GAGNÉ. Au
 * rejeu, l'order est CANCELLED/FAILED → claim perdu (ou skip idempotent) →
 * aucun restock.
 */

const { mockTx, mockPrisma, mockReleaseOrderDiscountUsageTx, mockUpdateTag, mockLogger } =
	vi.hoisted(() => {
		const mockTx = {
			order: {
				findFirst: vi.fn(),
				updateMany: vi.fn(),
			},
			productSku: {
				findMany: vi.fn(),
				update: vi.fn(),
			},
			// STOCK-LEDGER-001 : le décrément de vente écrit désormais un StockMovement.
			stockMovement: { create: vi.fn() },
			orderHistory: {
				create: vi.fn(),
			},
		};

		return {
			mockTx,
			mockPrisma: {
				$transaction: vi.fn(),
			},
			mockReleaseOrderDiscountUsageTx: vi.fn().mockResolvedValue([]),
			mockUpdateTag: vi.fn(),
			mockLogger: {
				info: vi.fn(),
				warn: vi.fn(),
				error: vi.fn(),
				debug: vi.fn(),
			},
		};
	});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/stripe", () => ({
	stripe: { refunds: { create: vi.fn() } },
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminRefundFailedAlert: vi.fn(),
}));

vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: vi.fn().mockReturnValue("https://synclune.fr"),
	ROUTES: {
		ADMIN: {
			ORDER_DETAIL: (orderId: string) => `/admin/ventes/commandes/${orderId}`,
		},
	},
}));

vi.mock("@/modules/discounts/services/release-order-discount-usage.service", () => ({
	releaseOrderDiscountUsageTx: mockReleaseOrderDiscountUsageTx,
}));

vi.mock("@/modules/discounts/constants/cache", () => ({
	DISCOUNT_CACHE_TAGS: {
		USAGE: (discountId: string) => `discount-usage-${discountId}`,
	},
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: mockLogger,
}));

import { markOrderAsCancelled } from "../payment-intent.service";

describe("@regression IDEM-CANCEL-002 — restock atomique avec le claim CANCELLED", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReleaseOrderDiscountUsageTx.mockResolvedValue([]);
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) =>
			cb(mockTx),
		);
	});

	it("restocke DANS la même tx quand le claim est gagné (order PROCESSING)", async () => {
		mockTx.order.findFirst.mockResolvedValue({
			status: "PROCESSING",
			paymentStatus: "PENDING",
			items: [
				{ skuId: "sku-a", quantity: 2, sku: { product: { id: "prod-a", slug: "produit-a" } } },
				// même SKU sur 2 items → agrégé
				{ skuId: "sku-a", quantity: 1, sku: { product: { id: "prod-a", slug: "produit-a" } } },
				{ skuId: "sku-b", quantity: 3, sku: { product: { id: "prod-b", slug: "produit-b" } } },
			],
		});
		mockTx.order.updateMany.mockResolvedValue({ count: 1 });
		mockTx.productSku.findMany.mockResolvedValue([
			{ id: "sku-a", inventory: 5, isActive: true },
			{ id: "sku-b", inventory: 0, isActive: false }, // auto-désactivé → réactivé
		]);
		mockTx.productSku.update.mockResolvedValue({});

		const result = await markOrderAsCancelled("order-1", "pi_123");

		// Restock agrégé par SKU, dans la MÊME transaction que le claim.
		expect(mockTx.productSku.update).toHaveBeenCalledWith({
			where: { id: "sku-a" },
			data: { inventory: { increment: 3 } },
		});
		expect(mockTx.productSku.update).toHaveBeenCalledWith({
			where: { id: "sku-b" },
			data: { inventory: { increment: 3 }, isActive: true },
		});
		// CACHE-CATALOG-002 : le produit est propagé pour invalider la page vitrine.
		expect(result).toEqual({
			restoredSkus: [
				{ skuId: "sku-a", productId: "prod-a", productSlug: "produit-a" },
				{ skuId: "sku-b", productId: "prod-b", productSlug: "produit-b" },
			],
		});

		// Ordre des opérations : le claim updateMany PRÉCÈDE tout restock —
		// c'est l'invariant qui rend le rejeu inoffensif.
		const claimOrder = mockTx.order.updateMany.mock.invocationCallOrder[0];
		const restockOrder = mockTx.productSku.update.mock.invocationCallOrder[0];
		expect(claimOrder).toBeLessThan(restockOrder!);
	});

	it("REJEU : claim perdu (count 0) ⇒ AUCUN restock, aucun release discount, aucun audit", async () => {
		// Un rejeu peut relire un état intermédiaire (order pas encore CANCELLED
		// aux yeux de ce run) mais le claim conditionnel ré-évalué au lock de
		// ligne perd → aucune mutation de stock.
		mockTx.order.findFirst.mockResolvedValue({
			status: "PROCESSING",
			paymentStatus: "PENDING",
			items: [{ skuId: "sku-a", quantity: 2 }],
		});
		mockTx.order.updateMany.mockResolvedValue({ count: 0 });

		const result = await markOrderAsCancelled("order-1", "pi_123");

		expect(mockTx.productSku.update).not.toHaveBeenCalled();
		expect(mockReleaseOrderDiscountUsageTx).not.toHaveBeenCalled();
		expect(mockTx.orderHistory.create).not.toHaveBeenCalled();
		expect(result).toEqual({ restoredSkus: [] });
	});

	it("REJEU : order déjà CANCELLED/FAILED ⇒ skip idempotent avant même le claim", async () => {
		mockTx.order.findFirst.mockResolvedValue({
			status: "CANCELLED",
			paymentStatus: "FAILED",
			items: [{ skuId: "sku-a", quantity: 2 }],
		});

		const result = await markOrderAsCancelled("order-1", "pi_123");

		expect(mockTx.order.updateMany).not.toHaveBeenCalled();
		expect(mockTx.productSku.update).not.toHaveBeenCalled();
		expect(result).toEqual({ restoredSkus: [] });
	});

	it("ne restocke PAS une commande PENDING (stock jamais décrémenté — réservation optimiste)", async () => {
		mockTx.order.findFirst.mockResolvedValue({
			status: "PENDING",
			paymentStatus: "PENDING",
			items: [{ skuId: "sku-a", quantity: 2 }],
		});
		mockTx.order.updateMany.mockResolvedValue({ count: 1 });

		const result = await markOrderAsCancelled("order-1", "pi_123");

		expect(mockTx.productSku.update).not.toHaveBeenCalled();
		expect(result).toEqual({ restoredSkus: [] });
	});
});
