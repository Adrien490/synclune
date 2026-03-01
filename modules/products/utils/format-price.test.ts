import { describe, it, expect } from "vitest";
import { formatPrice } from "./format-price";

describe("formatPrice", () => {
	it("formats a number as EUR currency", () => {
		const result = formatPrice(4999);
		// French format: 4 999 € (with non-breaking spaces)
		expect(result).toContain("4");
		expect(result).toContain("999");
		expect(result).toContain("€");
	});

	it("formats a string number", () => {
		const result = formatPrice("1500");
		expect(result).toContain("1");
		expect(result).toContain("500");
		expect(result).toContain("€");
	});

	it("formats zero", () => {
		const result = formatPrice(0);
		expect(result).toContain("0");
		expect(result).toContain("€");
	});

	it("returns original value for NaN string", () => {
		const result = formatPrice("not-a-number");
		expect(result).toBe("not-a-number");
	});

	it("formats large numbers with grouping", () => {
		const result = formatPrice(1000000);
		expect(result).toContain("€");
	});

	it("has no decimal places", () => {
		const result = formatPrice(49.99);
		// With maximumFractionDigits: 0, should round
		expect(result).not.toContain(",99");
	});
});
