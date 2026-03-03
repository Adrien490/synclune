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
	it("formats rating filter with stars", () => {
		const format = createProductFilterFormatter(
			colors,
			materials,
			productTypes,
			makeSearchParams(),
		);
		const result = format(filter("rating", "4"));

		expect(result).toEqual({ label: "Notes", displayValue: "4+ \u2605" });
	});

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

	it("uses default priceMax of 200 when not in searchParams", () => {
		const format = createProductFilterFormatter(
			colors,
			materials,
			productTypes,
			makeSearchParams({ priceMin: "20" }),
		);
		const result = format(filter("priceMin", "20"));

		expect(result!.displayValue).toContain("200");
	});

	it("returns null for priceMax key (hidden)", () => {
		const format = createProductFilterFormatter(
			colors,
			materials,
			productTypes,
			makeSearchParams(),
		);
		const result = format(filter("priceMax", "50"));

		expect(result).toBeNull();
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

	it("formats stockStatus boolean filter with empty displayValue", () => {
		const format = createProductFilterFormatter(
			colors,
			materials,
			productTypes,
			makeSearchParams(),
		);
		const result = format(filter("stockStatus", "true"));

		expect(result).toEqual({ label: "En stock", displayValue: "" });
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
