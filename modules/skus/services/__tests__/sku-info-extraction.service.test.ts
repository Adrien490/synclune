import { describe, it, expect, vi } from "vitest";

vi.mock("@/shared/utils/generate-slug", () => ({
	slugify: (str: string) => str.toLowerCase().replace(/\s+/g, "-"),
}));

import type { BaseProductSku } from "@/shared/types/product-sku.types";
import {
	buildComboKey,
	extractColorCombos,
	extractVariantInfo,
} from "../sku-info-extraction.service";

function makeSku(overrides: Partial<BaseProductSku> = {}): BaseProductSku {
	return {
		id: "sku-1",
		sku: "SKU-001",
		isActive: true,
		position: 0,
		inventory: 5,
		priceInclTax: 2000,
		compareAtPrice: null,
		size: null,
		colors: [
			{
				colorId: "color-1",
				position: 0,
				color: {
					id: "color-1",
					slug: "or-rose",
					hex: "#B76E79",
					name: "Or Rose",
				},
			},
		],
		materials: [
			{
				materialId: "mat-1",
				position: 0,
				material: {
					id: "mat-1",
					name: "Argent 925",
				},
			},
		],
		images: [],
		...overrides,
	};
}

describe("extractVariantInfo", () => {
	it("should extract colors from active SKUs", () => {
		const product = {
			skus: [
				makeSku({
					colors: [
						{
							colorId: "c1",
							position: 0,
							color: { id: "c1", slug: "or-rose", hex: "#B76E79", name: "Or Rose" },
						},
					],
				}),
				makeSku({
					id: "sku-2",
					colors: [
						{
							colorId: "c2",
							position: 0,
							color: { id: "c2", slug: "argent", hex: "#C0C0C0", name: "Argent" },
						},
					],
				}),
			],
		};

		const info = extractVariantInfo(product);

		expect(info.availableColors).toHaveLength(2);
		expect(info.availableColors).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: "Or Rose", slug: "or-rose" }),
				expect.objectContaining({ name: "Argent", slug: "argent" }),
			]),
		);
	});

	it("should extract materials from active SKUs", () => {
		const product = {
			skus: [
				makeSku({
					materials: [
						{ materialId: "m1", position: 0, material: { id: "m1", name: "Argent 925" } },
					],
				}),
				makeSku({
					id: "sku-2",
					materials: [{ materialId: "m2", position: 0, material: { id: "m2", name: "Or 18K" } }],
				}),
			],
		};

		const info = extractVariantInfo(product);

		expect(info.availableMaterials).toHaveLength(2);
		expect(info.availableMaterials).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: "Argent 925" }),
				expect.objectContaining({ name: "Or 18K" }),
			]),
		);
	});

	it("should extract sizes from active SKUs", () => {
		const product = {
			skus: [
				makeSku({ size: "S" }),
				makeSku({ id: "sku-2", size: "M" }),
				makeSku({ id: "sku-3", size: null }),
			],
		};

		const info = extractVariantInfo(product);

		expect(info.availableSizes).toHaveLength(2);
		expect(info.availableSizes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ size: "S" }),
				expect.objectContaining({ size: "M" }),
			]),
		);
	});

	it("should compute price range correctly", () => {
		const product = {
			skus: [
				makeSku({ priceInclTax: 1500 }),
				makeSku({ id: "sku-2", priceInclTax: 3000 }),
				makeSku({ id: "sku-3", priceInclTax: 2000 }),
			],
		};

		const info = extractVariantInfo(product);

		expect(info.priceRange.min).toBe(1500);
		expect(info.priceRange.max).toBe(3000);
	});

	it("should return 0 for price range when no active SKUs", () => {
		const product = {
			skus: [makeSku({ isActive: false })],
		};

		const info = extractVariantInfo(product);

		expect(info.priceRange.min).toBe(0);
		expect(info.priceRange.max).toBe(0);
	});

	it("should compute total stock from active SKUs only", () => {
		const product = {
			skus: [
				makeSku({ inventory: 3 }),
				makeSku({ id: "sku-2", inventory: 7 }),
				makeSku({ id: "sku-3", isActive: false, inventory: 100 }),
			],
		};

		const info = extractVariantInfo(product);

		expect(info.totalStock).toBe(10);
	});

	it("should handle product with no SKUs", () => {
		const info = extractVariantInfo({ skus: null });

		expect(info.availableColors).toEqual([]);
		expect(info.availableMaterials).toEqual([]);
		expect(info.availableSizes).toEqual([]);
		expect(info.priceRange).toEqual({ min: 0, max: 0 });
		expect(info.totalStock).toBe(0);
	});

	it("should expose only the primary material when SKU has multi-materials but no colors", () => {
		const product = {
			skus: [
				makeSku({
					colors: [],
					materials: [
						{ materialId: "m1", position: 0, material: { id: "m1", name: "Argent 925" } },
						{ materialId: "m2", position: 1, material: { id: "m2", name: "Or 18K" } },
					],
				}),
			],
		};

		const info = extractVariantInfo(product);

		// Le fallback expose UNIQUEMENT le matériau principal (position=0) comme couleur
		expect(info.availableColors).toHaveLength(1);
		expect(info.availableColors[0]!.name).toBe("Argent 925");
		// Les deux matériaux restent visibles dans le sélecteur matériau séparé
		expect(info.availableMaterials).toHaveLength(2);
	});

	it("should use material name as color fallback when no color is set", () => {
		const product = {
			skus: [
				makeSku({
					colors: [],
					materials: [{ materialId: "m1", position: 0, material: { id: "m1", name: "Or 18K" } }],
				}),
			],
		};

		const info = extractVariantInfo(product);

		expect(info.availableColors).toHaveLength(1);
		expect(info.availableColors[0]!.name).toBe("Or 18K");
		expect(info.availableColors[0]!.slug).toBe("or-18k");
	});

	it("should expose availableCombos for mono-color SKUs", () => {
		const product = {
			skus: [
				makeSku({
					colors: [
						{
							colorId: "c1",
							position: 0,
							color: { id: "c1", slug: "or-rose", hex: "#B76E79", name: "Or Rose" },
						},
					],
				}),
			],
		};

		const info = extractVariantInfo(product);
		expect(info.availableCombos).toHaveLength(1);
		expect(info.availableCombos[0]).toMatchObject({
			comboKey: "or-rose",
			label: "Or Rose",
			ariaLabel: "Or Rose",
			hexes: ["#B76E79"],
			inStock: true,
			skuCount: 1,
		});
	});

	it("should count availableSkus per color", () => {
		const product = {
			skus: [
				makeSku({
					id: "sku-1",
					colors: [
						{
							colorId: "c1",
							position: 0,
							color: { id: "c1", slug: "or-rose", hex: "#B76E79", name: "Or Rose" },
						},
					],
				}),
				makeSku({
					id: "sku-2",
					colors: [
						{
							colorId: "c1",
							position: 0,
							color: { id: "c1", slug: "or-rose", hex: "#B76E79", name: "Or Rose" },
						},
					],
					size: "M",
				}),
				makeSku({
					id: "sku-3",
					colors: [
						{
							colorId: "c2",
							position: 0,
							color: { id: "c2", slug: "argent", hex: "#C0C0C0", name: "Argent" },
						},
					],
				}),
			],
		};

		const info = extractVariantInfo(product);

		const orRose = info.availableColors.find((c) => c.name === "Or Rose");
		const argent = info.availableColors.find((c) => c.name === "Argent");

		expect(orRose?.availableSkus).toBe(2);
		expect(argent?.availableSkus).toBe(1);
	});
});

