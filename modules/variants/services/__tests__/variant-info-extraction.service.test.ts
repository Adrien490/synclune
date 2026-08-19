import { describe, expect, it } from "vitest";
import { extractVariantInfo, requiresSizeSelection } from "../variant-info-extraction.service";

type TestVariant = {
	id: string;
	active: boolean;
	stock: number;
	priceCents: number | null;
	size: string | null;
	color: { id: string; name: string; hex: string | null } | null;
	material: { id: string; name: string } | null;
};

function variant(overrides: Partial<TestVariant> & { id: string }): TestVariant {
	return {
		active: true,
		stock: 1,
		priceCents: null,
		size: null,
		color: null,
		material: null,
		...overrides,
	};
}

describe("extractVariantInfo", () => {
	it("ignore les variantes inactives", () => {
		const info = extractVariantInfo({
			priceCents: 1000,
			variants: [
				variant({ id: "v1", active: false, color: { id: "c1", name: "Rose", hex: "#f0f" } }),
			],
		});

		expect(info.availableColors).toEqual([]);
		expect(info.totalStock).toBe(0);
	});

	it("agrège couleurs, matériaux et tailles avec leurs compteurs", () => {
		const info = extractVariantInfo({
			priceCents: 1000,
			variants: [
				variant({
					id: "v1",
					color: { id: "c1", name: "Or rose", hex: "#f4c2c2" },
					material: { id: "m1", name: "Acier" },
					size: "52",
				}),
				variant({
					id: "v2",
					color: { id: "c1", name: "Or rose", hex: "#f4c2c2" },
					size: "54",
				}),
			],
		});

		expect(info.availableColors).toEqual([
			{ id: "or-rose", slug: "or-rose", hex: "#f4c2c2", name: "Or rose", availableVariants: 2 },
		]);
		expect(info.availableMaterials).toEqual([{ name: "Acier", availableVariants: 1 }]);
		expect(info.availableSizes).toEqual([
			{ size: "52", availableVariants: 1 },
			{ size: "54", availableVariants: 1 },
		]);
	});

	/**
	 * Fallback métier : une variante SANS couleur mais AVEC matériau expose le
	 * matériau comme « couleur » — c'est l'identité de pastille du sélecteur.
	 */
	it("expose le matériau comme couleur quand la variante n'a pas de couleur", () => {
		const info = extractVariantInfo({
			priceCents: 1000,
			variants: [variant({ id: "v1", material: { id: "m1", name: "Acier doré" } })],
		});

		expect(info.availableColors).toEqual([
			{
				id: "acier-dore",
				slug: "acier-dore",
				hex: undefined,
				name: "Acier doré",
				availableVariants: 1,
			},
		]);
	});

	/** Le prix effectif est `variant.priceCents ?? product.priceCents`. */
	it("calcule le priceRange sur les prix EFFECTIFS (override ou prix produit)", () => {
		const info = extractVariantInfo({
			priceCents: 1500,
			variants: [variant({ id: "v1", priceCents: null }), variant({ id: "v2", priceCents: 2500 })],
		});

		expect(info.priceRange).toEqual({ min: 1500, max: 2500 });
	});

	it("retourne un priceRange à zéro sans variante active", () => {
		const info = extractVariantInfo({ priceCents: 1500, variants: [] });
		expect(info.priceRange).toEqual({ min: 0, max: 0 });
	});
});

describe("requiresSizeSelection", () => {
	it("exige la taille pour un produit multi-variantes à tailles fixes", () => {
		const product = {
			priceCents: 1000,
			variants: [variant({ id: "v1", size: "52" }), variant({ id: "v2", size: "54" })],
		};
		expect(requiresSizeSelection(product)).toBe(true);
	});

	it("n'exige rien quand les tailles sont « ajustables »", () => {
		const product = {
			priceCents: 1000,
			variants: [
				variant({ id: "v1", size: "Ajustable" }),
				variant({ id: "v2", size: "Ajustable" }),
			],
		};
		expect(requiresSizeSelection(product)).toBe(false);
	});

	it("n'exige rien pour un produit mono-variante", () => {
		const product = { priceCents: 1000, variants: [variant({ id: "v1", size: "52" })] };
		expect(requiresSizeSelection(product)).toBe(false);
	});
});
