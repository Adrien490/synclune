import { describe, it, expect, vi } from "vitest";

vi.mock("@/shared/constants/cache-tags", () => ({
	STOCK_THRESHOLDS: {
		CRITICAL: 1,
		LOW: 3,
		NORMAL_MAX: 50,
	},
	SHARED_CACHE_TAGS: {},
}));

import {
	calculatePriceInfo,
	determineStockStatus,
	calculateDiscountPercent,
	hasActiveDiscount,
	getSchemaOrgAvailabilityUrl,
	calculateSavings,
} from "./product-pricing.service";

describe("calculatePriceInfo", () => {
	it("should return zeros for empty SKUs", () => {
		expect(calculatePriceInfo([])).toEqual({
			minPrice: 0,
			maxPrice: 0,
			hasMultiplePrices: false,
		});
	});

	it("should return zeros for null/undefined SKUs", () => {
		expect(calculatePriceInfo(null)).toEqual({
			minPrice: 0,
			maxPrice: 0,
			hasMultiplePrices: false,
		});
		expect(calculatePriceInfo(undefined)).toEqual({
			minPrice: 0,
			maxPrice: 0,
			hasMultiplePrices: false,
		});
	});

	it("should handle a single active SKU", () => {
		const skus = [{ isActive: true, priceInclTax: 2500 }];
		expect(calculatePriceInfo(skus)).toEqual({
			minPrice: 2500,
			maxPrice: 2500,
			hasMultiplePrices: false,
		});
	});

	it("should compute min/max from multiple SKUs", () => {
		const skus = [
			{ isActive: true, priceInclTax: 1500 },
			{ isActive: true, priceInclTax: 3500 },
			{ isActive: true, priceInclTax: 2000 },
		];
		expect(calculatePriceInfo(skus)).toEqual({
			minPrice: 1500,
			maxPrice: 3500,
			hasMultiplePrices: true,
		});
	});

	it("should filter out inactive SKUs", () => {
		const skus = [
			{ isActive: false, priceInclTax: 500 },
			{ isActive: true, priceInclTax: 2000 },
			{ isActive: false, priceInclTax: 100 },
		];
		expect(calculatePriceInfo(skus)).toEqual({
			minPrice: 2000,
			maxPrice: 2000,
			hasMultiplePrices: false,
		});
	});

	it("should return zeros when all SKUs are inactive", () => {
		const skus = [
			{ isActive: false, priceInclTax: 500 },
			{ isActive: false, priceInclTax: 1000 },
		];
		expect(calculatePriceInfo(skus)).toEqual({
			minPrice: 0,
			maxPrice: 0,
			hasMultiplePrices: false,
		});
	});
});

describe("determineStockStatus", () => {
	it("should return out_of_stock when inventory is 0", () => {
		expect(determineStockStatus(0, true)).toBe("out_of_stock");
	});

	it("should return out_of_stock when inactive", () => {
		expect(determineStockStatus(10, false)).toBe("out_of_stock");
	});

	it("should return out_of_stock for null/undefined", () => {
		expect(determineStockStatus(null, true)).toBe("out_of_stock");
		expect(determineStockStatus(undefined, true)).toBe("out_of_stock");
		expect(determineStockStatus(5, null)).toBe("out_of_stock");
		expect(determineStockStatus(5, undefined)).toBe("out_of_stock");
	});

	it("should return low_stock when inventory <= LOW threshold", () => {
		expect(determineStockStatus(1, true)).toBe("low_stock");
		expect(determineStockStatus(2, true)).toBe("low_stock");
		expect(determineStockStatus(3, true)).toBe("low_stock");
	});

	it("should return in_stock when inventory > LOW threshold", () => {
		expect(determineStockStatus(4, true)).toBe("in_stock");
		expect(determineStockStatus(100, true)).toBe("in_stock");
	});
});

describe("calculateDiscountPercent", () => {
	it("should calculate discount percentage", () => {
		expect(calculateDiscountPercent(100, 80)).toBe(20);
		expect(calculateDiscountPercent(200, 150)).toBe(25);
	});

	it("should return 0 when no discount", () => {
		expect(calculateDiscountPercent(null, 100)).toBe(0);
		expect(calculateDiscountPercent(undefined, 100)).toBe(0);
	});

	it("should return 0 when compareAtPrice <= price", () => {
		expect(calculateDiscountPercent(100, 100)).toBe(0);
		expect(calculateDiscountPercent(80, 100)).toBe(0);
	});

	it("should round the percentage", () => {
		// 33.333...% -> 33
		expect(calculateDiscountPercent(300, 200)).toBe(33);
	});
});

describe("hasActiveDiscount", () => {
	it("should return true when compareAtPrice > price", () => {
		expect(hasActiveDiscount(150, 100)).toBe(true);
	});

	it("should return false when compareAtPrice <= price", () => {
		expect(hasActiveDiscount(100, 100)).toBe(false);
		expect(hasActiveDiscount(80, 100)).toBe(false);
	});

	it("should return false when compareAtPrice is null/undefined", () => {
		expect(hasActiveDiscount(null, 100)).toBe(false);
		expect(hasActiveDiscount(undefined, 100)).toBe(false);
	});
});

describe("getSchemaOrgAvailabilityUrl", () => {
	it("should return InStock URL", () => {
		expect(getSchemaOrgAvailabilityUrl("in_stock")).toBe("https://schema.org/InStock");
	});

	it("should return LimitedAvailability URL", () => {
		expect(getSchemaOrgAvailabilityUrl("low_stock")).toBe("https://schema.org/LimitedAvailability");
	});

	it("should return OutOfStock URL", () => {
		expect(getSchemaOrgAvailabilityUrl("out_of_stock")).toBe("https://schema.org/OutOfStock");
	});
});

describe("calculateSavings", () => {
	it("should calculate savings amount", () => {
		expect(calculateSavings(150, 100)).toBe(50);
		expect(calculateSavings(200, 120)).toBe(80);
	});

	it("should return 0 when no promotion", () => {
		expect(calculateSavings(null, 100)).toBe(0);
		expect(calculateSavings(undefined, 100)).toBe(0);
	});

	it("should return 0 when compareAtPrice <= price", () => {
		expect(calculateSavings(100, 100)).toBe(0);
		expect(calculateSavings(80, 100)).toBe(0);
	});
});
