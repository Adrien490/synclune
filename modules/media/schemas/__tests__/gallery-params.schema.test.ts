import { describe, it, expect } from "vitest";
import { parseGalleryParams } from "../gallery-params.schema";

// ============================================================================
// parseGalleryParams
// ============================================================================

describe("parseGalleryParams", () => {
	it("returns valid color slug unchanged", () => {
		const result = parseGalleryParams({ color: "rose-gold" });
		expect(result.color).toBe("rose-gold");
	});

	it("returns valid material slug unchanged", () => {
		const result = parseGalleryParams({ material: "argent-925" });
		expect(result.material).toBe("argent-925");
	});

	it("returns valid size unchanged", () => {
		const result = parseGalleryParams({ size: "XS/S" });
		expect(result.size).toBe("XS/S");
	});

	it("returns undefined for missing parameters", () => {
		const result = parseGalleryParams({});
		expect(result.color).toBeUndefined();
		expect(result.material).toBeUndefined();
		expect(result.size).toBeUndefined();
	});

	it("returns undefined for color slug with uppercase letters", () => {
		const result = parseGalleryParams({ color: "Rose-Gold" });
		expect(result.color).toBeUndefined();
	});

	it("returns undefined for color slug with special characters", () => {
		const result = parseGalleryParams({ color: "rose<script>" });
		expect(result.color).toBeUndefined();
	});

	it("returns undefined for color slug exceeding 50 characters", () => {
		const longSlug = "a".repeat(51);
		const result = parseGalleryParams({ color: longSlug });
		expect(result.color).toBeUndefined();
	});

	it("accepts color slug of exactly 50 characters", () => {
		const slug = "a".repeat(50);
		const result = parseGalleryParams({ color: slug });
		expect(result.color).toBe(slug);
	});

	it("returns undefined for size exceeding 20 characters", () => {
		const result = parseGalleryParams({ size: "A".repeat(21) });
		expect(result.size).toBeUndefined();
	});

	it("returns undefined for size with forbidden characters", () => {
		const result = parseGalleryParams({ size: "<script>" });
		expect(result.size).toBeUndefined();
	});

	it("accepts a size with allowed separators", () => {
		const result = parseGalleryParams({ size: "38.5/39" });
		expect(result.size).toBe("38.5/39");
	});

	it("handles all three parameters together", () => {
		const result = parseGalleryParams({ color: "or", material: "or-18k", size: "S" });
		expect(result.color).toBe("or");
		expect(result.material).toBe("or-18k");
		expect(result.size).toBe("S");
	});

	it("returns undefined for empty string slug", () => {
		const result = parseGalleryParams({ color: "" });
		expect(result.color).toBeUndefined();
	});
});
