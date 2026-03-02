import { describe, it, expect, vi } from "vitest";

const mockGetPrimarySkuForList = vi.hoisted(() => vi.fn());

vi.mock("@/modules/skus/services/sku-selection.service", () => ({
	getPrimarySkuForList: mockGetPrimarySkuForList,
}));

import {
	getPrimaryColorForList,
	getAvailableColorsForList,
	getVariantCountForList,
	hasMultipleVariants,
	getPriceRangeForList,
} from "../product-variant-display.service";
import type { ProductFromList } from "../../types/product-list.types";

// ============================================================================
// HELPERS
// ============================================================================

type SkuLike = ProductFromList["skus"][0];

function makeSku(overrides: Partial<SkuLike> = {}): SkuLike {
	return {
		id: "sku-1",
		isActive: true,
		isDefault: false,
		inventory: 10,
		priceInclTax: 5000,
		compareAtPrice: null,
		size: null,
		color: null,
		material: null,
		images: [],
		...overrides,
	} as unknown as SkuLike;
}

function makeColor(slug: string, hex: string, name: string) {
	return { id: `color-${slug}`, slug, hex, name };
}

function makeProduct(skus: SkuLike[]): ProductFromList {
	return {
		id: "prod-1",
		slug: "bague-or",
		title: "Bague en or",
		skus,
	} as unknown as ProductFromList;
}

// ============================================================================
// getPrimaryColorForList
// ============================================================================

describe("getPrimaryColorForList", () => {
	it("should return empty object when no primary sku", () => {
		mockGetPrimarySkuForList.mockReturnValue(null);
		const result = getPrimaryColorForList(makeProduct([]));
		expect(result).toEqual({});
	});

	it("should return hex and name when primary sku has a color", () => {
		const sku = makeSku({ color: makeColor("or", "#FFD700", "Or") });
		mockGetPrimarySkuForList.mockReturnValue(sku);
		const result = getPrimaryColorForList(makeProduct([sku]));
		expect(result.hex).toBe("#FFD700");
		expect(result.name).toBe("Or");
	});

	it("should fall back to material name when sku has no color hex", () => {
		const sku = makeSku({
			color: null,
			material: { id: "mat-1", name: "Argent 925" },
		});
		mockGetPrimarySkuForList.mockReturnValue(sku);
		const result = getPrimaryColorForList(makeProduct([sku]));
		expect(result.name).toBe("Argent 925");
		expect(result.hex).toBeUndefined();
	});

	it("should return empty object when sku has neither color nor material", () => {
		const sku = makeSku({ color: null, material: null });
		mockGetPrimarySkuForList.mockReturnValue(sku);
		const result = getPrimaryColorForList(makeProduct([sku]));
		expect(result).toEqual({});
	});

	it("should use material name as fallback name when color has no name", () => {
		const sku = makeSku({
			color: { id: "c1", slug: "or", hex: "#FFD700", name: "" } as unknown as SkuLike["color"],
			material: { id: "mat-1", name: "Or 18k" },
		});
		mockGetPrimarySkuForList.mockReturnValue(sku);
		const result = getPrimaryColorForList(makeProduct([sku]));
		expect(result.hex).toBe("#FFD700");
		expect(result.name).toBe("Or 18k");
	});
});

// ============================================================================
// getAvailableColorsForList
// ============================================================================

describe("getAvailableColorsForList", () => {
	it("should return empty array when no skus", () => {
		const result = getAvailableColorsForList(makeProduct([]));
		expect(result).toEqual([]);
	});

	it("should return empty array when no sku has a color with hex and slug", () => {
		const product = makeProduct([makeSku({ color: null })]);
		expect(getAvailableColorsForList(product)).toEqual([]);
	});

	it("should return a color swatch for a sku with color slug and hex", () => {
		const sku = makeSku({
			isActive: true,
			inventory: 5,
			color: makeColor("or", "#FFD700", "Or"),
		});
		const result = getAvailableColorsForList(makeProduct([sku]));
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ slug: "or", hex: "#FFD700", name: "Or", inStock: true });
	});

	it("should mark color as out of stock when inventory is 0", () => {
		const sku = makeSku({
			isActive: true,
			inventory: 0,
			color: makeColor("argent", "#C0C0C0", "Argent"),
		});
		const result = getAvailableColorsForList(makeProduct([sku]));
		expect(result[0]!.inStock).toBe(false);
	});

	it("should mark color as inStock=true if at least one sku of that color is in stock", () => {
		const skuInStock = makeSku({ inventory: 5, color: makeColor("or", "#FFD700", "Or") });
		const skuOutOfStock = makeSku({ inventory: 0, color: makeColor("or", "#FFD700", "Or") });
		// Permissive logic: inStock = true if ANY SKU of this color has inventory > 0,
		// regardless of processing order
		const result = getAvailableColorsForList(makeProduct([skuOutOfStock, skuInStock]));
		expect(result).toHaveLength(1);
		expect(result[0]!.inStock).toBe(true);
	});

	it("should deduplicate colors by slug", () => {
		const sku1 = makeSku({ color: makeColor("or", "#FFD700", "Or"), inventory: 5 });
		const sku2 = makeSku({
			color: makeColor("or", "#FFD700", "Or"),
			inventory: 3,
			size: "54",
		} as unknown as SkuLike);
		const result = getAvailableColorsForList(makeProduct([sku1, sku2]));
		expect(result).toHaveLength(1);
	});

	it("should not include inactive skus", () => {
		const sku = makeSku({
			isActive: false,
			color: makeColor("or", "#FFD700", "Or"),
		});
		const result = getAvailableColorsForList(makeProduct([sku]));
		expect(result).toEqual([]);
	});
});

