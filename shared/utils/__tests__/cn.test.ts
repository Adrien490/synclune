import { describe, it, expect } from "vitest";
import { cn } from "../cn";

describe("cn", () => {
	it("merges class names", () => {
		expect(cn("foo", "bar")).toBe("foo bar");
	});

	it("handles conditional classes", () => {
		const condition = false as boolean;
		expect(cn("base", condition && "hidden", "visible")).toBe("base visible");
	});

	it("deduplicates Tailwind classes", () => {
		expect(cn("p-4", "p-8")).toBe("p-8");
	});

	it("handles undefined and null", () => {
		expect(cn("base", undefined, null)).toBe("base");
	});

	it("handles empty input", () => {
		expect(cn()).toBe("");
	});

	it("merges conflicting Tailwind utilities", () => {
		expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
	});
});
