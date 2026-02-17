import { describe, it, expect } from "vitest";
import { parseGalleryParams } from "../schemas/gallery-params.schema";

// ============================================================================
// parseGalleryParams
// ============================================================================

describe("parseGalleryParams", () => {
	describe("color and material (variant slugs)", () => {
		it("accepts a valid lowercase slug with hyphens", () => {
			const result = parseGalleryParams({ color: "or-rose" });
			expect(result.color).toBe("or-rose");
		});

		it("accepts a valid slug with digits", () => {
			const result = parseGalleryParams({ material: "argent-925" });
			expect(result.material).toBe("argent-925");
		});

		it("accepts a slug at the maximum allowed length (50 chars)", () => {
			const slug = "a".repeat(50);
			const result = parseGalleryParams({ color: slug });
			expect(result.color).toBe(slug);
		});

		it("rejects a slug that is too long (51+ chars)", () => {
			const slug = "a".repeat(51);
			const result = parseGalleryParams({ color: slug });
			expect(result.color).toBeUndefined();
		});

		it("rejects uppercase letters in slug", () => {
			const result = parseGalleryParams({ color: "Or-Rose" });
			expect(result.color).toBeUndefined();
		});

		it("rejects a slug containing a slash", () => {
			const result = parseGalleryParams({ color: "or/rose" });
			expect(result.color).toBeUndefined();
		});

		it("rejects a slug containing spaces", () => {
			const result = parseGalleryParams({ color: "or rose" });
			expect(result.color).toBeUndefined();
		});

		it("rejects a slug containing special characters", () => {
			const result = parseGalleryParams({ color: "or_rose" });
			expect(result.color).toBeUndefined();
		});

		it("returns undefined for an undefined color", () => {
			const result = parseGalleryParams({ color: undefined });
			expect(result.color).toBeUndefined();
		});

		it("returns undefined for an empty string color", () => {
			const result = parseGalleryParams({ color: "" });
			expect(result.color).toBeUndefined();
		});
	});

	describe("size parameter", () => {
		it("accepts a short size string", () => {
			const result = parseGalleryParams({ size: "M" });
			expect(result.size).toBe("M");
		});

		it("accepts a numeric size", () => {
			const result = parseGalleryParams({ size: "42" });
			expect(result.size).toBe("42");
		});

		it("accepts a size at the maximum allowed length (20 chars)", () => {
			const size = "a".repeat(20);
			const result = parseGalleryParams({ size });
			expect(result.size).toBe(size);
		});

		it("rejects a size that is too long (21+ chars)", () => {
			const size = "a".repeat(21);
			const result = parseGalleryParams({ size });
			expect(result.size).toBeUndefined();
		});

		it("accepts uppercase and slash separators", () => {
			const result = parseGalleryParams({ size: "XL/XXL" });
			expect(result.size).toBe("XL/XXL");
		});

		it("accepts a size with dot separator", () => {
			const result = parseGalleryParams({ size: "7.5" });
			expect(result.size).toBe("7.5");
		});

		it("accepts a size with comma separator", () => {
			const result = parseGalleryParams({ size: "38,5" });
			expect(result.size).toBe("38,5");
		});

		it("accepts a size with space", () => {
			const result = parseGalleryParams({ size: "One Size" });
			expect(result.size).toBe("One Size");
		});

		it("rejects HTML tags (regex constraint)", () => {
			const result = parseGalleryParams({ size: "<b>bold</b>" });
			expect(result.size).toBeUndefined();
		});

		it("rejects an XSS attempt", () => {
			const result = parseGalleryParams({ size: "<script>alert(1)</script>" });
			expect(result.size).toBeUndefined();
		});

		it("rejects special characters outside allowed set", () => {
			const result = parseGalleryParams({ size: "M&L" });
			expect(result.size).toBeUndefined();
		});

		it("returns undefined for an undefined size", () => {
			const result = parseGalleryParams({ size: undefined });
			expect(result.size).toBeUndefined();
		});

		it("returns undefined for an empty string size", () => {
			const result = parseGalleryParams({ size: "" });
			expect(result.size).toBeUndefined();
		});
	});

	describe("empty and undefined params", () => {
		it("returns all fields as undefined when given an empty object", () => {
			const result = parseGalleryParams({});
			expect(result.color).toBeUndefined();
			expect(result.material).toBeUndefined();
			expect(result.size).toBeUndefined();
		});

		it("returns all fields as undefined when all params are undefined", () => {
			const result = parseGalleryParams({
				color: undefined,
				material: undefined,
				size: undefined,
			});
			expect(result.color).toBeUndefined();
			expect(result.material).toBeUndefined();
			expect(result.size).toBeUndefined();
		});
	});

	describe("mixed valid and invalid params", () => {
		it("returns valid fields and undefined for invalid fields", () => {
			const result = parseGalleryParams({
				color: "or-rose",
				material: "INVALID_UPPER",
				size: "M",
			});
			expect(result.color).toBe("or-rose");
			expect(result.material).toBeUndefined();
			expect(result.size).toBe("M");
		});

		it("handles all three params simultaneously", () => {
			const result = parseGalleryParams({
				color: "argent",
				material: "cuir",
				size: "42",
			});
			expect(result.color).toBe("argent");
			expect(result.material).toBe("cuir");
			expect(result.size).toBe("42");
		});
	});
});
