import { describe, it, expect } from "vitest";
import { safeJsonLd } from "../safe-json-ld";

describe("safeJsonLd", () => {
	it("serializes a simple object", () => {
		expect(safeJsonLd({ name: "Test" })).toBe('{"name":"Test"}');
	});

	it("escapes < to \\u003c", () => {
		expect(safeJsonLd({ text: "<div>" })).toContain("\\u003c");
		expect(safeJsonLd({ text: "<div>" })).not.toContain("<");
	});

	it("escapes > to \\u003e", () => {
		expect(safeJsonLd({ text: "a>b" })).toContain("\\u003e");
		expect(safeJsonLd({ text: "a>b" })).not.toContain(">");
	});

	it("escapes & to \\u0026", () => {
		expect(safeJsonLd({ text: "a&b" })).toContain("\\u0026");
		expect(safeJsonLd({ text: "a&b" })).not.toContain("&");
	});

	it("escapes combined XSS payload", () => {
		const result = safeJsonLd({ text: "</script><script>alert('xss')</script>" });
		expect(result).not.toContain("</script>");
		expect(result).not.toContain("<script>");
		expect(result).toContain("\\u003c");
		expect(result).toContain("\\u003e");
	});

	it("preserves nested objects and arrays", () => {
		const data = { items: [{ name: "A" }, { name: "B" }], nested: { deep: true } };
		const result = safeJsonLd(data);
		const parsed = JSON.parse(result);
		expect(parsed.items).toHaveLength(2);
		expect(parsed.nested.deep).toBe(true);
	});

	it("serializes an empty object", () => {
		expect(safeJsonLd({})).toBe("{}");
	});

	it("escapes multiple occurrences of the same character", () => {
		const result = safeJsonLd({ text: "a<b<c" });
		// Both < should be replaced
		expect(result).not.toContain("<");
		expect(result.split("\\u003c").length - 1).toBe(2);
	});

	it("escapes all three special characters in one string", () => {
		const result = safeJsonLd({ text: "a<b>c&d" });
		expect(result).not.toContain("<");
		expect(result).not.toContain(">");
		expect(result).not.toContain("&");
		expect(result).toContain("\\u003c");
		expect(result).toContain("\\u003e");
		expect(result).toContain("\\u0026");
	});

	it("preserves numbers and booleans unchanged", () => {
		const result = safeJsonLd({ count: 42, active: true, ratio: 3.14 });
		const parsed = JSON.parse(result);
		expect(parsed.count).toBe(42);
		expect(parsed.active).toBe(true);
		expect(parsed.ratio).toBe(3.14);
	});

	it("preserves null values", () => {
		const result = safeJsonLd({ value: null });
		const parsed = JSON.parse(result);
		expect(parsed.value).toBeNull();
	});

	it("output is valid JSON after escaping", () => {
		const data = { text: "<script>alert('xss')</script>", url: "a&b=c" };
		const result = safeJsonLd(data);
		// JSON.parse should not throw
		expect(() => JSON.parse(result)).not.toThrow();
	});

	it("escapes characters in nested keys and arrays", () => {
		const data = { tags: ["<style>", "normal", "a&b"] };
		const result = safeJsonLd(data);
		expect(result).not.toContain("<");
		expect(result).not.toContain("&");
	});
});
