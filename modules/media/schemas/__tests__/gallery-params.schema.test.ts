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

	// --- variant (M2M combo key) ---

	it("returns valid mono-slug variant unchanged", () => {
		const result = parseGalleryParams({ variant: "or-rose" });
		expect(result.variant).toBe("or-rose");
	});

	it("returns valid bi-color combo unchanged", () => {
		const result = parseGalleryParams({ variant: "argent__or-rose" });
		expect(result.variant).toBe("argent__or-rose");
	});

	it("returns valid tri-color combo unchanged", () => {
		const result = parseGalleryParams({ variant: "argent__or-blanc__or-rose" });
		expect(result.variant).toBe("argent__or-blanc__or-rose");
	});

	it("returns undefined for variant with uppercase letters", () => {
		const result = parseGalleryParams({ variant: "Argent__Or-Rose" });
		expect(result.variant).toBeUndefined();
	});

	it("returns undefined for variant with trailing separator", () => {
		const result = parseGalleryParams({ variant: "or-rose__" });
		expect(result.variant).toBeUndefined();
	});

	it("returns undefined for variant with leading separator", () => {
		const result = parseGalleryParams({ variant: "__or-rose" });
		expect(result.variant).toBeUndefined();
	});

	it("returns undefined for variant with triple-underscore separator", () => {
		const result = parseGalleryParams({ variant: "argent___or-rose" });
		expect(result.variant).toBeUndefined();
	});

	it("returns undefined for variant with special characters", () => {
		const result = parseGalleryParams({ variant: "or-rose<script>" });
		expect(result.variant).toBeUndefined();
	});

	it("returns undefined for variant exceeding 150 characters", () => {
		const result = parseGalleryParams({ variant: "a".repeat(151) });
		expect(result.variant).toBeUndefined();
	});

	it("returns undefined for empty variant string", () => {
		const result = parseGalleryParams({ variant: "" });
		expect(result.variant).toBeUndefined();
	});
});
