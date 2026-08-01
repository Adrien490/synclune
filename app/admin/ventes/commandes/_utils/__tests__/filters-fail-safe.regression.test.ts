/**
 * @regression orders-filters-fail-safe
 *
 * Audit « Admin commandes » 2026-07-26 (P1-1). `parseFilters` construisait ses valeurs
 * brutes (`Number(v) * 100`, `new Date(v)`) sans validation, et `getOrders` **throw**
 * quand `getOrdersSchema.safeParse` échoue — hors du `try/catch` de `fetchOrders`.
 * Résultat : 4 URL forgeables suffisaient à afficher l'error boundary sur la liste des
 * commandes (montant négatif, montant décimal, date non parsable, bornes inversées).
 *
 * Même classe de bug que `parse-pagination-params.regression.test.ts` sur `/produits`,
 * dont le correctif fail-safe n'avait pas été appliqué à l'admin.
 *
 * Contrat verrouillé ici : **aucune** valeur de searchParams ne doit faire échouer
 * `orderFiltersSchema`. La liste peut ignorer un filtre absurde ; elle ne doit pas
 * planter.
 */
import { describe, it, expect } from "vitest";

import { ORDER_TOTAL_FILTER_MAX_EUROS } from "@/modules/orders/constants/order.constants";
import { orderFiltersSchema } from "@/modules/orders/schemas/order.schemas";
import { parseFilters } from "../params";

type Params = Record<string, string | string[] | undefined>;

const parse = (params: Params) => orderFiltersSchema.safeParse(parseFilters(params as never));

describe("@regression orders-filters-fail-safe", () => {
	// Les 4 vecteurs exacts identifiés par l'audit.
	const FORGED_URLS: Array<[string, Params]> = [
		["montant négatif", { filter_totalMin: "-1" }],
		["montant décimal sous le centime", { filter_totalMin: "10.005" }],
		["date non parsable", { filter_createdAfter: "garbage" }],
		[
			"bornes de dates inversées",
			{ filter_createdAfter: "2026-12-31", filter_createdBefore: "2020-01-01" },
		],
	];

	it.each(FORGED_URLS)("URL forgée (%s) → pas de throw, validation OK", (_label, params) => {
		expect(() => parseFilters(params as never)).not.toThrow();
		const result = parse(params);
		expect(
			result.success,
			`orderFiltersSchema rejette cette URL : getOrders throw → error boundary sur la liste.`,
		).toBe(true);
	});

	it("un montant hors plafond est ignoré, pas propagé", () => {
		const result = parse({ filter_totalMax: String(ORDER_TOTAL_FILTER_MAX_EUROS + 1) });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.totalMax).toBeUndefined();
	});

	it("un montant non numérique est ignoré", () => {
		for (const raw of ["abc", "", "NaN", "Infinity", "1e999"]) {
			const result = parse({ filter_totalMin: raw });
			expect(result.success, `échec sur filter_totalMin=${raw}`).toBe(true);
			if (result.success) expect(result.data.totalMin).toBeUndefined();
		}
	});

	it("les bornes de montant inversées sont remises dans l'ordre", () => {
		const result = parse({ filter_totalMin: "200", filter_totalMax: "50" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.totalMin).toBe(5000);
			expect(result.data.totalMax).toBe(20000);
		}
	});

	it("les bornes de dates inversées sont remises dans l'ordre", () => {
		// 30/06 et non 31/12 : la borne « Au » est étendue à la fin du jour choisi
		// (P2 audit 2026-08-01), et 31/12 minuit UTC + 24h-1ms bascule sur l'année
		// suivante en heure locale — l'invariant testé ici est l'ORDRE, pas la borne.
		const result = parse({
			filter_createdAfter: "2026-06-30",
			filter_createdBefore: "2020-01-01",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.createdAfter!.getFullYear()).toBe(2020);
			expect(result.data.createdBefore!.getFullYear()).toBe(2026);
		}
	});

	// P2 (audit « Admin commandes » 2026-08-01) : la borne « Au » est un JOUR
	// calendaire — `lte minuit` excluait toute la journée sélectionnée pendant que
	// le badge l'affichait incluse. La borne retournée couvre le jour entier.
	it("la borne « Au » inclut toute la journée sélectionnée", () => {
		const result = parse({ filter_createdBefore: "2026-07-15" });
		expect(result.success).toBe(true);
		if (result.success) {
			const dayStart = new Date("2026-07-15").getTime();
			expect(result.data.createdBefore!.getTime()).toBe(dayStart + 24 * 60 * 60 * 1000 - 1);
		}
	});

	it("un montant décimal est arrondi au centime au lieu d'être rejeté", () => {
		const result = parse({ filter_totalMin: "10.005" });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.totalMin).toBe(1001);
	});

	it("un showDeleted inconnu retombe sur 'active'", () => {
		const result = parse({ filter_showDeleted: "bogus" });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.showDeleted).toBe("active");
	});
});
