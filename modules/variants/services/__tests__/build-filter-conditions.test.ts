import { describe, expect, it } from "vitest";
import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";
import { buildFilterConditions } from "../build-filter-conditions";

/**
 * `buildFilterConditions` n'avait AUCUN test (0 % de couverture) alors qu'il
 * traduit chaque case du sheet en `WHERE` — et qu'un filtre silencieusement
 * ignoré ressemble, côté admin, à « aucune variante ne correspond ».
 */
describe("buildFilterConditions", () => {
	it("ne produit aucune condition sans filtre", () => {
		expect(buildFilterConditions({})).toEqual([]);
	});

	it("réduit un productId unique à une égalité (pas de `in` inutile)", () => {
		expect(buildFilterConditions({ productId: "p1" })).toEqual([{ productId: "p1" }]);
	});

	it("bascule sur `in` pour plusieurs produits", () => {
		expect(buildFilterConditions({ productId: ["p1", "p2"] })).toEqual([
			{ productId: { in: ["p1", "p2"] } },
		]);
	});

	it("traduit couleurs et matériaux en `in` sur la FK", () => {
		expect(buildFilterConditions({ colorId: ["c1", "c2"], materialId: "m1" })).toEqual([
			{ colorId: { in: ["c1", "c2"] } },
			{ materialId: { in: ["m1"] } },
		]);
	});

	it("distingue `active: false` de l'absence de filtre", () => {
		expect(buildFilterConditions({ active: false })).toEqual([{ active: false }]);
		expect(buildFilterConditions({})).toEqual([]);
	});

	it("traduit un statut de stock unique sans `OR` superflu", () => {
		expect(buildFilterConditions({ stockStatus: ["low_stock"] })).toEqual([
			{ stock: { gt: 0, lte: STOCK_THRESHOLDS.LOW } },
		]);
	});

	/**
	 * ⚠️ Le sheet est multi-select depuis toujours, mais la page ne transmettait
	 * le filtre que s'il y avait EXACTEMENT un statut coché : cocher deux cases
	 * affichait deux badges et n'appliquait aucun filtre. L'union est un `OR`.
	 */
	it("unit plusieurs statuts de stock dans un OR", () => {
		expect(buildFilterConditions({ stockStatus: ["in_stock", "out_of_stock"] })).toEqual([
			{ OR: [{ stock: { gt: 0 } }, { stock: { lte: 0 } }] },
		]);
	});

	it("empile chaque famille de filtres dans le même AND", () => {
		const conditions = buildFilterConditions({
			productId: "p1",
			colorId: "c1",
			active: true,
			stockStatus: ["in_stock"],
		});

		expect(conditions).toHaveLength(4);
	});
});
