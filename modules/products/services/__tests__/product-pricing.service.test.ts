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
	getSchemaOrgAvailabilityUrl,
} from "../product-pricing.service";

describe("calculatePriceInfo", () => {
	it("should return zeros for empty VARIANTs", () => {
		expect(calculatePriceInfo([])).toEqual({
			minPrice: 0,
			maxPrice: 0,
			hasMultiplePrices: false,
		});
	});

	it("should return zeros for null/undefined VARIANTs", () => {
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

	it("should handle a single active VARIANT", () => {
		const variants = [{ active: true, priceCents: 2500 }];
		expect(calculatePriceInfo(variants)).toEqual({
			minPrice: 2500,
			maxPrice: 2500,
			hasMultiplePrices: false,
		});
	});

	it("should compute min/max from multiple VARIANTs", () => {
		const variants = [
			{ active: true, priceCents: 1500 },
			{ active: true, priceCents: 3500 },
			{ active: true, priceCents: 2000 },
		];
		expect(calculatePriceInfo(variants)).toEqual({
			minPrice: 1500,
			maxPrice: 3500,
			hasMultiplePrices: true,
		});
	});

	it("should filter out inactive VARIANTs", () => {
		const variants = [
			{ active: false, priceCents: 500 },
			{ active: true, priceCents: 2000 },
			{ active: false, priceCents: 100 },
		];
		expect(calculatePriceInfo(variants)).toEqual({
			minPrice: 2000,
			maxPrice: 2000,
			hasMultiplePrices: false,
		});
	});

	it("should return zeros when all VARIANTs are inactive", () => {
		const variants = [
			{ active: false, priceCents: 500 },
			{ active: false, priceCents: 1000 },
		];
		expect(calculatePriceInfo(variants)).toEqual({
			minPrice: 0,
			maxPrice: 0,
			hasMultiplePrices: false,
		});
	});
});

describe("determineStockStatus", () => {
	it("should return out_of_stock when stock is 0", () => {
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

	it("should return low_stock when stock <= LOW threshold", () => {
		expect(determineStockStatus(1, true)).toBe("low_stock");
		expect(determineStockStatus(2, true)).toBe("low_stock");
		expect(determineStockStatus(3, true)).toBe("low_stock");
	});

	it("should return in_stock when stock > LOW threshold", () => {
		expect(determineStockStatus(4, true)).toBe("in_stock");
		expect(determineStockStatus(100, true)).toBe("in_stock");
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
