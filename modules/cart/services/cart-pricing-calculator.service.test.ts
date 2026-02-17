import { describe, it, expect } from "vitest";
import {
	detectPriceChanges,
	hasPriceChanges,
	calculateTotalSavings,
	isPriceIncrease,
	isPriceDecrease,
	getPriceDifference,
} from "./cart-pricing-calculator.service";
import type { CartItemForPriceCheck } from "../types/cart.types";

function createPriceItem(overrides?: Partial<{
	id: string;
	priceAtAdd: number;
	currentPrice: number;
	quantity: number;
	title: string;
}>): CartItemForPriceCheck {
	return {
		id: overrides?.id ?? "item-1",
		priceAtAdd: overrides?.priceAtAdd ?? 2500,
		quantity: overrides?.quantity ?? 1,
		sku: {
			priceInclTax: overrides?.currentPrice ?? 2500,
			product: {
				title: overrides?.title ?? "Bracelet Lune",
			},
		},
	};
}

// ============================================================================
// isPriceIncrease / isPriceDecrease
// ============================================================================

describe("isPriceIncrease", () => {
	it("should return true when current price > priceAtAdd", () => {
		expect(isPriceIncrease(createPriceItem({ priceAtAdd: 2000, currentPrice: 2500 }))).toBe(true);
	});

	it("should return false when prices are equal", () => {
		expect(isPriceIncrease(createPriceItem({ priceAtAdd: 2500, currentPrice: 2500 }))).toBe(false);
	});

	it("should return false when price decreased", () => {
		expect(isPriceIncrease(createPriceItem({ priceAtAdd: 3000, currentPrice: 2500 }))).toBe(false);
	});
});

describe("isPriceDecrease", () => {
	it("should return true when current price < priceAtAdd", () => {
		expect(isPriceDecrease(createPriceItem({ priceAtAdd: 3000, currentPrice: 2500 }))).toBe(true);
	});

	it("should return false when prices are equal", () => {
		expect(isPriceDecrease(createPriceItem({ priceAtAdd: 2500, currentPrice: 2500 }))).toBe(false);
	});

	it("should return false when price increased", () => {
		expect(isPriceDecrease(createPriceItem({ priceAtAdd: 2000, currentPrice: 2500 }))).toBe(false);
	});
});

// ============================================================================
// getPriceDifference
// ============================================================================

describe("getPriceDifference", () => {
	it("should return positive value for price increase", () => {
		expect(getPriceDifference(createPriceItem({ priceAtAdd: 2000, currentPrice: 2500, quantity: 1 }))).toBe(500);
	});

	it("should return negative value for price decrease", () => {
		expect(getPriceDifference(createPriceItem({ priceAtAdd: 3000, currentPrice: 2500, quantity: 1 }))).toBe(-500);
	});

	it("should return 0 when prices are equal", () => {
		expect(getPriceDifference(createPriceItem({ priceAtAdd: 2500, currentPrice: 2500 }))).toBe(0);
	});

	it("should multiply by quantity", () => {
		expect(getPriceDifference(createPriceItem({ priceAtAdd: 2000, currentPrice: 2500, quantity: 3 }))).toBe(1500);
	});
});

// ============================================================================
// hasPriceChanges
// ============================================================================

describe("hasPriceChanges", () => {
	it("should return true when at least one price changed", () => {
		const items = [
			createPriceItem({ priceAtAdd: 2500, currentPrice: 2500 }),
			createPriceItem({ priceAtAdd: 2000, currentPrice: 2500 }),
		];
		expect(hasPriceChanges(items)).toBe(true);
	});

	it("should return false when no prices changed", () => {
		const items = [
			createPriceItem({ priceAtAdd: 2500, currentPrice: 2500 }),
			createPriceItem({ priceAtAdd: 1500, currentPrice: 1500 }),
		];
		expect(hasPriceChanges(items)).toBe(false);
	});

	it("should return false for empty array", () => {
		expect(hasPriceChanges([])).toBe(false);
	});
});

// ============================================================================
// calculateTotalSavings
// ============================================================================

