import { describe, it, expect } from "vitest";
import { calculateAverageRating, formatRating, getRatingLabel } from "../rating-utils";

describe("calculateAverageRating", () => {
	it("should return 0 for an empty array", () => {
		expect(calculateAverageRating([])).toBe(0);
	});

	it("should return the single rating for a one-element array", () => {
		expect(calculateAverageRating([4])).toBe(4);
	});

	it("should calculate a simple average", () => {
		expect(calculateAverageRating([4, 5])).toBe(4.5);
	});

	it("should round to 2 decimal places", () => {
		// (1 + 2 + 3) / 3 = 2 (exact)
		expect(calculateAverageRating([1, 2, 3])).toBe(2);
	});

	it("should round to 2 decimal places for repeating decimals", () => {
		// (1 + 1 + 2) / 3 = 1.333... → rounds to 1.33
		expect(calculateAverageRating([1, 1, 2])).toBe(1.33);
	});

	it("should handle all same ratings", () => {
		expect(calculateAverageRating([5, 5, 5, 5])).toBe(5);
	});

	it("should handle ratings with zero", () => {
		expect(calculateAverageRating([0, 0, 4])).toBeCloseTo(1.33, 2);
	});
});

describe("formatRating", () => {
	it("should format 4.5 with French locale using comma", () => {
		const result = formatRating(4.5);
		// fr-FR uses comma as decimal separator
		expect(result).toBe("4,5");
	});

	it("should format a whole number with one decimal place", () => {
		expect(formatRating(5)).toBe("5,0");
	});

	it("should use en-US locale with dot separator", () => {
		expect(formatRating(4.5, "en-US")).toBe("4.5");
	});

	it("should format 0 as '0,0' in fr-FR", () => {
		expect(formatRating(0)).toBe("0,0");
	});

	it("should always show exactly one decimal place", () => {
		// 4.56 should be formatted to 1 decimal → 4.6 (maximumFractionDigits: 1)
		const result = formatRating(4.56, "en-US");
		expect(result).toBe("4.6");
	});
});

describe("getRatingLabel", () => {
	it("should return 'Excellent' for rating 5", () => {
		expect(getRatingLabel(5)).toBe("Excellent");
	});

	it("should return 'Très bien' for rating 4", () => {
		expect(getRatingLabel(4)).toBe("Très bien");
	});

	it("should return 'Bien' for rating 3", () => {
		expect(getRatingLabel(3)).toBe("Bien");
	});

	it("should return 'Passable' for rating 2", () => {
		expect(getRatingLabel(2)).toBe("Passable");
	});

	it("should return 'Mauvais' for rating 1", () => {
		expect(getRatingLabel(1)).toBe("Mauvais");
	});

	it("should return empty string for an unknown rating (0)", () => {
		expect(getRatingLabel(0)).toBe("");
	});

	it("should return empty string for out-of-range rating (6)", () => {
		expect(getRatingLabel(6)).toBe("");
	});
});
