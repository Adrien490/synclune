import { describe, it, expect } from "vitest";

import type { BaseSkuForList } from "@/shared/types/product-sku.types";
import { getPrimarySkuForList, getStockInfoForList } from "../sku-selection.service";

function makeSku(overrides: Partial<BaseSkuForList> = {}): BaseSkuForList {
	return {
		isActive: true,
		isDefault: false,
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

	it("should return the default SKU when available", () => {
		const skus = [
			makeSku({ isDefault: false, priceInclTax: 1000 }),
			makeSku({ isDefault: true, priceInclTax: 2000 }),
		];

		const result = getPrimarySkuForList({ skus });

		expect(result).toBe(skus[1]);
	});

	it("should prioritize preferred color over default", () => {
		const skus = [
			makeSku({
				isDefault: true,
				colors: [
					{
						colorId: "c1",
						position: 0,
						color: { id: "c1", slug: "or-rose", hex: "#B76E79", name: "Or Rose" },
					},
				],
			}),
			makeSku({
				isDefault: false,
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

	it("should return preferred color even if out of stock over default", () => {
		const skus = [
			makeSku({
				isDefault: true,
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
				isDefault: false,
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

	it("should return cheapest in-stock SKU when no default exists", () => {
		const skus = [
			makeSku({ isDefault: false, inventory: 5, priceInclTax: 3000 }),
			makeSku({ isDefault: false, inventory: 5, priceInclTax: 1500 }),
			makeSku({ isDefault: false, inventory: 5, priceInclTax: 2000 }),
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

	it("should prioritize on-sale in-stock SKU when preferOnSale is true", () => {
		const skus = [
			makeSku({ isDefault: true, inventory: 5, compareAtPrice: null }),
			makeSku({ isDefault: false, inventory: 3, compareAtPrice: 3000 }),
		];

		const result = getPrimarySkuForList({ skus }, { preferOnSale: true });

		expect(result).toBe(skus[1]);
	});

	it("should prioritize on-sale out-of-stock SKU over default when preferOnSale is true", () => {
		const skus = [
			makeSku({ isDefault: true, inventory: 5, compareAtPrice: null }),
			makeSku({ isDefault: false, inventory: 0, compareAtPrice: 3000 }),
		];

		const result = getPrimarySkuForList({ skus }, { preferOnSale: true });

		expect(result).toBe(skus[1]);
	});

	it("should prefer on-sale in-stock over on-sale out-of-stock", () => {
		const skus = [
			makeSku({ isDefault: false, inventory: 0, compareAtPrice: 3000 }),
			makeSku({ isDefault: false, inventory: 2, compareAtPrice: 2500 }),
		];

		const result = getPrimarySkuForList({ skus }, { preferOnSale: true });

		expect(result).toBe(skus[1]);
	});

	it("should fall back to default SKU when no on-sale SKU exists and preferOnSale is true", () => {
		const skus = [
			makeSku({ isDefault: true, inventory: 5, compareAtPrice: null }),
			makeSku({ isDefault: false, inventory: 3, compareAtPrice: null }),
		];

		const result = getPrimarySkuForList({ skus }, { preferOnSale: true });

		expect(result).toBe(skus[0]);
	});

	it("should prioritize preferred color over preferOnSale", () => {
		const skus = [
			makeSku({
				isDefault: false,
				inventory: 5,
				compareAtPrice: 3000,
				colors: [
					{
						colorId: "c1",
						position: 0,
						color: { id: "c1", slug: "or-rose", hex: "#B76E79", name: "Or Rose" },
					},
				],
			}),
			makeSku({
				isDefault: false,
				inventory: 5,
				compareAtPrice: null,
				colors: [
					{
						colorId: "c2",
						position: 0,
						color: { id: "c2", slug: "argent", hex: "#C0C0C0", name: "Argent" },
					},
				],
			}),
		];

		const result = getPrimarySkuForList(
			{ skus },
			{ preferredColorSlug: "argent", preferOnSale: true },
		);

		expect(result).toBe(skus[1]);
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
