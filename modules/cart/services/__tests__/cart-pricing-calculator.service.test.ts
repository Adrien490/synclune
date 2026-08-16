import { describe, it, expect } from "vitest";
import {
	detectPriceChanges,
	effectivePrice,
	isPriceIncrease,
} from "../cart-pricing-calculator.service";
import type { CartItemForPriceCheck } from "../../types/cart.types";

// `hasPriceChanges`, `calculateTotalSavings`, `isPriceDecrease` et
// `getPriceDifference` ont été retirées avec leurs tests (audit panier
// 2026-08-15) : aucun consommateur de production — les tests étaient leur seul
// importeur, ce qui rendait `knip` aveugle au code mort.

// `id` n'appartient pas à `CartItemForPriceCheck` (le service n'en a pas
// besoin) — le fixture en porte un pour tracer les items dans les assertions,
// comme le fait `CartItem` en production.
function createPriceItem(
	overrides?: Partial<{
		id: string;
		priceAtAdd: number;
		currentPrice: number;
		quantity: number;
		title: string;
	}>,
): CartItemForPriceCheck & { id: string } {
	return {
		id: overrides?.id ?? "item-1",
		priceAtAdd: overrides?.priceAtAdd ?? 2500,
		quantity: overrides?.quantity ?? 1,
		variant: {
			priceCents: overrides?.currentPrice ?? 2500,
			product: {
				name: overrides?.title ?? "Bracelet Lune",
				priceCents: 2500,
			},
		},
	};
}

// ============================================================================
// effectivePrice
// ============================================================================

describe("effectivePrice", () => {
	it("uses the variant override when set", () => {
		expect(effectivePrice(createPriceItem({ currentPrice: 1800 }))).toBe(1800);
	});

	it("falls back to the product price when the override is null", () => {
		const item = createPriceItem();
		item.variant.priceCents = null;
		expect(effectivePrice(item)).toBe(2500);
	});
});

// ============================================================================
// isPriceIncrease
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

// ============================================================================
// detectPriceChanges
// ============================================================================

describe("detectPriceChanges", () => {
	it("should categorize items with price changes", () => {
		const items = [
			createPriceItem({ id: "i1", priceAtAdd: 2500, currentPrice: 2500 }), // no change
			createPriceItem({ id: "i2", priceAtAdd: 2000, currentPrice: 2500 }), // increase
			createPriceItem({ id: "i3", priceAtAdd: 3000, currentPrice: 2500 }), // decrease
		];

		const result = detectPriceChanges(items);

		expect(result.itemsWithPriceChange).toHaveLength(2);
		expect(result.itemsWithPriceIncrease).toHaveLength(1);
		expect(result.itemsWithPriceIncrease[0]!.id).toBe("i2");
		expect(result.itemsWithPriceDecrease).toHaveLength(1);
		expect(result.itemsWithPriceDecrease[0]!.id).toBe("i3");
	});

	it("should calculate totalSavings correctly", () => {
		const items = [createPriceItem({ priceAtAdd: 3000, currentPrice: 2500, quantity: 2 })];
		const result = detectPriceChanges(items);
		expect(result.totalSavings).toBe(1000);
	});

	it("should calculate totalIncrease correctly", () => {
		const items = [createPriceItem({ priceAtAdd: 2000, currentPrice: 2500, quantity: 3 })];
		const result = detectPriceChanges(items);
		expect(result.totalIncrease).toBe(1500);
	});

	it("should return empty results when no price changes", () => {
		const items = [createPriceItem({ priceAtAdd: 2500, currentPrice: 2500 })];
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
		type ExtendedItem = CartItemForPriceCheck & { id: string; customField: string };
		const items: ExtendedItem[] = [
			{ ...createPriceItem({ priceAtAdd: 1000, currentPrice: 2000 }), customField: "test" },
		];
		const result = detectPriceChanges(items);
		expect(result.itemsWithPriceIncrease[0]!.customField).toBe("test");
	});
});
