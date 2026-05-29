import { describe, expect, it } from "vitest";

import { getContrastRatio, getRelativeLuminance, getSwatchContrast } from "../color-contrast.utils";

describe("getRelativeLuminance", () => {
	it("returns 0 for black and 1 for white", () => {
		expect(getRelativeLuminance("#000000")).toBeCloseTo(0, 5);
		expect(getRelativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
	});

	it("supports 3-digit hex and missing #", () => {
		expect(getRelativeLuminance("FFF")).toBeCloseTo(1, 5);
		expect(getRelativeLuminance("#000")).toBeCloseTo(0, 5);
	});

	it("returns null for invalid hex", () => {
		expect(getRelativeLuminance("#GGGGGG")).toBeNull();
		expect(getRelativeLuminance("xyz")).toBeNull();
	});
});

describe("getContrastRatio", () => {
	it("returns 21 for black on white (max contrast)", () => {
		expect(getContrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
	});

	it("returns 1 for identical colors", () => {
		expect(getContrastRatio("#3366CC", "#3366CC")).toBeCloseTo(1, 5);
	});

	it("is symmetric regardless of argument order", () => {
		const a = getContrastRatio("#123456", "#FEDCBA");
		const b = getContrastRatio("#FEDCBA", "#123456");
		expect(a).not.toBeNull();
		expect(a).toBeCloseTo(b as number, 5);
	});

	it("returns null when a hex is invalid", () => {
		expect(getContrastRatio("#000000", "nope")).toBeNull();
	});
});

describe("getSwatchContrast", () => {
	it("rates a black swatch on white as AAA", () => {
		const result = getSwatchContrast("#000000");
		expect(result?.rating).toBe("AAA");
		expect(result?.ratio).toBeCloseTo(21, 1);
	});

	it("rates a near-white swatch on white as faible", () => {
		const result = getSwatchContrast("#FAFAFA");
		expect(result?.rating).toBe("faible");
	});

	it("returns null for an invalid hex", () => {
		expect(getSwatchContrast("#ZZZ")).toBeNull();
	});
});
