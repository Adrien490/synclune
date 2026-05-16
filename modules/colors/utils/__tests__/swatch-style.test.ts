import { describe, expect, it } from "vitest";

import { areAllColorsLight, buildSwatchStyle, getSwatchAriaLabel } from "../swatch-style";

describe("buildSwatchStyle", () => {
	it("returns a muted background when no color is provided", () => {
		expect(buildSwatchStyle([])).toEqual({ backgroundColor: "var(--muted)" });
	});

	it("returns a solid backgroundColor for a single color", () => {
		expect(buildSwatchStyle(["#FFD700"])).toEqual({ backgroundColor: "#FFD700" });
	});

	it("renders a 135deg linear-gradient for two colors (snapshot)", () => {
		expect(buildSwatchStyle(["#E5C9B3", "#C0C0C0"])).toMatchInlineSnapshot(`
			{
			  "background": "linear-gradient(135deg, #E5C9B3 0% 50%, #C0C0C0 50% 100%)",
			}
		`);
	});

	it("renders a conic-gradient with even sectors for three colors (snapshot)", () => {
		expect(buildSwatchStyle(["#FFD700", "#E5C9B3", "#FFFFFF"])).toMatchInlineSnapshot(`
			{
			  "background": "conic-gradient(from 0deg, #FFD700 0.00deg 120.00deg, #E5C9B3 120.00deg 240.00deg, #FFFFFF 240.00deg 360.00deg)",
			}
		`);
	});

	it("renders a conic-gradient with even sectors for four colors (snapshot)", () => {
		expect(buildSwatchStyle(["#A", "#B", "#C", "#D"])).toMatchInlineSnapshot(`
			{
			  "background": "conic-gradient(from 0deg, #A 0.00deg 90.00deg, #B 90.00deg 180.00deg, #C 180.00deg 270.00deg, #D 270.00deg 360.00deg)",
			}
		`);
	});
});

describe("getSwatchAriaLabel", () => {
	it("returns « Sans couleur » when names is empty", () => {
		expect(getSwatchAriaLabel([])).toBe("Sans couleur");
	});

	it("returns the single name as-is", () => {
		expect(getSwatchAriaLabel(["Or Rose"])).toBe("Or Rose");
	});

	it("joins two names with « et »", () => {
		expect(getSwatchAriaLabel(["Or Rose", "Argent"])).toBe("Or Rose et Argent");
	});

	it("joins 3+ names with comma then « et »", () => {
		expect(getSwatchAriaLabel(["Or Rose", "Argent", "Or Blanc"])).toBe(
			"Or Rose, Argent et Or Blanc",
		);
	});
});

describe("areAllColorsLight", () => {
	const lightnessAbove90 = (hex: string) => hex === "#FFFFFF" || hex === "#FAFAFA";

	it("returns false when the list is empty", () => {
		expect(areAllColorsLight([], lightnessAbove90)).toBe(false);
	});

	it("returns true only when every color is light", () => {
		expect(areAllColorsLight(["#FFFFFF", "#FAFAFA"], lightnessAbove90)).toBe(true);
	});

	it("returns false when at least one color is dark", () => {
		expect(areAllColorsLight(["#FFFFFF", "#000000"], lightnessAbove90)).toBe(false);
	});
});