// ============================================================================
// getVariantCountForList
// ============================================================================

describe("getVariantCountForList", () => {
	it("should return zeros when no skus", () => {
		const result = getVariantCountForList(makeProduct([]));
		expect(result).toEqual({ colors: 0, materials: 0, sizes: 0, total: 0 });
	});

	it("should count unique colors in stock", () => {
		const skus = [
			makeSku({ color: makeColor("or", "#FFD700", "Or"), inventory: 5 }),
			makeSku({ color: makeColor("argent", "#C0C0C0", "Argent"), inventory: 3 }),
		];
		const result = getVariantCountForList(makeProduct(skus));
		expect(result.colors).toBe(2);
	});

	it("should not count out-of-stock skus", () => {
		const skus = [
			makeSku({ color: makeColor("or", "#FFD700", "Or"), inventory: 5 }),
			makeSku({ color: makeColor("argent", "#C0C0C0", "Argent"), inventory: 0 }),
		];
		const result = getVariantCountForList(makeProduct(skus));
		expect(result.colors).toBe(1);
		expect(result.total).toBe(1);
	});

	it("should count unique materials", () => {
		const skus = [
			makeSku({ material: { id: "m1", name: "Argent 925" }, inventory: 5 }),
			makeSku({ material: { id: "m2", name: "Or 18k" }, inventory: 5 }),
		];
		const result = getVariantCountForList(makeProduct(skus));
		expect(result.materials).toBe(2);
	});

	it("should count unique sizes", () => {
		const skus = [
			makeSku({ size: "52", inventory: 5 } as unknown as SkuLike),
			makeSku({ size: "54", inventory: 5 } as unknown as SkuLike),
			makeSku({ size: "52", inventory: 3 } as unknown as SkuLike),
		];
		const result = getVariantCountForList(makeProduct(skus));
		expect(result.sizes).toBe(2);
	});
});

// ============================================================================
// hasMultipleVariants
// ============================================================================

describe("hasMultipleVariants", () => {
	it("should return false when no skus", () => {
		expect(hasMultipleVariants(makeProduct([]))).toBe(false);
	});

	it("should return false when only one active sku", () => {
		expect(hasMultipleVariants(makeProduct([makeSku()]))).toBe(false);
	});

	it("should return true when multiple active skus with different colors", () => {
		const skus = [
			makeSku({ color: makeColor("or", "#FFD700", "Or") }),
			makeSku({ color: makeColor("argent", "#C0C0C0", "Argent") }),
		];
		expect(hasMultipleVariants(makeProduct(skus))).toBe(true);
	});

	it("should return true when multiple active skus with different sizes", () => {
		const skus = [
			makeSku({ size: "52" } as unknown as SkuLike),
			makeSku({ size: "54" } as unknown as SkuLike),
		];
		expect(hasMultipleVariants(makeProduct(skus))).toBe(true);
	});

	it("should return false when multiple active skus all share same single variant dimension", () => {
		const skus = [
			makeSku({ color: makeColor("or", "#FFD700", "Or") }),
			makeSku({ color: makeColor("or", "#FFD700", "Or") }),
		];
		expect(hasMultipleVariants(makeProduct(skus))).toBe(false);
	});

	it("should not count inactive skus", () => {
		const skus = [
			makeSku({ color: makeColor("or", "#FFD700", "Or"), isActive: true }),
			makeSku({ color: makeColor("argent", "#C0C0C0", "Argent"), isActive: false }),
		];
		expect(hasMultipleVariants(makeProduct(skus))).toBe(false);
	});
});

// ============================================================================
// getPriceRangeForList
// ============================================================================

describe("getPriceRangeForList", () => {
	it("should return zeros and hasRange=false when no skus", () => {
		const result = getPriceRangeForList(makeProduct([]));
		expect(result).toEqual({ min: 0, max: 0, hasRange: false });
	});

	it("should return zeros when no active in-stock skus", () => {
		const result = getPriceRangeForList(makeProduct([makeSku({ inventory: 0 })]));
		expect(result).toEqual({ min: 0, max: 0, hasRange: false });
	});

	it("should return min and max prices from in-stock active skus", () => {
		const skus = [
			makeSku({ priceInclTax: 3000, inventory: 5 }),
			makeSku({ priceInclTax: 7000, inventory: 3 }),
		];
		const result = getPriceRangeForList(makeProduct(skus));
		expect(result.min).toBe(3000);
		expect(result.max).toBe(7000);
		expect(result.hasRange).toBe(true);
	});

	it("should return hasRange=false when all prices are equal", () => {
		const skus = [
			makeSku({ priceInclTax: 5000, inventory: 5 }),
			makeSku({ priceInclTax: 5000, inventory: 3 }),
		];
		const result = getPriceRangeForList(makeProduct(skus));
		expect(result.hasRange).toBe(false);
		expect(result.min).toBe(5000);
		expect(result.max).toBe(5000);
	});

	it("should exclude out-of-stock skus from price range", () => {
		const skus = [
			makeSku({ priceInclTax: 1000, inventory: 0 }),
			makeSku({ priceInclTax: 5000, inventory: 5 }),
		];
		const result = getPriceRangeForList(makeProduct(skus));
		expect(result.min).toBe(5000);
		expect(result.max).toBe(5000);
	});
});
