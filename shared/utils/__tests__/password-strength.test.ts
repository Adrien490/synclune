import { describe, it, expect } from "vitest";
import {
	getStrengthLevel,
	getStrengthLabel,
	getStrengthColor,
	PASSWORD_RULES,
} from "../password-strength";

describe("PASSWORD_RULES", () => {
	it("requires at least 6 characters", () => {
		expect(PASSWORD_RULES[0]!.test("12345")).toBe(false);
		expect(PASSWORD_RULES[0]!.test("123456")).toBe(true);
	});
});

describe("getStrengthLevel", () => {
	it("returns 0 for empty string", () => {
		expect(getStrengthLevel("")).toBe(0);
	});

	it("returns 0 for short password", () => {
		expect(getStrengthLevel("abc")).toBe(0);
	});

	it("returns 0 for password with less than 6 chars", () => {
		expect(getStrengthLevel("12345")).toBe(0);
	});

	it("returns 1 for password with 6+ chars", () => {
		expect(getStrengthLevel("123456")).toBe(1);
	});

	it("returns 1 for long password", () => {
		expect(getStrengthLevel("a-very-long-password")).toBe(1);
	});
});

describe("getStrengthLabel", () => {
	it("returns 'Trop court' for level 0", () => {
		expect(getStrengthLabel(0)).toBe("Trop court");
	});

	it("returns 'Valide' for level 1", () => {
		expect(getStrengthLabel(1)).toBe("Valide");
	});

	it("returns empty string for unknown level", () => {
		expect(getStrengthLabel(99)).toBe("");
	});
});

describe("getStrengthColor", () => {
	it("returns destructive for level 0", () => {
		expect(getStrengthColor(0)).toBe("bg-destructive");
	});

	it("returns green for level 1", () => {
		expect(getStrengthColor(1)).toBe("bg-green-600");
	});

	it("returns muted for unknown level", () => {
		expect(getStrengthColor(99)).toBe("bg-muted");
	});
});
