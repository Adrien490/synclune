import { describe, expect, it } from "vitest";
import {
	GET_ORDER_SELECT_ADMIN,
	GET_ORDER_SELECT_CUSTOMER,
	GET_ORDERS_SELECT,
} from "../order.constants";

/**
 * @regression order-select-snapshot-only-2026-07-02
 *
 * Pendant read-side de l'invariant #4 (snapshots OrderItem figés au checkout,
 * cf. CLAUDE.md § "Facturation électronique — invariants" et
 * `order-item-snapshot-immutability.regression.test.ts` qui verrouille le côté
 * ÉCRITURE) : les sélecteurs d'affichage des commandes ne doivent JAMAIS joindre
 * les relations live `product`/`sku`. L'affichage d'une commande passée repose
 * exclusivement sur les colonnes snapshot (productTitle, productImageUrl,
 * skuColor, skuMaterial, skuSize, price, …).
 *
 * Risque si la garde saute : un `product: { select: { title } }` ajouté à un
 * sélecteur ferait afficher le titre/prix COURANT du produit sur une commande
 * historique — divergence avec la facture archivée (Art. L102 B LPF) dès que
 * l'admin renomme un produit ou change un prix.
 *
 * Les joins live légitimes (stock, invalidation cache, reorder) vivent dans des
 * selects dédiés hors de ces constantes d'affichage.
 */

const FORBIDDEN_RELATIONS = ["product", "sku"] as const;

function findLiveJoins(node: unknown, path: string, offenders: string[]): void {
	if (node === null || typeof node !== "object") return;
	for (const [key, value] of Object.entries(node)) {
		const childPath = `${path}.${key}`;
		if ((FORBIDDEN_RELATIONS as readonly string[]).includes(key)) {
			offenders.push(childPath);
		}
		findLiveJoins(value, childPath, offenders);
	}
}

const DISPLAY_SELECTS = {
	GET_ORDERS_SELECT,
	GET_ORDER_SELECT_ADMIN,
	GET_ORDER_SELECT_CUSTOMER,
} as const;

describe("Sélecteurs d'affichage commandes — snapshots uniquement (Invariant #4, read-side)", () => {
	for (const [name, select] of Object.entries(DISPLAY_SELECTS)) {
		it(`${name} ne joint pas les relations live product/sku`, () => {
			const offenders: string[] = [];
			findLiveJoins(select, name, offenders);
			expect(offenders).toEqual([]);
		});
	}

	it("les items des sélecteurs de détail exposent bien les colonnes snapshot", () => {
		// Garde-fou complémentaire : si quelqu'un remplace les colonnes snapshot
		// par un join (échappant au test ci-dessus via un renommage), l'absence
		// des colonnes le signale.
		for (const select of [GET_ORDER_SELECT_ADMIN, GET_ORDER_SELECT_CUSTOMER]) {
			expect(select.items.select).toMatchObject({
				productTitle: true,
				productImageUrl: true,
				skuColor: true,
				skuMaterial: true,
				skuSize: true,
				price: true,
				quantity: true,
			});
		}
	});
});
