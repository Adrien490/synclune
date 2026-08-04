/**
 * @regression order-filters-multi-select-not-truncated
 *
 * Les 4 filtres d'énumération de la liste des commandes (`status`, `paymentStatus`,
 * `status`, `invoiceStatus`) sont MULTI-SÉLECTION :
 *  - `orders-filter-sheet.tsx` écrit `params.append(...)` une fois par case cochée ;
 *  - `orderFiltersSchema` les type `T | T[]` ;
 *  - `buildOrderWhereClause` génère `{ in: [...] }` pour un tableau.
 *
 * Mais `parseFilters` lisait `getFirstParam(value)` : **toutes les valeurs après la
 * première étaient silencieusement ignorées**. Cocher « Payée » + « Partiellement
 * remboursée » filtrait sur « Payée » seule, et aucun lien profond ne pouvait
 * exprimer la file « à expédier » (`ORDERS_TO_SHIP_HREF`).
 *
 * Toute modification requiert une review explicite.
 */
import { describe, expect, it } from "vitest";
import { parseFilters } from "../params";
import type { OrdersSearchParams } from "../../page";

function parse(params: Record<string, string | string[]>) {
	return parseFilters(params as OrdersSearchParams);
}

describe("@regression order-filters-multi-select-not-truncated", () => {
	it("conserve TOUTES les valeurs d'un filtre répété (paymentStatus)", () => {
		const filters = parse({ filter_paymentStatus: ["PAID", "PARTIALLY_REFUNDED"] });
		expect(filters?.paymentStatus).toEqual(["PAID", "PARTIALLY_REFUNDED"]);
	});

	it("conserve TOUTES les valeurs d'un filtre répété (status)", () => {
		const filters = parse({ filter_status: ["PENDING", "PROCESSING"] });
		expect(filters?.status).toEqual(["PENDING", "PROCESSING"]);
	});

	it("conserve TOUTES les valeurs pour status et invoiceStatus", () => {
		const filters = parse({
			filter_status: ["PENDING", "PROCESSING", "SHIPPED"],
			filter_invoiceStatus: ["GENERATED", "VOIDED"],
		});
		expect(filters?.status).toEqual(["PENDING", "PROCESSING", "SHIPPED"]);
		expect(filters?.invoiceStatus).toEqual(["GENERATED", "VOIDED"]);
	});

	it("normalise une valeur unique en tableau à un élément (accepté par le schéma)", () => {
		const filters = parse({ filter_status: "PROCESSING" });
		expect(filters?.status).toEqual(["PROCESSING"]);
	});

	it("laisse le filtre indéfini quand le paramètre est absent", () => {
		const filters = parse({});
		expect(filters?.status).toBeUndefined();
		expect(filters?.paymentStatus).toBeUndefined();
		expect(filters?.status).toBeUndefined();
		expect(filters?.invoiceStatus).toBeUndefined();
	});

	it("ignore les valeurs vides (case décochée → param vide)", () => {
		const filters = parse({ filter_paymentStatus: "" });
		expect(filters?.paymentStatus).toBeUndefined();
	});

	it("les presets booléens restent scalaires (non affectés par le multi-valeur)", () => {
		const filters = parse({ filter_invoiceAnomaly: "true", filter_pdfNotArchived: "1" });
		expect(filters?.invoiceAnomaly).toBe(true);
		expect(filters?.pdfNotArchived).toBe(true);
	});

	it("le lien profond « à expédier » est parsé en deux filtres multi-valeurs", () => {
		// Miroir exact de ORDERS_TO_SHIP_HREF, sans importer prisma dans ce test.
		// `PENDING` remplace `UNFULFILLED` : axe unique depuis le Lot 4 (audit V2).
		const filters = parse({
			filter_paymentStatus: ["PAID", "PARTIALLY_REFUNDED"],
			filter_status: ["PENDING", "PROCESSING"],
		});

		expect(filters?.paymentStatus).toEqual(["PAID", "PARTIALLY_REFUNDED"]);
		expect(filters?.status).toEqual(["PENDING", "PROCESSING"]);
	});
});
