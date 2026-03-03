import { describe, it, expect } from "vitest";
import { serializeProduct, serializeProducts } from "../serialize-product";

// ============================================================================
// Helpers
// ============================================================================

function makeProduct(reviewStats: Record<string, unknown> | null = null) {
	return {
		id: "prod-1",
		title: "Bague Éclat",
		reviewStats,
	} as never;
}

// ============================================================================
// serializeProduct
// ============================================================================

describe("serializeProduct", () => {
	it("returns product unchanged when reviewStats is null", () => {
		const product = makeProduct(null);
		const result = serializeProduct(product);
		expect(result).toBe(product); // same reference
	});

	it("returns product unchanged when reviewStats is undefined", () => {
		const product = { id: "prod-1", title: "Test" } as never;
		const result = serializeProduct(product);
		expect(result).toBe(product);
	});

	it("converts Decimal averageRating to number via .toNumber()", () => {
		const mockDecimal = {
			toNumber: () => 4.5,
			toString: () => "4.5",
		};
		const product = makeProduct({
			averageRating: mockDecimal,
			reviewCount: 10,
		});

		const result = serializeProduct(product);
		expect(
			(result as unknown as { reviewStats: { averageRating: number } }).reviewStats.averageRating,
		).toBe(4.5);
	});

	it("passes through a plain number averageRating unchanged", () => {
		const product = makeProduct({
			averageRating: 3.8,
			reviewCount: 5,
		});

		const result = serializeProduct(product);
		expect(
			(result as unknown as { reviewStats: { averageRating: number } }).reviewStats.averageRating,
		).toBe(3.8);
	});

	it("preserves other reviewStats fields", () => {
		const product = makeProduct({
			averageRating: 4.0,
			reviewCount: 20,
		});

		const result = serializeProduct(product);
		expect(
			(result as unknown as { reviewStats: { reviewCount: number } }).reviewStats.reviewCount,
		).toBe(20);
	});
});

// ============================================================================
// serializeProducts
// ============================================================================

describe("serializeProducts", () => {
	it("returns empty array for empty input", () => {
		expect(serializeProducts([])).toEqual([]);
	});

	it("serializes each product in the array", () => {
		const mockDecimal = { toNumber: () => 4.0, toString: () => "4.0" };
		const products = [
			makeProduct({ averageRating: mockDecimal, reviewCount: 5 }),
			makeProduct(null),
		];

		const result = serializeProducts(products);
		expect(result).toHaveLength(2);
		expect(
			(result[0] as unknown as { reviewStats: { averageRating: number } }).reviewStats
				.averageRating,
		).toBe(4.0);
		expect(result[1]).toBe(products[1]); // null reviewStats returns same reference
	});
});
