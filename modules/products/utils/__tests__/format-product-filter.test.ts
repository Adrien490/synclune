import { describe, it, expect } from "vitest";
import { createProductFilterFormatter } from "../format-product-filter";

// ============================================================================
// Helpers
// ============================================================================

function makeSearchParams(params: Record<string, string> = {}) {
	return new URLSearchParams(params) as never;
}

function filter(key: string, value: string) {
	return { key, value } as never;
}

const colors = [
	{ slug: "rose", name: "Rose" },
	{ slug: "or", name: "Or" },
] as never[];

const materials = [
	{ slug: "argent", name: "Argent 925" },
	{ slug: "or-rose", name: "Or Rose" },
] as never[];

const productTypes = [
	{ slug: "bague", label: "Bague" },
	{ slug: "collier", label: "Collier" },
];

// ============================================================================
// createProductFilterFormatter
// ============================================================================

describe("createProductFilterFormatter", () => {
	it("formats priceMin filter as euro range", () => {
		const format = createProductFilterFormatter(
			colors,
			materials,
			productTypes,
			makeSearchParams({ priceMin: "10", priceMax: "50" }),
		);
		const result = format(filter("priceMin", "10"));

		expect(result).toHaveProperty("label", "Prix");
		expect(result!.displayValue).toContain("10");
		expect(result!.displayValue).toContain("50");
	});

	it("formats priceMin alone as an open range — never a hardcoded ceiling", () => {
		// L'ancien repli affichait « 20 € - 200 € » avec un plafond écrit en dur,
		// faux dès que le catalogue plafonne ailleurs (100 € aujourd'hui).
		const format = createProductFilterFormatter(
			colors,
			materials,
			productTypes,
			makeSearchParams({ priceMin: "20" }),
		);
		const result = format(filter("priceMin", "20"));

		expect(result!.displayValue).toContain("à partir de");
		expect(result!.displayValue).toContain("20");
		expect(result!.displayValue).not.toContain("200");
	});

	it("hides priceMax when priceMin carries the pair", () => {
		const format = createProductFilterFormatter(
			colors,
			materials,
			productTypes,
			makeSearchParams({ priceMin: "10", priceMax: "50" }),
		);
		const result = format(filter("priceMax", "50"));

		expect(result).toBeNull();
	});

	it("formats priceMax alone as « jusqu'à Y € » (upper bound only, min at default)", () => {
		// Glisser uniquement la poignée droite laisse la borne basse au défaut,
		// donc hors URL : priceMax est alors l'unique trace du filtre de prix.
		const format = createProductFilterFormatter(
			colors,
			materials,
			productTypes,
			makeSearchParams({ priceMax: "50" }),
		);
		const result = format(filter("priceMax", "50"));

		expect(result).toHaveProperty("label", "Prix");
		expect(result!.displayValue).toContain("jusqu'à");
		expect(result!.displayValue).toContain("50");
	});

	it("maps color slug to name", () => {
		const format = createProductFilterFormatter(
			colors,
			materials,
			productTypes,
			makeSearchParams(),
		);
		const result = format(filter("color", "rose"));

		expect(result).toEqual({ label: "Couleur", displayValue: "Rose" });
	});

	it("maps material slug to name", () => {
		const format = createProductFilterFormatter(
			colors,
			materials,
			productTypes,
			makeSearchParams(),
		);
		const result = format(filter("material", "argent"));

		expect(result).toEqual({ label: "Mat\u00e9riau", displayValue: "Argent 925" });
	});

	it("maps product type slug to label", () => {
		const format = createProductFilterFormatter(
			colors,
			materials,
			productTypes,
			makeSearchParams(),
		);
		const result = format(filter("type", "bague"));

		expect(result).toEqual({ label: "Type", displayValue: "Bague" });
	});

	it("falls back to raw value for unknown slug", () => {
		const format = createProductFilterFormatter(
			colors,
			materials,
			productTypes,
			makeSearchParams(),
		);
		const result = format(filter("color", "unknown-slug"));

		expect(result).toEqual({ label: "Couleur", displayValue: "unknown-slug" });
	});

	it("formats stockStatus with its REAL url token — never leaks it as a value", () => {
		// La valeur d'URL est `in_stock`, pas `true` : l'ancienne branche
		// « booléenne » ne matchait que "true" et le bandeau affichait
		// « En stock : in_stock » à la cliente (audit rail 2026-08-05, P2).
		// L'ancien test passait avec "true" — vert pour la mauvaise raison.
		const format = createProductFilterFormatter(
			colors,
			materials,
			productTypes,
			makeSearchParams(),
		);

		expect(format(filter("stockStatus", "in_stock"))).toEqual({
			label: "En stock",
			displayValue: "",
		});
		expect(format(filter("stockStatus", "true"))).toEqual({
			label: "En stock",
			displayValue: "",
		});
	});

	it("formats search filter with quoted value", () => {
		const format = createProductFilterFormatter(
			colors,
			materials,
			productTypes,
			makeSearchParams(),
		);
		const result = format(filter("search", "bague or"));

		expect(result).toEqual({ label: "Recherche", displayValue: '"bague or"' });
	});

	it("formats onSale boolean filter", () => {
		const format = createProductFilterFormatter(
			colors,
			materials,
			productTypes,
			makeSearchParams(),
		);
		const result = format(filter("onSale", "true"));

		expect(result).toEqual({ label: "En promotion", displayValue: "" });
	});
});
