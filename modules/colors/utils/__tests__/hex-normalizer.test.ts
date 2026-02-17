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
});
