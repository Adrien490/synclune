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
});
