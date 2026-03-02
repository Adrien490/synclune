import { describe, it, expect } from "vitest";
import { getFirstParam } from "../params";

describe("getFirstParam", () => {
	it("returns the string value as-is", () => {
		expect(getFirstParam("hello")).toBe("hello");
	});

	it("returns the first element of an array", () => {
		expect(getFirstParam(["first", "second"])).toBe("first");
	});

	it("returns undefined for undefined", () => {
		expect(getFirstParam(undefined)).toBeUndefined();
	});

	it("returns undefined for an empty array", () => {
		expect(getFirstParam([])).toBeUndefined();
	});

	it("returns empty string as-is", () => {
		expect(getFirstParam("")).toBe("");
	});

	it("returns single-element array's value", () => {
		expect(getFirstParam(["only"])).toBe("only");
	});
});
