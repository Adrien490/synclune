import { describe, it, expect, vi, beforeEach } from "vitest";
import { releaseOrderDiscountUsageTx } from "../release-order-discount-usage.service";

/**
 * ⚠️ Réécrit le 2026-08-05 (audit schéma V2, Lot 2) : le code promo d'une commande
 * vit désormais en DEUX COLONNES sur `Order` (`discountId` + snapshot
 * `discountCode`), la table `DiscountUsage` a été repliée.
 *
 * Un cas de l'ancienne suite est devenu INEXPRIMABLE, pas seulement non testé —
 * « returns the same discountId multiple times if order has duplicate usages » :
 * une commande ne peut plus porter qu'UN code (une colonne scalaire), donc il n'y
 * a plus de doublon possible à ne pas coalescer. Le cookie panier ne portait déjà
 * qu'un `discountCode` singulier — le cas défendait une forme que la base
 * autorisait mais que le code ne produisait jamais.
 *
 * Condition de réouverture : si un jour une commande peut cumuler plusieurs codes,
 * il faudra une table de liaison ET ce cas de non-coalescence.
 */
const mockTx = {
	order: {
		findUnique: vi.fn(),
		updateMany: vi.fn(),
	},
	discount: {
		updateMany: vi.fn(),
	},
};

describe("releaseOrderDiscountUsageTx", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns [] and skips writes when no discount attached to order", async () => {
		mockTx.order.findUnique.mockResolvedValue({ discountId: null });

		const result = await releaseOrderDiscountUsageTx(mockTx as never, "order-empty");

		expect(result).toEqual([]);
		expect(mockTx.order.updateMany).not.toHaveBeenCalled();
		expect(mockTx.discount.updateMany).not.toHaveBeenCalled();
	});

	it("returns [] and skips writes when the order does not exist", async () => {
		mockTx.order.findUnique.mockResolvedValue(null);

		const result = await releaseOrderDiscountUsageTx(mockTx as never, "order-gone");

		expect(result).toEqual([]);
		expect(mockTx.order.updateMany).not.toHaveBeenCalled();
		expect(mockTx.discount.updateMany).not.toHaveBeenCalled();
	});

	it("clears both columns, then decrements usageCount under the usageCount > 0 guard", async () => {
		mockTx.order.findUnique.mockResolvedValue({ discountId: "disc_a" });
		mockTx.order.updateMany.mockResolvedValue({ count: 1 });
		mockTx.discount.updateMany.mockResolvedValue({ count: 1 });

		const result = await releaseOrderDiscountUsageTx(mockTx as never, "order-1");

		expect(result).toEqual(["disc_a"]);
		// Le snapshot part avec la relation : laisser `discountCode` derrière
		// afficherait « Réduction (SUMMER10) » sur une commande dont la réduction a
		// justement été libérée.
		expect(mockTx.order.updateMany).toHaveBeenCalledWith({
			where: { id: "order-1", discountId: { not: null } },
			data: { discountId: null, discountCode: null },
		});
		expect(mockTx.discount.updateMany).toHaveBeenCalledTimes(1);
		expect(mockTx.discount.updateMany).toHaveBeenCalledWith({
			where: { id: "disc_a", usageCount: { gt: 0 } },
			data: { usageCount: { decrement: 1 } },
		});
	});

	it("ne décrémente PAS quand le claim est perdu (appel concurrent passé avant)", async () => {
		// [[DISC-USAGE-002]] Le cœur de l'idempotence : la remise à NULL est un CLAIM
		// (`discountId: { not: null }`). Sans lui — c'était le cas de l'implémentation
		// à base de findMany → decrement → deleteMany — deux transactions concurrentes
		// lisaient le même usage et décrémentaient CHACUNE. Le garde `usageCount > 0`
		// empêchait de passer sous zéro, pas de décompter deux fois une seule commande.
		mockTx.order.findUnique.mockResolvedValue({ discountId: "disc_a" });
		mockTx.order.updateMany.mockResolvedValue({ count: 0 });

		const result = await releaseOrderDiscountUsageTx(mockTx as never, "order-race");

		expect(result).toEqual([]);
		expect(mockTx.discount.updateMany).not.toHaveBeenCalled();
	});
});
