/**
 * @regression amount-filter-unit-contract
 *
 * Audit « Admin commandes » 2026-07-26 (P0-2). La feuille de filtres desktop portait
 * `MAX_PRICE = 500_000` commenté « 5 000€ in cents », mais les inputs sont en EUROS et
 * `parseFilters` multiplie par 100. Elle écrivait par ailleurs **les deux bornes** dès
 * que l'une divergeait du défaut. Conséquence : saisir « Min = 50 » émettait
 * `filter_totalMax=500000` → 50 000 000 centimes → 5× le plafond de
 * `orderFiltersSchema` → `getOrders` throw → error boundary. **Le filtre de montant
 * faisait planter la liste.**
 *
 * Ce test verrouille la chaîne complète URL → `parseFilters` → `orderFiltersSchema`
 * (le vrai contrat), plutôt que le rendu de la feuille : le harnais de
 * `orders-filter-sheet.test.tsx` remplace `useAppForm` par un mock, donc un test de
 * rendu n'observerait pas la conversion d'unité réelle.
 */
import { describe, it, expect } from "vitest";

import {
	ORDER_TOTAL_FILTER_MAX_CENTS,
	ORDER_TOTAL_FILTER_MAX_EUROS,
} from "@/modules/orders/constants/order.constants";
import { orderFiltersSchema } from "@/modules/orders/schemas/order.schemas";
import { parseFilters } from "../params";

type Params = Record<string, string | string[] | undefined>;

/** Reproduit la chaîne serveur : searchParams → parseFilters → validation Zod. */
function validateUrl(params: Params) {
	return orderFiltersSchema.safeParse(parseFilters(params as never));
}

describe("@regression amount-filter-unit-contract", () => {
	it("le plafond en euros exposé à l'UI tient dans le plafond en centimes du schéma", () => {
		expect(ORDER_TOTAL_FILTER_MAX_EUROS * 100).toBeLessThanOrEqual(ORDER_TOTAL_FILTER_MAX_CENTS);
	});

	it("le plafond du filtre, poussé dans l'URL, passe la validation", () => {
		// C'est le scénario exact qui plantait : la borne max par défaut sérialisée.
		const result = validateUrl({
			filter_totalMin: "0",
			filter_totalMax: String(ORDER_TOTAL_FILTER_MAX_EUROS),
		});
		expect(result.success).toBe(true);
	});

	it("« Min seul » est valide et ne fabrique aucun plafond", () => {
		const result = validateUrl({ filter_totalMin: "50" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.totalMin).toBe(5000); // 50 € → centimes
			expect(result.data.totalMax).toBeUndefined();
		}
	});

	it("« Max seul » est valide", () => {
		const result = validateUrl({ filter_totalMax: "200" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.totalMax).toBe(20000);
			expect(result.data.totalMin).toBeUndefined();
		}
	});

	it("une fourchette complète est convertie en centimes", () => {
		const result = validateUrl({ filter_totalMin: "50", filter_totalMax: "200" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.totalMin).toBe(5000);
			expect(result.data.totalMax).toBe(20000);
		}
	});

	it("un montant au-delà du plafond est ignoré, jamais propagé (cf. fail-safe)", () => {
		// `parseFilters` étant fail-safe (cf. filters-fail-safe.regression.test.ts), la
		// borne hors plafond est abandonnée : la validation passe avec le filtre absent,
		// au lieu d'échouer et de faire throw `getOrders`.
		const beyond = String(ORDER_TOTAL_FILTER_MAX_EUROS + 1);
		const result = validateUrl({ filter_totalMax: beyond });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.totalMax).toBeUndefined();
	});
});
