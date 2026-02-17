import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	DiscountType: { PERCENTAGE: "PERCENTAGE", FIXED_AMOUNT: "FIXED_AMOUNT" },
}));

import {
	calculateDiscountAmount,
	calculateEligibleSubtotal,
	calculateDiscountWithExclusion,
} from "../discount-calculation.service";
import { DiscountType } from "@/app/generated/prisma/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(
	priceInclTax: number,
	quantity: number,
	compareAtPrice: number | null = null
) {
	return { priceInclTax, quantity, compareAtPrice };
}

// ---------------------------------------------------------------------------
// calculateDiscountAmount
// ---------------------------------------------------------------------------

describe("calculateDiscountAmount", () => {
	describe("PERCENTAGE type", () => {
		it("should return 20% of 5000 cents (50€) as 1000", () => {
			const result = calculateDiscountAmount({
				type: DiscountType.PERCENTAGE,
				value: 20,
				subtotal: 5000,
			});
			expect(result).toBe(1000);
		});

		it("should floor the result when percentage produces a fraction", () => {
			// 10% of 333 = 33.3 → floored to 33
			const result = calculateDiscountAmount({
				type: DiscountType.PERCENTAGE,
				value: 10,
				subtotal: 333,
			});
			expect(result).toBe(33);
		});

		it("should return full subtotal for 100% discount", () => {
			const result = calculateDiscountAmount({
				type: DiscountType.PERCENTAGE,
				value: 100,
				subtotal: 4200,
			});
			expect(result).toBe(4200);
		});

		it("should return 0 for 0% discount", () => {
			const result = calculateDiscountAmount({
				type: DiscountType.PERCENTAGE,
				value: 0,
				subtotal: 5000,
			});
			expect(result).toBe(0);
		});

		it("should return 0 when subtotal is 0", () => {
			const result = calculateDiscountAmount({
				type: DiscountType.PERCENTAGE,
				value: 20,
				subtotal: 0,
			});
			expect(result).toBe(0);
		});

		it("should return 0 when subtotal is negative", () => {
			const result = calculateDiscountAmount({
				type: DiscountType.PERCENTAGE,
				value: 20,
				subtotal: -100,
			});
			expect(result).toBe(0);
		});
	});

	describe("FIXED_AMOUNT type", () => {
		it("should return the fixed amount when it is below the subtotal", () => {
			const result = calculateDiscountAmount({
				type: DiscountType.FIXED_AMOUNT,
				value: 1000,
				subtotal: 5000,
			});
			expect(result).toBe(1000);
		});

		it("should cap the discount at the subtotal when fixed amount exceeds it", () => {
			const result = calculateDiscountAmount({
				type: DiscountType.FIXED_AMOUNT,
				value: 10000,
				subtotal: 5000,
			});
			expect(result).toBe(5000);
		});

		it("should return exact subtotal when fixed amount equals the subtotal", () => {
			const result = calculateDiscountAmount({
				type: DiscountType.FIXED_AMOUNT,
				value: 3000,
				subtotal: 3000,
			});
			expect(result).toBe(3000);
		});

		it("should return 0 when subtotal is 0", () => {
			const result = calculateDiscountAmount({
				type: DiscountType.FIXED_AMOUNT,
				value: 500,
				subtotal: 0,
			});
			expect(result).toBe(0);
		});

		it("should return 0 when subtotal is negative", () => {
			const result = calculateDiscountAmount({
				type: DiscountType.FIXED_AMOUNT,
				value: 500,
				subtotal: -1,
			});
			expect(result).toBe(0);
		});
	});
});

// ---------------------------------------------------------------------------
// calculateEligibleSubtotal
// ---------------------------------------------------------------------------

