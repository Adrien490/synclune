import { describe, expect, it } from "vitest";

import { getSkuDisplayTitle, getSkuDisplayTitleSpoken } from "../sku-display-title";

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

	it("retourne 'Variante principale' si aucun attribut et isRepresentative", () => {
		expect(getSkuDisplayTitle({ isRepresentative: true })).toBe("Variante principale");
		expect(
			getSkuDisplayTitle({ colors: [], materials: [], size: "", isRepresentative: true }),
		).toBe("Variante principale");
	});

	it("retourne 'Variante sans attribut' si aucun attribut et !isRepresentative", () => {
		expect(getSkuDisplayTitle({})).toBe("Variante sans attribut");
		expect(getSkuDisplayTitle({ isRepresentative: false })).toBe("Variante sans attribut");
	});

	it("ignore les couleurs avec name vide (DB défensive)", () => {
		expect(getSkuDisplayTitle({ colors: [{ color: { name: "" } }], size: "52mm" })).toBe("52mm");
	});
});

describe("getSkuDisplayTitleSpoken", () => {
	it("remplace ' · ' par ', ' entre dimensions", () => {
		expect(getSkuDisplayTitleSpoken({ colors: [orRose], materials: [verre], size: "52mm" })).toBe(
			"Or rose, Verre, 52mm",
		);
	});

	it("remplace ' + ' par ' et ' entre couleurs bicolores", () => {
		expect(getSkuDisplayTitleSpoken({ colors: [orRose, argent] })).toBe("Or rose et Argent");
	});

	it("combine les deux substitutions", () => {
		expect(
			getSkuDisplayTitleSpoken({
				colors: [orRose, argent],
				materials: [verre, acier],
				size: "52mm",
			}),
		).toBe("Or rose et Argent, Verre, Acier, 52mm");
	});

	it("retourne le fallback isRepresentative tel quel", () => {
		expect(getSkuDisplayTitleSpoken({ isRepresentative: true })).toBe("Variante principale");
	});
});
