import { describe, expect, it } from "vitest";
import { stripeAppearance } from "../stripe-appearance";

describe("stripeAppearance", () => {
	it("uses the stripe theme", () => {
		expect(stripeAppearance.theme).toBe("stripe");
	});

	it("sets primary color to purple", () => {
		expect(stripeAppearance.variables?.colorPrimary).toBe("#7c3aed");
	});

	it("sets a 16px base font size for mobile accessibility", () => {
		expect(stripeAppearance.variables?.fontSizeBase).toBe("16px");
	});

	it("defines Input, Input:focus, Tab, Tab--selected, and Label rules", () => {
		const rules = stripeAppearance.rules;
		expect(rules).toBeDefined();
		expect(rules![".Input"]).toBeDefined();
		expect(rules![".Input:focus"]).toBeDefined();
		expect(rules![".Tab"]).toBeDefined();
		expect(rules![".Tab--selected"]).toBeDefined();
		expect(rules![".Label"]).toBeDefined();
	});

	it("Input:focus border matches primary color", () => {
		const focusRule = stripeAppearance.rules![".Input:focus"];
		expect(focusRule?.border).toContain("#7c3aed");
	});
});
