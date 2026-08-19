import { describe, expect, it } from "vitest";
import {
	buildVariantLabel,
	getAttributeLabel,
	getColorHexes,
	getColorNames,
	getVariantDisplayTitle,
	getVariantDisplayTitleSpoken,
} from "../variant-labels";

describe("getAttributeLabel", () => {
	it("retourne le nom, ou null si absent", () => {
		expect(getAttributeLabel({ name: "Acier" })).toBe("Acier");
		expect(getAttributeLabel(null)).toBeNull();
		expect(getAttributeLabel(undefined)).toBeNull();
	});
});

describe("getColorNames / getColorHexes", () => {
	it("adaptent la FK unique en tableau (0 ou 1 élément)", () => {
		expect(getColorNames({ name: "Or rose", hex: "#f4c2c2" })).toEqual(["Or rose"]);
		expect(getColorNames(null)).toEqual([]);
		expect(getColorHexes({ name: "Or rose", hex: "#f4c2c2" })).toEqual(["#f4c2c2"]);
		expect(getColorHexes({ name: "Sans hex", hex: null })).toEqual([]);
	});
});

describe("getVariantDisplayTitle", () => {
	it("joint les attributs non vides par « · »", () => {
		expect(
			getVariantDisplayTitle({
				color: { name: "Or rose" },
				material: { name: "Acier" },
				size: "M",
			}),
		).toBe("Or rose · Acier · M");
	});

	it("ignore les attributs vides ou blancs", () => {
		expect(getVariantDisplayTitle({ color: { name: "  " }, size: " 52 " })).toBe("52");
	});

	it("nomme le représentant sans attribut « Variante principale »", () => {
		expect(getVariantDisplayTitle({ isRepresentative: true })).toBe("Variante principale");
		expect(getVariantDisplayTitle({})).toBe("Variante sans attribut");
	});
});

describe("getVariantDisplayTitleSpoken", () => {
	it("remplace le séparateur visuel par une virgule (aria-label)", () => {
		expect(getVariantDisplayTitleSpoken({ color: { name: "Or rose" }, size: "M" })).toBe(
			"Or rose, M",
		);
	});
});

describe("buildVariantLabel", () => {
	it("retourne une chaîne vide sans attribut (le repli appartient au titre)", () => {
		expect(buildVariantLabel({ color: null, material: null, size: null })).toBe("");
	});
});
