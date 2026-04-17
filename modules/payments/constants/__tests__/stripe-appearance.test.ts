import { describe, expect, it } from "vitest";
import { stripeAppearance } from "../stripe-appearance";

describe("stripeAppearance", () => {
	it("uses the stripe theme", () => {
		expect(stripeAppearance.theme).toBe("stripe");
	});

	it("maps colorPrimary to Synclune rose (--primary-text oklch equivalent)", () => {
		expect(stripeAppearance.variables?.colorPrimary).toBe("#b74585");
	});

	it("maps colorDanger to Synclune destructive (--destructive oklch equivalent)", () => {
		expect(stripeAppearance.variables?.colorDanger).toBe("#d14639");
	});

	it("maps colorText to Synclune foreground", () => {
		expect(stripeAppearance.variables?.colorText).toBe("#1a1a2e");
	});

	it("maps colorTextSecondary to Synclune muted-foreground", () => {
		expect(stripeAppearance.variables?.colorTextSecondary).toBe("#868592");
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
		expect(focusRule?.border).toContain("#b74585");
	});

	it("Input padding reaches 44px touch target (14px vertical)", () => {
		const inputRule = stripeAppearance.rules![".Input"];
		expect(inputRule?.padding).toBe("14px 12px");
	});

	it("Tab--selected border matches primary color", () => {
		const tabRule = stripeAppearance.rules![".Tab--selected"];
		expect(tabRule?.border).toContain("#b74585");
	});
});
