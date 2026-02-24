import { describe, it, expect } from "vitest";
import { formatEuro, eurosToCents, centsToEuros } from "../format-euro";

describe("formatEuro", () => {
	it("formats standard amount in cents", () => {
		const result = formatEuro(1999);
		// fr-FR uses non-breaking space and comma: "19,99 €"
		expect(result).toContain("19,99");
		expect(result).toContain("€");
	});

	it("formats 8900 cents", () => {
		const result = formatEuro(8900);
		expect(result).toContain("89,00");
		expect(result).toContain("€");
	});

	it("formats zero", () => {
		const result = formatEuro(0);
		expect(result).toContain("0,00");
		expect(result).toContain("€");
	});

	it("formats negative amount", () => {
		const result = formatEuro(-500);
		expect(result).toContain("5,00");
		expect(result).toContain("€");
	});

	it("returns dash for NaN", () => {
		expect(formatEuro(NaN)).toBe("—");
	});

	it("returns dash for Infinity", () => {
		expect(formatEuro(Infinity)).toBe("—");
	});

	it("returns dash for negative Infinity", () => {
		expect(formatEuro(-Infinity)).toBe("—");
	});

	it("strips trailing zeros in compact mode", () => {
		const result = formatEuro(5000, { compact: true });
		// Should be "50 €" not "50,00 €"
		expect(result).not.toContain(",00");
		expect(result).toContain("50");
		expect(result).toContain("€");
	});

	it("keeps decimals in compact mode when needed", () => {
		const result = formatEuro(5050, { compact: true });
		expect(result).toContain("50,5");
		expect(result).toContain("€");
	});

	it("shows two decimals in default mode", () => {
		const result = formatEuro(5000);
		expect(result).toContain("50,00");
	});

	it("returns dash for NaN in compact mode", () => {
		expect(formatEuro(NaN, { compact: true })).toBe("—");
	});

	it("returns dash for Infinity in compact mode", () => {
		expect(formatEuro(Infinity, { compact: true })).toBe("—");
	});
});

describe("eurosToCents", () => {
	it("converts 10 euros to 1000 cents", () => {
		expect(eurosToCents(10)).toBe(1000);
	});

	it("converts 89.99 euros to 8999 cents", () => {
		expect(eurosToCents(89.99)).toBe(8999);
	});

	it("converts euros to cents", () => {
		expect(eurosToCents(19.99)).toBe(1999);
	});

	it("rounds to nearest cent", () => {
		// 19.995 * 100 = 1999.5 → rounds to 2000
		expect(eurosToCents(19.995)).toBe(2000);
	});

	it("handles zero", () => {
		expect(eurosToCents(0)).toBe(0);
	});

	it("converts 0.01 euros to 1 cent", () => {
		expect(eurosToCents(0.01)).toBe(1);
	});
});

describe("centsToEuros", () => {
	it("converts 1000 cents to 10 euros", () => {
		expect(centsToEuros(1000)).toBe(10);
	});

	it("converts 8999 cents to 89.99 euros", () => {
		expect(centsToEuros(8999)).toBe(89.99);
	});

	it("converts cents to euros", () => {
		expect(centsToEuros(1999)).toBe(19.99);
	});

	it("handles zero", () => {
		expect(centsToEuros(0)).toBe(0);
	});

	it("converts 1 cent to 0.01 euros", () => {
		expect(centsToEuros(1)).toBe(0.01);
	});
});
