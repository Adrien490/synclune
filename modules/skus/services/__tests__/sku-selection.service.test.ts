import { describe, it, expect } from "vitest";

import type { BaseSkuForList } from "@/shared/types/product-sku.types";
import { getPrimarySkuForList, getStockInfoForList } from "../sku-selection.service";

function makeSku(overrides: Partial<BaseSkuForList> = {}): BaseSkuForList {
	return {
		isActive: true,
		// Rang éditorial : 0 = représentant (remplace isDefault, audit schéma V5).
		// Défaut 1 — chaque test pose explicitement son rang 0.
		position: 1,
		inventory: 5,
		priceInclTax: 2000,
		compareAtPrice: null,
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

// ============================================================================
// getPrimarySkuForList
// ============================================================================

describe("getPrimarySkuForList", () => {
	it("should return null when product has no SKUs", () => {
		expect(getPrimarySkuForList({ skus: null })).toBeNull();
		expect(getPrimarySkuForList({ skus: [] })).toBeNull();
		expect(getPrimarySkuForList({ skus: undefined })).toBeNull();
	});

	it("should return the representative SKU (rang 0) when available", () => {
		const skus = [
			makeSku({ position: 1, priceInclTax: 1000 }),
			makeSku({ position: 0, priceInclTax: 2000 }),
		];

		const result = getPrimarySkuForList({ skus });

		expect(result).toBe(skus[1]);
	});

	/**
	 * @regression default-sku-sold-out — audit ProductCard 2026-08-08.
	 * Le défaut épuisé primait sur une sœur en stock : la carte affichait le
	 * prix d'une variante inachetable (seul signal : la pastille barrée).
	 */
	it("should prefer an in-stock sibling over a sold-out representative SKU", () => {
		const skus = [
			makeSku({ position: 0, inventory: 0, priceInclTax: 2000 }),
			makeSku({ position: 1, inventory: 3, priceInclTax: 3000 }),
			makeSku({ position: 2, inventory: 5, priceInclTax: 2500 }),
		];

		const result = getPrimarySkuForList({ skus });

		// La sœur en stock la moins chère, pas le défaut épuisé
		expect(result).toBe(skus[2]);
	});

	it("should fall back to the sold-out representative SKU when nothing is in stock", () => {
		const skus = [makeSku({ position: 1, inventory: 0 }), makeSku({ position: 0, inventory: 0 })];

		const result = getPrimarySkuForList({ skus });

		// Épuisé pour épuisé, l'éditorial (rang 0) reste le meilleur représentant
		expect(result).toBe(skus[1]);
	});

	it("should prioritize preferred color over representative", () => {
		const skus = [
			makeSku({
				position: 0,
				colors: [
					{
						colorId: "c1",
						position: 0,
						color: { id: "c1", slug: "or-rose", hex: "#B76E79", name: "Or Rose" },
					},
				],
			}),
			makeSku({
				position: 1,
				colors: [
					{
						colorId: "c2",
						position: 0,
						color: { id: "c2", slug: "argent", hex: "#C0C0C0", name: "Argent" },
					},
				],
			}),
		];

		const result = getPrimarySkuForList({ skus }, { preferredColorSlug: "argent" });

		expect(result).toBe(skus[1]);
	});

	it("should return preferred color even if out of stock over representative", () => {
		const skus = [
			makeSku({
				position: 0,
				inventory: 10,
				colors: [
					{
						colorId: "c1",
						position: 0,
						color: { id: "c1", slug: "or-rose", hex: "#B76E79", name: "Or Rose" },
					},
				],
			}),
			makeSku({
				position: 1,
				inventory: 0,
				colors: [
					{
						colorId: "c2",
						position: 0,
						color: { id: "c2", slug: "argent", hex: "#C0C0C0", name: "Argent" },
					},
				],
			}),
		];

		const result = getPrimarySkuForList({ skus }, { preferredColorSlug: "argent" });

		expect(result).toBe(skus[1]);
	});

	it("should prefer in-stock SKU of preferred color over out-of-stock", () => {
		const skus = [
			makeSku({
				inventory: 0,
				colors: [
					{
						colorId: "c1",
						position: 0,
						color: { id: "c1", slug: "argent", hex: "#C0C0C0", name: "Argent" },
					},
				],
			}),
			makeSku({
				inventory: 3,
				colors: [
					{
						colorId: "c2",
						position: 0,
						color: { id: "c2", slug: "argent", hex: "#C0C0C0", name: "Argent" },
					},
				],
			}),
		];

		const result = getPrimarySkuForList({ skus }, { preferredColorSlug: "argent" });

		expect(result).toBe(skus[1]);
	});

	// « Aucun défaut » n'existe plus : il y a toujours un rang 0. Le cas équivalent
	// est un représentant épuisé — la sélection retombe sur la sœur en stock la
	// moins chère (priorité 4).
	it("should return cheapest in-stock sibling when the representative is sold out", () => {
		const skus = [
			makeSku({ position: 0, inventory: 0, priceInclTax: 3000 }),
			makeSku({ position: 1, inventory: 5, priceInclTax: 1500 }),
			makeSku({ position: 2, inventory: 5, priceInclTax: 2000 }),
		];

		const result = getPrimarySkuForList({ skus });

		expect(result).toBe(skus[1]);
	});

	it("should return first active SKU when all are out of stock", () => {
		const skus = [
			makeSku({ isActive: false, inventory: 0 }),
			makeSku({ isActive: true, inventory: 0 }),
		];

		const result = getPrimarySkuForList({ skus });

		expect(result).toBe(skus[1]);
	});

	it("should return first SKU as last resort", () => {
		const skus = [makeSku({ isActive: false, inventory: 0 })];

		const result = getPrimarySkuForList({ skus });

		expect(result).toBe(skus[0]);
	});
});

// ============================================================================
// getStockInfoForList
// ============================================================================

describe("getStockInfoForList", () => {
	it("should return out_of_stock when total inventory is 0", () => {
		const product = {
			skus: [makeSku({ inventory: 0 }), makeSku({ inventory: 0 })],
		};

		const info = getStockInfoForList(product);

		expect(info.status).toBe("out_of_stock");
		expect(info.totalInventory).toBe(0);
		expect(info.availableSkus).toBe(0);
		expect(info.message).toBe("Rupture de stock");
	});

	it("should return in_stock when inventory is available", () => {
		const product = {
			skus: [makeSku({ inventory: 3 }), makeSku({ inventory: 7 })],
		};

		const info = getStockInfoForList(product);

		expect(info.status).toBe("in_stock");
		expect(info.totalInventory).toBe(10);
		expect(info.availableSkus).toBe(2);
		expect(info.message).toBe("En stock");
	});

	it("should only count active SKUs", () => {
		const product = {
			skus: [
				makeSku({ isActive: true, inventory: 5 }),
				makeSku({ isActive: false, inventory: 10 }),
			],
		};

		const info = getStockInfoForList(product);

		expect(info.totalInventory).toBe(5);
		expect(info.availableSkus).toBe(1);
	});

	it("should handle product with no SKUs", () => {
		const info = getStockInfoForList({ skus: null });

		expect(info.status).toBe("out_of_stock");
		expect(info.totalInventory).toBe(0);
		expect(info.availableSkus).toBe(0);
	});
});
