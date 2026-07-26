import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockNotifyBackInStock, mockLogger } = vi.hoisted(() => ({
	mockPrisma: { wishlistItem: { findMany: vi.fn() } },
	mockNotifyBackInStock: vi.fn(),
	mockLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/wishlist/services/notify-back-in-stock", () => ({
	notifyBackInStock: mockNotifyBackInStock,
}));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

import { MARKETING_DAILY_EMAIL_BUDGET } from "@/modules/emails/constants/email-budget";
import { drainBackInStockQueue } from "../drain-back-in-stock.service";

describe("drainBackInStockQueue", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockPrisma.wishlistItem.findMany.mockResolvedValue([]);
		mockNotifyBackInStock.mockResolvedValue(0);
	});

	it("no-op quand la file est vide", async () => {
		const result = await drainBackInStockQueue();

		expect(result).toMatchObject({ processed: 0, errored: 0, skipped: 1 });
		expect(mockNotifyBackInStock).not.toHaveBeenCalled();
	});

	it("ne sélectionne que des produits publics avec du stock réel", async () => {
		await drainBackInStockQueue();

		const where = mockPrisma.wishlistItem.findMany.mock.calls[0]![0].where;
		expect(where.backInStockNotifiedAt).toBeNull();
		expect(where.product.status).toBe("PUBLIC");
		expect(where.product.deletedAt).toBeNull();
		// Un produit retombé en rupture depuis le réassort ne doit pas générer
		// d'email « revenu en stock » vers un bouton d'achat désactivé.
		expect(where.product.skus).toEqual({ some: { isActive: true, inventory: { gt: 0 } } });
		// Opposition marketing (Art. 21 RGPD) respectée jusque dans le drainage.
		expect(where.wishlist.user.marketingOptOutAt).toBeNull();
	});

	it("dédoublonne par produit", async () => {
		await drainBackInStockQueue();

		expect(mockPrisma.wishlistItem.findMany.mock.calls[0]![0].distinct).toEqual(["productId"]);
	});

	it("notifie chaque produit en attente et cumule les envois", async () => {
		mockPrisma.wishlistItem.findMany.mockResolvedValue([
			{ productId: "prod-1" },
			{ productId: "prod-2" },
		]);
		mockNotifyBackInStock.mockResolvedValueOnce(5).mockResolvedValueOnce(3);

		const result = await drainBackInStockQueue();

		expect(mockNotifyBackInStock).toHaveBeenCalledTimes(2);
		expect(result.processed).toBe(8);
		expect(result.errored).toBe(0);
	});

	it("s'arrête dès que le budget marketing du jour est consommé", async () => {
		mockPrisma.wishlistItem.findMany.mockResolvedValue([
			{ productId: "prod-1" },
			{ productId: "prod-2" },
			{ productId: "prod-3" },
		]);
		// Le premier produit consomme tout le budget.
		mockNotifyBackInStock.mockResolvedValueOnce(MARKETING_DAILY_EMAIL_BUDGET);

		const result = await drainBackInStockQueue();

		// Les produits suivants ne sont même pas tentés : le budget est à zéro.
		expect(mockNotifyBackInStock).toHaveBeenCalledTimes(1);
		expect(result.processed).toBe(MARKETING_DAILY_EMAIL_BUDGET);
		expect(result.hasMore).toBe(true);
	});

	it("isole l'échec d'un produit sans interrompre les suivants", async () => {
		mockPrisma.wishlistItem.findMany.mockResolvedValue([
			{ productId: "prod-1" },
			{ productId: "prod-2" },
		]);
		mockNotifyBackInStock.mockRejectedValueOnce(new Error("Resend down")).mockResolvedValueOnce(4);

		const result = await drainBackInStockQueue();

		expect(mockNotifyBackInStock).toHaveBeenCalledTimes(2);
		expect(result.errored).toBe(1);
		expect(result.processed).toBe(4);
	});

	it("ne throw jamais si la requête de file échoue (passe cron non bloquante)", async () => {
		mockPrisma.wishlistItem.findMany.mockRejectedValue(new Error("DB down"));

		const result = await drainBackInStockQueue();

		expect(result).toMatchObject({ processed: 0, errored: 1 });
		expect(mockLogger.error).toHaveBeenCalled();
	});
});
