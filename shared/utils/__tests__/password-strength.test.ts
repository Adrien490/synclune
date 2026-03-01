import { describe, it, expect } from "vitest";
import {
	getStrengthLevel,
	getStrengthLabel,
	getStrengthColor,
	PASSWORD_RULES,
} from "../password-strength";

describe("PASSWORD_RULES", () => {
	it("requires at least 8 characters", () => {
		expect(PASSWORD_RULES[0]!.test("short")).toBe(false);
		expect(PASSWORD_RULES[0]!.test("eightchr")).toBe(true);
	});

	it("requires uppercase and lowercase", () => {
		expect(PASSWORD_RULES[1]!.test("alllowercase")).toBe(false);
		expect(PASSWORD_RULES[1]!.test("ALLUPPERCASE")).toBe(false);
		expect(PASSWORD_RULES[1]!.test("MixedCase")).toBe(true);
	});

	it("requires a digit or special character", () => {
		expect(PASSWORD_RULES[2]!.test("onlyletters")).toBe(false);
		expect(PASSWORD_RULES[2]!.test("withdigit1")).toBe(true);
		expect(PASSWORD_RULES[2]!.test("with@special")).toBe(true);
	});
});

describe("getStrengthLevel", () => {
	it("returns 0 for empty string", () => {
		expect(getStrengthLevel("")).toBe(0);
	});

	it("returns 0 for short password satisfying no rules", () => {
		expect(getStrengthLevel("abc")).toBe(0);
	});

	it("returns 2 for short password satisfying mixed case and digit rules but not length", () => {
		// Satisfies rule 2 (mixed case) and rule 3 (digit), but not rule 1 (length)
		expect(getStrengthLevel("Short1A")).toBe(2);
	});

	it("returns 1 for password with 8+ chars only", () => {
		// Satisfies only rule 1: length >= 8, all lowercase, no digit/special
		expect(getStrengthLevel("longword")).toBe(1);
	});

	it("returns 2 for password satisfying length and mixed case", () => {
		// Satisfies rule 1 (8+ chars) and rule 2 (mixed case), no digit/special
		expect(getStrengthLevel("MixedCas")).toBe(2);
	});

	it("returns 3 for password satisfying all rules", () => {
		// Satisfies all 3 rules: 8+ chars, mixed case, digit
		expect(getStrengthLevel("Strong1!")).toBe(3);
	});
});

describe("getStrengthLabel", () => {
	it("returns 'Trop court' for level 0", () => {
		expect(getStrengthLabel(0)).toBe("Trop court");
	});

	it("returns 'Faible' for level 1", () => {
		expect(getStrengthLabel(1)).toBe("Faible");
	});

	it("returns 'Moyen' for level 2", () => {
		expect(getStrengthLabel(2)).toBe("Moyen");
	});

	it("returns 'Fort' for level 3", () => {
		expect(getStrengthLabel(3)).toBe("Fort");
	});

	it("returns empty string for unknown level", () => {
		expect(getStrengthLabel(99)).toBe("");
	});
});

describe("getStrengthColor", () => {
	it("returns destructive for level 0", () => {
		expect(getStrengthColor(0)).toBe("bg-destructive");
	});

	it("returns destructive/70 for level 1", () => {
		expect(getStrengthColor(1)).toBe("bg-destructive/70");
	});

	it("returns warning for level 2", () => {
		expect(getStrengthColor(2)).toBe("bg-warning");
	});

	it("returns success for level 3", () => {
		expect(getStrengthColor(3)).toBe("bg-success");
	});

	it("returns muted for unknown level", () => {
		expect(getStrengthColor(99)).toBe("bg-muted");
	});
});
