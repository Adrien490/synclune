import { describe, expect, it } from "vitest";

import { computeDiscountPercent } from "../compute-discount-percent";

describe("computeDiscountPercent", () => {
	it("returns 0 when compareAtPrice is null", () => {
		expect(computeDiscountPercent(4800, null)).toBe(0);
	});

	it("returns 0 when compareAtPrice equals price", () => {
		expect(computeDiscountPercent(4800, 4800)).toBe(0);
	});

	it("returns 0 when compareAtPrice is lower than price", () => {
		expect(computeDiscountPercent(4800, 3600)).toBe(0);
	});

	it("returns 0 when price is 0 (avoids Infinity)", () => {
		expect(computeDiscountPercent(0, 4800)).toBe(0);
	});

	it("returns 0 when price is negative", () => {
		expect(computeDiscountPercent(-100, 4800)).toBe(0);
	});

	it("returns 25 for a 25% discount", () => {
		expect(computeDiscountPercent(3600, 4800)).toBe(25);
	});

	it("returns 50 for a 50% discount", () => {
		expect(computeDiscountPercent(2400, 4800)).toBe(50);
	});

	it("rounds to the nearest integer", () => {
		// 1 - 999/1499 = 0.3335... -> 33
		expect(computeDiscountPercent(999, 1499)).toBe(33);
	});
});