describe("calculateTotalSavings", () => {
	it("should sum savings from price decreases only", () => {
		const items = [
			createPriceItem({ priceAtAdd: 3000, currentPrice: 2500, quantity: 1 }), // -500
			createPriceItem({ priceAtAdd: 2000, currentPrice: 2500, quantity: 1 }), // increase, ignored
			createPriceItem({ priceAtAdd: 5000, currentPrice: 4000, quantity: 2 }), // -2000
		];
		expect(calculateTotalSavings(items)).toBe(2500);
	});

	it("should return 0 when no price decreases", () => {
		const items = [
			createPriceItem({ priceAtAdd: 2000, currentPrice: 2500, quantity: 1 }),
			createPriceItem({ priceAtAdd: 2500, currentPrice: 2500, quantity: 1 }),
		];
		expect(calculateTotalSavings(items)).toBe(0);
	});

	it("should return 0 for empty array", () => {
		expect(calculateTotalSavings([])).toBe(0);
	});
});

// ============================================================================
// detectPriceChanges
// ============================================================================

describe("detectPriceChanges", () => {
	it("should categorize items with price changes", () => {
		const items = [
			createPriceItem({ id: "i1", priceAtAdd: 2500, currentPrice: 2500 }),  // no change
			createPriceItem({ id: "i2", priceAtAdd: 2000, currentPrice: 2500 }),  // increase
			createPriceItem({ id: "i3", priceAtAdd: 3000, currentPrice: 2500 }),  // decrease
		];

		const result = detectPriceChanges(items);

		expect(result.itemsWithPriceChange).toHaveLength(2);
		expect(result.itemsWithPriceIncrease).toHaveLength(1);
		expect(result.itemsWithPriceIncrease[0].id).toBe("i2");
		expect(result.itemsWithPriceDecrease).toHaveLength(1);
		expect(result.itemsWithPriceDecrease[0].id).toBe("i3");
	});

	it("should calculate totalSavings correctly", () => {
		const items = [
			createPriceItem({ priceAtAdd: 3000, currentPrice: 2500, quantity: 2 }),
		];
		const result = detectPriceChanges(items);
		expect(result.totalSavings).toBe(1000);
	});

	it("should calculate totalIncrease correctly", () => {
		const items = [
			createPriceItem({ priceAtAdd: 2000, currentPrice: 2500, quantity: 3 }),
		];
		const result = detectPriceChanges(items);
		expect(result.totalIncrease).toBe(1500);
	});

	it("should return empty results when no price changes", () => {
		const items = [
			createPriceItem({ priceAtAdd: 2500, currentPrice: 2500 }),
		];
		const result = detectPriceChanges(items);

		expect(result.itemsWithPriceChange).toHaveLength(0);
		expect(result.itemsWithPriceIncrease).toHaveLength(0);
		expect(result.itemsWithPriceDecrease).toHaveLength(0);
		expect(result.totalSavings).toBe(0);
		expect(result.totalIncrease).toBe(0);
	});

	it("should return empty results for empty array", () => {
		const result = detectPriceChanges([]);

		expect(result.itemsWithPriceChange).toHaveLength(0);
		expect(result.totalSavings).toBe(0);
		expect(result.totalIncrease).toBe(0);
	});

	it("should handle mixed increases and decreases", () => {
		const items = [
			createPriceItem({ priceAtAdd: 1000, currentPrice: 2000, quantity: 1 }), // +1000
			createPriceItem({ priceAtAdd: 5000, currentPrice: 3000, quantity: 1 }), // -2000
		];
		const result = detectPriceChanges(items);

		expect(result.totalIncrease).toBe(1000);
		expect(result.totalSavings).toBe(2000);
	});

	it("should preserve original item type in results", () => {
		type ExtendedItem = CartItemForPriceCheck & { customField: string };
		const items: ExtendedItem[] = [
			{ ...createPriceItem({ priceAtAdd: 1000, currentPrice: 2000 }), customField: "test" },
		];
		const result = detectPriceChanges(items);
		expect(result.itemsWithPriceIncrease[0].customField).toBe("test");
	});
});
