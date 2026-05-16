import { describe, expect, it } from "vitest";

import { getSkuDisplayTitle } from "../sku-display-title";

const orRose = { color: { name: "Or rose" } };
const argent = { color: { name: "Argent" } };
const verre = { material: { name: "Verre" } };
const acier = { material: { name: "Acier" } };

describe("getSkuDisplayTitle", () => {
	it("joint couleur · matériau · taille dans l'ordre", () => {
		expect(
			getSkuDisplayTitle({
				colors: [orRose, argent],
				materials: [verre],
				size: "52mm",
			}),
		).toBe("Or rose + Argent · Verre · 52mm");
	});

	it("omet les attributs vides", () => {
		expect(getSkuDisplayTitle({ colors: [orRose], size: null })).toBe("Or rose");
		expect(getSkuDisplayTitle({ materials: [acier] })).toBe("Acier");
		expect(getSkuDisplayTitle({ size: "M" })).toBe("M");
	});

	it("trim la taille", () => {
		expect(getSkuDisplayTitle({ size: "  52mm  " })).toBe("52mm");
	});

	it("retourne 'Variante principale' si aucun attribut et isDefault", () => {
		expect(getSkuDisplayTitle({ isDefault: true })).toBe("Variante principale");
		expect(getSkuDisplayTitle({ colors: [], materials: [], size: "", isDefault: true })).toBe(
			"Variante principale",
		);
	});

	it("retourne 'Variante sans attribut' si aucun attribut et !isDefault", () => {
		expect(getSkuDisplayTitle({})).toBe("Variante sans attribut");
		expect(getSkuDisplayTitle({ isDefault: false })).toBe("Variante sans attribut");
	});
});
