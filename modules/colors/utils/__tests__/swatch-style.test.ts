import { describe, expect, it } from "vitest";

import {
	areAllColorsLight,
	buildSwatchStyle,
	buildTintBarStyle,
	getSwatchAriaLabel,
} from "../swatch-style";

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

describe("buildTintBarStyle", () => {
	it("returns a muted background when no color is provided", () => {
		expect(buildTintBarStyle([])).toEqual({ backgroundColor: "var(--muted)" });
	});

	it("returns a solid backgroundColor for a single color", () => {
		expect(buildTintBarStyle(["#F5CF3C"])).toEqual({ backgroundColor: "#F5CF3C" });
	});

	/**
	 * Une BARRE, pas un disque : `buildSwatchStyle` peint en 135° (bicolore) puis
	 * en conique — sur 4 px de large, l'un comme l'autre ne rendent qu'une
	 * bouillie. Les bandes doivent être horizontales et à arrêts francs.
	 */
	it("empile des bandes horizontales à arrêts francs", () => {
		expect(buildTintBarStyle(["#F0568F", "#C0C0C0"])).toEqual({
			background: "linear-gradient(#F0568F 0.00% 50.00%, #C0C0C0 50.00% 100.00%)",
		});
	});

	it("répartit trois teintes en tiers égaux", () => {
		const { background } = buildTintBarStyle(["#F0568F", "#C0C0C0", "#E8B4B8"]) as {
			background: string;
		};

		expect(background).toContain("#F0568F 0.00% 33.33%");
		expect(background).toContain("#C0C0C0 33.33% 66.67%");
		expect(background).toContain("#E8B4B8 66.67% 100.00%");
	});

	it("n'emploie NI conic-gradient NI angle — ce serait le style d'un disque", () => {
		const { background } = buildTintBarStyle(["#F0568F", "#C0C0C0", "#E8B4B8"]) as {
			background: string;
		};

		expect(background).not.toContain("conic-gradient");
		expect(background).not.toContain("deg");
	});
});
