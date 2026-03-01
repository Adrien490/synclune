import { describe, it, expect } from "vitest";
import { hasSortByInput, parseSortField } from "../sort-field-parser";

describe("hasSortByInput", () => {
	it("should return true for a non-empty string", () => {
		expect(hasSortByInput("createdAt-desc")).toBe(true);
	});

	it("should return false for an empty string", () => {
		expect(hasSortByInput("")).toBe(false);
	});

	it("should return false for a string of only spaces", () => {
		expect(hasSortByInput("   ")).toBe(false);
	});

	it("should return false for null", () => {
		expect(hasSortByInput(null)).toBe(false);
	});

	it("should return false for undefined", () => {
		expect(hasSortByInput(undefined)).toBe(false);
	});

	it("should return false for a number", () => {
		expect(hasSortByInput(42)).toBe(false);
	});

	it("should return false for an object", () => {
		expect(hasSortByInput({})).toBe(false);
	});
});

describe("parseSortField", () => {
	it("should parse 'createdAt-desc'", () => {
		expect(parseSortField("createdAt-desc")).toEqual({ field: "createdAt", direction: "desc" });
	});

	it("should parse 'rating-asc'", () => {
		expect(parseSortField("rating-asc")).toEqual({ field: "rating", direction: "asc" });
	});

	it("should parse hyphenated field names like 'my-field-name-desc'", () => {
		expect(parseSortField("my-field-name-desc")).toEqual({
			field: "my-field-name",
			direction: "desc",
		});
	});

	it("should use 'createdAt' as default field when the string has no hyphen", () => {
		// "desc".split("-") → ["desc"], pop → "desc", join("") → ""
		expect(parseSortField("desc")).toEqual({ field: "createdAt", direction: "desc" });
	});

	it("should use custom defaultField when field part is empty", () => {
		expect(parseSortField("asc", "name")).toEqual({ field: "name", direction: "asc" });
	});

	it("should parse 'price-asc'", () => {
		expect(parseSortField("price-asc")).toEqual({ field: "price", direction: "asc" });
	});
});
