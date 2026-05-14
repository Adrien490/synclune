import { describe, expect, it } from "vitest";

import {
	getMaterialNames,
	getPrimaryMaterialName,
	getSkuMaterialsLabel,
} from "../sku-materials-label";

const verre = { material: { name: "Verre" } };
const acier = { material: { name: "Acier" } };
const argent = { material: { name: "Argent" } };

describe("getSkuMaterialsLabel", () => {
	it("retourne null si null/undefined", () => {
		expect(getSkuMaterialsLabel(null)).toBeNull();
		expect(getSkuMaterialsLabel(undefined)).toBeNull();
	});

	it("retourne null si tableau vide", () => {
		expect(getSkuMaterialsLabel([])).toBeNull();
	});

	it("joint les noms dans l'ordre fourni", () => {
		expect(getSkuMaterialsLabel([verre, acier])).toBe("Verre, Acier");
		expect(getSkuMaterialsLabel([acier, verre])).toBe("Acier, Verre");
	});

	it("retourne un seul nom sans virgule", () => {
		expect(getSkuMaterialsLabel([argent])).toBe("Argent");
	});

	it("supporte plus de 2 matériaux", () => {
		expect(getSkuMaterialsLabel([argent, verre, acier])).toBe("Argent, Verre, Acier");
	});
});

describe("getPrimaryMaterialName", () => {
	it("retourne null si null/undefined/vide", () => {
		expect(getPrimaryMaterialName(null)).toBeNull();
		expect(getPrimaryMaterialName(undefined)).toBeNull();
		expect(getPrimaryMaterialName([])).toBeNull();
	});

	it("retourne le 1er nom (= priorité)", () => {
		expect(getPrimaryMaterialName([verre, acier])).toBe("Verre");
		expect(getPrimaryMaterialName([acier, verre])).toBe("Acier");
	});
});

describe("getMaterialNames", () => {
	it("retourne [] si null/undefined/vide", () => {
		expect(getMaterialNames(null)).toEqual([]);
		expect(getMaterialNames(undefined)).toEqual([]);
		expect(getMaterialNames([])).toEqual([]);
	});

	it("préserve l'ordre", () => {
		expect(getMaterialNames([verre, acier])).toEqual(["Verre", "Acier"]);
	});
});
