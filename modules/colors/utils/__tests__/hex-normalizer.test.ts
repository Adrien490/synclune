import { describe, it, expect } from "vitest";
import { normalizeHex } from "../hex-normalizer";

describe("normalizeHex", () => {
	it("should normalize a 6-digit hex with # prefix", () => {
		expect(normalizeHex("#ff5733")).toBe("#FF5733");
	});

	it("should normalize a 6-digit hex without # prefix", () => {
		expect(normalizeHex("ff5733")).toBe("#FF5733");
	});

	it("should expand a 3-digit hex to 6-digit with # prefix", () => {
		expect(normalizeHex("#f00")).toBe("#FF0000");
	});

	it("should expand a 3-digit hex to 6-digit without # prefix", () => {
		expect(normalizeHex("abc")).toBe("#AABBCC");
	});

	it("should preserve already uppercase hex", () => {
		expect(normalizeHex("#FF5733")).toBe("#FF5733");
	});

	it("should handle mixed case", () => {
		expect(normalizeHex("#fF5733")).toBe("#FF5733");
	});

	it("should trim whitespace", () => {
		expect(normalizeHex("  #ff5733  ")).toBe("#FF5733");
	});

	it("should handle 3-digit shorthand for white", () => {
		expect(normalizeHex("#fff")).toBe("#FFFFFF");
	});

	it("should handle 3-digit shorthand for black", () => {
		expect(normalizeHex("#000")).toBe("#000000");
	});

	// L'util ne valide pas (la validation est dans `hexColorSchema.superRefine`).
	// Ces tests verrouillent le contrat : sur garbage input, on garde la forme
	// `#XXXXXX` upper-case sans crasher — la validation Zod prend le relais.
	it("passes through 7-char input as #XXXXXXX (validation is the schema's job)", () => {
		expect(normalizeHex("#FFFFFFF")).toBe("#FFFFFFF");
	});

	it("preserves non-hex characters upper-cased without crashing", () => {
		expect(normalizeHex("#gghhii")).toBe("#GGHHII");
	});

	it("does not invent missing chars on 4-char input", () => {
		// 4-char ≠ 3 ni 6, donc no expansion — sort tel quel upper-case.
		expect(normalizeHex("#abcd")).toBe("#ABCD");
	});
});