describe("buildComboKey", () => {
	it("should be order-independent", () => {
		expect(buildComboKey(["or-rose", "argent"])).toBe(buildComboKey(["argent", "or-rose"]));
	});

	it("should sort slugs alphabetically", () => {
		expect(buildComboKey(["or-rose", "argent", "or-blanc"])).toBe("argent__or-blanc__or-rose");
	});

	it("should handle a single slug", () => {
		expect(buildComboKey(["or-rose"])).toBe("or-rose");
	});
});

describe("extractColorCombos", () => {
	const orRose = {
		colorId: "c1",
		position: 0,
		color: { id: "c1", slug: "or-rose", hex: "#B76E79", name: "Or Rose" },
	};
	const argent = {
		colorId: "c2",
		position: 1,
		color: { id: "c2", slug: "argent", hex: "#C0C0C0", name: "Argent" },
	};
	const orBlanc = {
		colorId: "c3",
		position: 2,
		color: { id: "c3", slug: "or-blanc", hex: "#FAFAFA", name: "Or Blanc" },
	};

	it("returns a single combo for a mono-color SKU", () => {
		const combos = extractColorCombos({ skus: [makeSku({ colors: [orRose] })] });
		expect(combos).toHaveLength(1);
		expect(combos[0]).toMatchObject({
			comboKey: "or-rose",
			hexes: ["#B76E79"],
			names: ["Or Rose"],
			label: "Or Rose",
			inStock: true,
			skuCount: 1,
		});
	});

	it("preserves position order for the bi-color combo (1ère = principale)", () => {
		const combos = extractColorCombos({
			skus: [
				makeSku({
					colors: [
						{ ...orRose, position: 0 },
						{ ...argent, position: 1 },
					],
				}),
			],
		});
		expect(combos).toHaveLength(1);
		expect(combos[0]?.comboKey).toBe("argent__or-rose"); // clé triée alpha
		expect(combos[0]?.hexes).toEqual(["#B76E79", "#C0C0C0"]); // rendu : position 0 d'abord
		expect(combos[0]?.label).toBe("Or Rose + Argent");
		expect(combos[0]?.ariaLabel).toBe("Or Rose et Argent");
	});

	it("deduplicates SKUs sharing the same combo (set-equality)", () => {
		const product = {
			skus: [
				makeSku({
					id: "sku-1",
					colors: [
						{ ...orRose, position: 0 },
						{ ...argent, position: 1 },
					],
					inventory: 0,
				}),
				makeSku({
					id: "sku-2",
					// Même paire, ordre inversé en source — la dédup doit fusionner
					colors: [
						{ ...argent, position: 0 },
						{ ...orRose, position: 1 },
					],
					inventory: 4,
				}),
			],
		};
		const combos = extractColorCombos(product);
		expect(combos).toHaveLength(1);
		expect(combos[0]?.skuCount).toBe(2);
		expect(combos[0]?.inStock).toBe(true); // OR(false, true)
	});

	it("returns distinct combos when slugs differ", () => {
		const product = {
			skus: [
				makeSku({ id: "sku-1", colors: [orRose] }),
				makeSku({ id: "sku-2", colors: [argent] }),
				makeSku({
					id: "sku-3",
					colors: [
						{ ...orRose, position: 0 },
						{ ...argent, position: 1 },
					],
				}),
			],
		};
		const combos = extractColorCombos(product);
		expect(combos).toHaveLength(3);
		const keys = combos.map((c) => c.comboKey).sort();
		expect(keys).toEqual(["argent", "argent__or-rose", "or-rose"]);
	});

	it("supports tri-color combos", () => {
		const combos = extractColorCombos({
			skus: [
				makeSku({
					colors: [
						{ ...orRose, position: 0 },
						{ ...argent, position: 1 },
						{ ...orBlanc, position: 2 },
					],
				}),
			],
		});
		expect(combos).toHaveLength(1);
		expect(combos[0]?.hexes).toEqual(["#B76E79", "#C0C0C0", "#FAFAFA"]);
		expect(combos[0]?.label).toBe("Or Rose + Argent + Or Blanc");
		expect(combos[0]?.ariaLabel).toBe("Or Rose, Argent et Or Blanc");
	});

	it("skips SKUs without colors", () => {
		const combos = extractColorCombos({ skus: [makeSku({ colors: [] })] });
		expect(combos).toEqual([]);
	});

	it("ignores inactive SKUs", () => {
		const combos = extractColorCombos({
			skus: [makeSku({ isActive: false, colors: [orRose] })],
		});
		expect(combos).toEqual([]);
	});

	it("inStock is false when all SKUs of a combo are out of stock", () => {
		const combos = extractColorCombos({
			skus: [makeSku({ colors: [orRose], inventory: 0 })],
		});
		expect(combos[0]?.inStock).toBe(false);
	});
});
