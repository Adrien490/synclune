import { describe, it, expect } from "vitest";
import { isLightColor, getContrastTextColor } from "../color-contrast.utils";

describe("isLightColor", () => {
	it("should return true for white (#FFFFFF)", () => {
		expect(isLightColor("#FFFFFF")).toBe(true);
	});

	it("should return false for black (#000000)", () => {
		expect(isLightColor("#000000")).toBe(false);
	});

	it("should return true for gold (#FFD700)", () => {
		expect(isLightColor("#FFD700")).toBe(true);
	});

	it("should return false for dark blue (#00008B)", () => {
		expect(isLightColor("#00008B")).toBe(false);
	});

	it("should handle hex without # prefix", () => {
		expect(isLightColor("FFFFFF")).toBe(true);
	});

	it("should return false for invalid 3-char hex (non-expanded)", () => {
		expect(isLightColor("#FFF")).toBe(false);
	});

	it("should respect custom threshold", () => {
		// Light yellow - high luminance
		expect(isLightColor("#FFFACD", 0.85)).toBe(true);
		// Medium gray - not above 0.85
		expect(isLightColor("#808080", 0.85)).toBe(false);
	});

	it("should return true for medium gray at default threshold", () => {
		// RGB(128,128,128) -> luminance ~0.502
		expect(isLightColor("#808080")).toBe(true);
	});
});

describe("getContrastTextColor", () => {
	it("should return 'black' for white background", () => {
		expect(getContrastTextColor("#FFFFFF")).toBe("black");
	});

	it("should return 'white' for black background", () => {
		expect(getContrastTextColor("#000000")).toBe("white");
	});

	it("should return 'black' for gold background", () => {
		expect(getContrastTextColor("#FFD700")).toBe("black");
	});

	it("should return 'white' for dark blue background", () => {
		expect(getContrastTextColor("#00008B")).toBe("white");
	});

	it("should return 'white' for red background (#FF0000)", () => {
		// Red: luminance = 0.299 * 255 / 255 = 0.299 < 0.5
		expect(getContrastTextColor("#FF0000")).toBe("white");
	});
});
