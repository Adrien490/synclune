import { describe, it, expect, vi } from "vitest";

vi.mock("@/shared/utils/generate-slug", () => ({
	slugify: (str: string) => str.toLowerCase().replace(/\s+/g, "-"),
}));

import type { BaseProductSku } from "@/shared/types/product-sku.types";
import type { VariantSelectors } from "../../types/sku.types";
import {
	matchColor,
	matchMaterial,
	matchSize,
	matchSkuVariants,
	filterCompatibleSkus,
} from "../sku-filter.service";

function makeSku(overrides: Partial<BaseProductSku> = {}): BaseProductSku {
	return {
		id: "sku-1",
		sku: "SKU-001",
		isActive: true,
		isDefault: false,
		inventory: 5,
		priceInclTax: 2000,
		compareAtPrice: null,
		size: null,
		color: {
			id: "color-1",
			slug: "or-rose",
			hex: "#B76E79",
			name: "Or Rose",
		},
		material: {
			id: "mat-1",
			name: "Argent 925",
		},
		images: [],
		...overrides,
	};
}

// ============================================================================
// matchColor
// ============================================================================

describe("matchColor", () => {
	it("should return true when no color selector is provided", () => {
		const sku = makeSku();

		expect(matchColor(sku, {})).toBe(true);
	});

	it("should match by slug (priority 1)", () => {
		const sku = makeSku();

		expect(matchColor(sku, { colorSlug: "or-rose" })).toBe(true);
		expect(matchColor(sku, { colorSlug: "argent" })).toBe(false);
	});

	it("should match by hex (priority 2)", () => {
		const sku = makeSku();

		expect(matchColor(sku, { colorHex: "#B76E79" })).toBe(true);
		expect(matchColor(sku, { colorHex: "#000000" })).toBe(false);
	});

	it("should match by id (priority 3)", () => {
		const sku = makeSku();

		expect(matchColor(sku, { colorId: "color-1" })).toBe(true);
		expect(matchColor(sku, { colorId: "color-999" })).toBe(false);
	});

	it("should prioritize slug over hex and id", () => {
		const sku = makeSku();

		// slug matches, hex and id don't - should still match via slug
		expect(matchColor(sku, { colorSlug: "or-rose", colorHex: "#000", colorId: "wrong" })).toBe(true);
	});

	it("should return false when SKU has no color and a selector is provided", () => {
		const sku = makeSku({ color: null });

		expect(matchColor(sku, { colorSlug: "or-rose" })).toBe(false);
	});
});

// ============================================================================
// matchMaterial
// ============================================================================

describe("matchMaterial", () => {
	it("should return true when no material selector is provided", () => {
		const sku = makeSku();

		expect(matchMaterial(sku, {})).toBe(true);
	});

	it("should match by material name via slugify normalization", () => {
		const sku = makeSku();

		expect(matchMaterial(sku, { material: "Argent 925" })).toBe(true);
		expect(matchMaterial(sku, { material: "argent 925" })).toBe(true);
	});

	it("should match by materialSlug", () => {
		const sku = makeSku();

		expect(matchMaterial(sku, { materialSlug: "argent-925" })).toBe(true);
		expect(matchMaterial(sku, { materialSlug: "or-18k" })).toBe(false);
	});

	it("should return false when SKU has no material and a selector is provided", () => {
		const sku = makeSku({ material: null });

		expect(matchMaterial(sku, { material: "Argent 925" })).toBe(false);
	});
});

// ============================================================================
// matchSize
// ============================================================================

describe("matchSize", () => {
	it("should return true when no size selector is provided", () => {
		const sku = makeSku();

		expect(matchSize(sku, {})).toBe(true);
	});

	it("should match by exact size value", () => {
		const sku = makeSku({ size: "M" });

		expect(matchSize(sku, { size: "M" })).toBe(true);
		expect(matchSize(sku, { size: "L" })).toBe(false);
	});

	it("should return false when SKU has no size and size is requested", () => {
		const sku = makeSku({ size: null });

		expect(matchSize(sku, { size: "M" })).toBe(false);
	});
});

// ============================================================================
// matchSkuVariants
// ============================================================================

describe("matchSkuVariants", () => {
	it("should return true when all selectors match", () => {
		const sku = makeSku({ size: "M" });
		const selectors: VariantSelectors = {
			colorSlug: "or-rose",
			material: "Argent 925",
			size: "M",
		};

		expect(matchSkuVariants(sku, selectors)).toBe(true);
	});

	it("should return false when one selector does not match", () => {
		const sku = makeSku({ size: "M" });
		const selectors: VariantSelectors = {
			colorSlug: "or-rose",
			material: "Argent 925",
			size: "L",
		};

		expect(matchSkuVariants(sku, selectors)).toBe(false);
	});

	it("should return true when no selectors are provided", () => {
		const sku = makeSku();

		expect(matchSkuVariants(sku, {})).toBe(true);
	});
});

// ============================================================================
// filterCompatibleSkus
// ============================================================================

describe("filterCompatibleSkus", () => {
	it("should exclude inactive SKUs", () => {
		const product = {
			skus: [
				makeSku({ id: "sku-1", isActive: false }),
				makeSku({ id: "sku-2", isActive: true }),
			],
		};

		const result = filterCompatibleSkus(product, {});

		expect(result).toHaveLength(1);
		expect(result[0].id).toBe("sku-2");
	});

	it("should exclude out-of-stock SKUs", () => {
		const product = {
			skus: [
				makeSku({ id: "sku-1", inventory: 0 }),
				makeSku({ id: "sku-2", inventory: 3 }),
			],
		};

		const result = filterCompatibleSkus(product, {});

		expect(result).toHaveLength(1);
		expect(result[0].id).toBe("sku-2");
	});

	it("should filter by variant selectors", () => {
		const product = {
			skus: [
				makeSku({ id: "sku-1", color: { id: "c1", slug: "or-rose", hex: "#B76E79", name: "Or Rose" } }),
				makeSku({ id: "sku-2", color: { id: "c2", slug: "argent", hex: "#C0C0C0", name: "Argent" } }),
			],
		};

		const result = filterCompatibleSkus(product, { colorSlug: "argent" });

		expect(result).toHaveLength(1);
		expect(result[0].id).toBe("sku-2");
	});

	it("should return empty array when product has no SKUs", () => {
		expect(filterCompatibleSkus({ skus: null }, {})).toEqual([]);
		expect(filterCompatibleSkus({ skus: undefined }, {})).toEqual([]);
	});
});
