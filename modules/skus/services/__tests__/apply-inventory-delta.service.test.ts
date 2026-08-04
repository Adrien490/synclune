import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * @regression STOCK-PHANTOM-001
 *
 * Audit « SKUs et variantes » (2026-07-30), P0-2 — volet unitaire.
 *
 * SSOT du stock saisi dans un formulaire admin. Le défaut qu'elle ferme : écrire
 * `inventory: <valeur du formulaire>` en ABSOLU. Entre l'ouverture du formulaire et
 * l'enregistrement, le webhook d'encaissement peut avoir décrémenté ; un set absolu
 * réécrit alors la valeur périmée par-dessus une vente réelle (**stock fantôme**),
 * et la survente suivante se solde par un `OversellError` → commande FAILED +
 * remboursement automatique.
 *
 * Ce que le helper garantit : lecture sous `SELECT … FOR UPDATE` (sérialise avec le
 * `FOR UPDATE` de `checkout-order-processing.service`), delta relatif au stock
 * AFFICHÉ et non au stock réel, et plancher à 0.
 *
 * `update-sku` portait déjà cette logique ; `update-product` était resté en set
 * absolu deux mois de plus. Elle vit ici pour ne plus pouvoir diverger.
 */

vi.mock("@/shared/lib/actions", () => ({
	// Sous-classe réelle : `instanceof` doit fonctionner chez l'appelant.
	BusinessError: class BusinessError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "BusinessError";
		}
	},
}));

vi.mock("@/app/generated/prisma/client", () => ({}));

import { applyInventoryDeltaTx } from "../apply-inventory-delta.service";

function makeTx(lockedInventory: number | null) {
	return {
		$queryRaw: vi
			.fn()
			.mockResolvedValue(lockedInventory === null ? [] : [{ inventory: lockedInventory }]),
	} as unknown as Parameters<typeof applyInventoryDeltaTx>[0] & {
		$queryRaw: ReturnType<typeof vi.fn>;
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("STOCK-PHANTOM-001 — applyInventoryDeltaTx", () => {
	it("ne touche à rien quand le champ de stock est inchangé (cas dominant)", async () => {
		const tx = makeTx(10);

		const delta = await applyInventoryDeltaTx(tx, {
			skuId: "sku-1",
			targetInventory: 7,
			originalInventory: 7,
			fallbackInventory: 7,
		});

		expect(delta).toBe(0);
		// Le verrou est pris MALGRÉ le delta nul : c'est lui qui sérialise avec le webhook.
		expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
	});

	it("préserve une vente concurrente : le delta s'applique au stock RÉEL", async () => {
		// Formulaire ouvert à 10, une vente a fait tomber le stock réel à 8.
		const tx = makeTx(8);

		const delta = await applyInventoryDeltaTx(tx, {
			skuId: "sku-1",
			targetInventory: 12, // l'admin veut +2
			originalInventory: 10,
			fallbackInventory: 10,
		});

		// +2 relatif, PAS un set absolu à 12 : le stock finit à 10, pas à 12.
		// Un set absolu aurait réintroduit l'unité vendue (stock fantôme).
		expect(delta).toBe(2);
	});

	it("refuse un delta qui ferait passer le stock réel sous zéro", async () => {
		// Réel 1 (ventes entre-temps), l'admin retire 5 depuis un formulaire à 6.
		const tx = makeTx(1);

		await expect(
			applyInventoryDeltaTx(tx, {
				skuId: "sku-1",
				targetInventory: 1,
				originalInventory: 6,
				fallbackInventory: 6,
			}),
		).rejects.toThrow(/stock a changé/i);
	});

	it("sans champ caché, baseline = cible ⇒ delta 0, aucun écrasement", async () => {
		// Compat : un formulaire (ou un POST) qui n'envoie pas `originalInventory` ne
		// doit RIEN écraser plutôt que d'appliquer un set absolu déguisé.
		const tx = makeTx(3);

		const delta = await applyInventoryDeltaTx(tx, {
			skuId: "sku-1",
			targetInventory: 99,
			fallbackInventory: 3,
		});

		expect(delta).toBe(0);
	});

	it("retombe sur fallbackInventory si le FOR UPDATE ne rend aucune ligne", async () => {
		// Aucune ligne verrouillée : la garde de plancher raisonne sur `fallbackInventory`
		// (4), donc un retrait de 5 est refusé alors qu'un retrait de 4 passe.
		await expect(
			applyInventoryDeltaTx(makeTx(null), {
				skuId: "sku-1",
				targetInventory: 0,
				originalInventory: 5,
				fallbackInventory: 4,
			}),
		).rejects.toThrow(/stock a changé/i);

		const delta = await applyInventoryDeltaTx(makeTx(null), {
			skuId: "sku-1",
			targetInventory: 5,
			originalInventory: 4,
			fallbackInventory: 4,
		});
		expect(delta).toBe(1);
	});
});
