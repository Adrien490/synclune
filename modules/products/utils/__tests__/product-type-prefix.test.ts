import { describe, expect, it } from "vitest";

import { prefixWithProductType } from "../product-type-prefix";

describe("prefixWithProductType", () => {
	it("rend le titre nu sans type", () => {
		expect(prefixWithProductType("Lune Céleste")).toBe("Lune Céleste");
		expect(prefixWithProductType("Lune Céleste", null)).toBe("Lune Céleste");
		expect(prefixWithProductType("Lune Céleste", "")).toBe("Lune Céleste");
	});

	it("préfixe quand le titre ne nomme pas son type", () => {
		expect(prefixWithProductType("Lune Céleste", "Colliers")).toBe("Colliers Lune Céleste");
	});

	// Le cas qui motive tout le helper : libellé au pluriel, titre au singulier.
	it.each([
		["Collier Lune Céleste", "Colliers"],
		["Bague Fleur de Cristal", "Bagues"],
		["Bracelet Jonc Torsadé", "Bracelets"],
		["Porte-Clés Cœur", "Porte-clés"],
		["Chaîne de Cheveux Bohème", "Chaînes de cheveux"],
		["Chaîne de Corps Bohème", "Chaînes de corps"],
		["Papilloux Cristal Fée", "Papilloux"],
	])("ne double pas le type : %s / %s", (title, productType) => {
		expect(prefixWithProductType(title, productType)).toBe(title);
	});

	it("compare sans tenir compte de la casse ni des accents", () => {
		expect(prefixWithProductType("CHAÎNE de corps Bohème", "chaines de corps")).toBe(
			"CHAÎNE de corps Bohème",
		);
	});

	// Un titre qui commence par un mot différent garde son préfixe : le helper
	// ne doit pas devenir un filtre qui avale des types légitimes.
	it("préfixe encore quand seul un mot ULTÉRIEUR reprend le type", () => {
		expect(prefixWithProductType("Duo de Colliers Lune", "Colliers")).toBe(
			"Colliers Duo de Colliers Lune",
		);
	});
});