describe("calculateEligibleSubtotal", () => {
	it("should return totalSubtotal equal to eligibleSubtotal when excludeSaleItems is false", () => {
		const items = [
			makeItem(5000, 1, 7000), // sale item
			makeItem(3000, 2, null), // full price
		];

		const result = calculateEligibleSubtotal(items, false);

		expect(result.totalSubtotal).toBe(11000); // 5000 + 6000
		expect(result.eligibleSubtotal).toBe(11000); // all items included
	});

	it("should exclude sale items from eligibleSubtotal when excludeSaleItems is true", () => {
		const items = [
			makeItem(5000, 1, 7000), // sale item → excluded
			makeItem(3000, 2, null), // full price → included
		];

		const result = calculateEligibleSubtotal(items, true);

		expect(result.totalSubtotal).toBe(11000); // 5000 + 6000
		expect(result.eligibleSubtotal).toBe(6000); // only full-price item
	});

	it("should include items where compareAtPrice is not null but is lower than priceInclTax (not a sale)", () => {
		// compareAtPrice <= priceInclTax → not considered a sale item
		const items = [makeItem(5000, 1, 3000)]; // compareAtPrice < price → not sale

		const result = calculateEligibleSubtotal(items, true);

		expect(result.eligibleSubtotal).toBe(5000);
		expect(result.totalSubtotal).toBe(5000);
	});

	it("should return 0 for both totals when cart is empty", () => {
		const result = calculateEligibleSubtotal([], true);

		expect(result.eligibleSubtotal).toBe(0);
		expect(result.totalSubtotal).toBe(0);
	});

	it("should return 0 eligibleSubtotal when all items are sale items and excludeSaleItems is true", () => {
		const items = [
			makeItem(2000, 1, 4000),
			makeItem(1500, 3, 2500),
		];

		const result = calculateEligibleSubtotal(items, true);

		expect(result.totalSubtotal).toBe(6500); // 2000 + 4500
		expect(result.eligibleSubtotal).toBe(0);
	});

	it("should account for quantity when summing item totals", () => {
		const items = [makeItem(1000, 5, null)]; // 5 × 1000 = 5000

		const result = calculateEligibleSubtotal(items, false);

		expect(result.totalSubtotal).toBe(5000);
		expect(result.eligibleSubtotal).toBe(5000);
	});
});

// ---------------------------------------------------------------------------
// calculateDiscountWithExclusion
// ---------------------------------------------------------------------------

describe("calculateDiscountWithExclusion", () => {
	describe("PERCENTAGE type", () => {
		it("should apply percentage to full subtotal when excludeSaleItems is false", () => {
			const cartItems = [
				makeItem(5000, 1, 7000), // sale item
				makeItem(3000, 1, null), // full price
			];

			// 20% of (5000 + 3000) = 1600
			const result = calculateDiscountWithExclusion({
				type: DiscountType.PERCENTAGE,
				value: 20,
				cartItems,
				excludeSaleItems: false,
			});

			expect(result).toBe(1600);
		});

		it("should apply percentage only to eligible subtotal when excludeSaleItems is true", () => {
			const cartItems = [
				makeItem(5000, 1, 7000), // sale item → excluded
				makeItem(3000, 1, null), // full price → 3000 eligible
			];

			// 20% of 3000 = 600
			const result = calculateDiscountWithExclusion({
				type: DiscountType.PERCENTAGE,
				value: 20,
				cartItems,
				excludeSaleItems: true,
			});

			expect(result).toBe(600);
		});

		it("should return 0 when all items are excluded and eligibleSubtotal is 0", () => {
			const cartItems = [
				makeItem(5000, 1, 7000),
				makeItem(3000, 2, 4000),
			];

			const result = calculateDiscountWithExclusion({
				type: DiscountType.PERCENTAGE,
				value: 30,
				cartItems,
				excludeSaleItems: true,
			});

			expect(result).toBe(0);
		});

		it("should floor the result when percentage produces a fraction on eligible subtotal", () => {
			// 10% of 333 = 33.3 → floored to 33
			const cartItems = [makeItem(333, 1, null)];

			const result = calculateDiscountWithExclusion({
				type: DiscountType.PERCENTAGE,
				value: 10,
				cartItems,
				excludeSaleItems: true,
			});

			expect(result).toBe(33);
		});
	});

	describe("FIXED_AMOUNT type", () => {
		it("should return the fixed amount when it is below the eligible subtotal", () => {
			const cartItems = [makeItem(5000, 1, null)];

			const result = calculateDiscountWithExclusion({
				type: DiscountType.FIXED_AMOUNT,
				value: 1000,
				cartItems,
				excludeSaleItems: false,
			});

			expect(result).toBe(1000);
		});

		it("should cap fixed amount at the eligible subtotal, not the total subtotal", () => {
			const cartItems = [
				makeItem(8000, 1, 10000), // sale item → excluded (eligible subtotal = 3000)
				makeItem(3000, 1, null),   // full price
			];

			// Fixed 5000, eligible = 3000 → capped at 3000
			const result = calculateDiscountWithExclusion({
				type: DiscountType.FIXED_AMOUNT,
				value: 5000,
				cartItems,
				excludeSaleItems: true,
			});

			expect(result).toBe(3000);
		});

		it("should return 0 when all items are sale items and excludeSaleItems is true", () => {
			const cartItems = [makeItem(5000, 1, 6000)];

			const result = calculateDiscountWithExclusion({
				type: DiscountType.FIXED_AMOUNT,
				value: 1000,
				cartItems,
				excludeSaleItems: true,
			});

			expect(result).toBe(0);
		});

		it("should return 0 when cart is empty", () => {
			const result = calculateDiscountWithExclusion({
				type: DiscountType.FIXED_AMOUNT,
				value: 1000,
				cartItems: [],
				excludeSaleItems: false,
			});

			expect(result).toBe(0);
		});
	});
});
