import { describe, it, expect } from "vitest";
import { recentProductSlugSchema } from "../recent-product-schema";

// ============================================================================
// recentProductSlugSchema
// ============================================================================

describe("recentProductSlugSchema", () => {
	// --------------------------------------------------------------------------
	// Valid slugs
	// --------------------------------------------------------------------------

	it('accepts a typical product slug "bracelet-argent"', () => {
		const result = recentProductSlugSchema.safeParse("bracelet-argent");
		expect(result.success).toBe(true);
	});

	it('accepts single character slug "a"', () => {
		const result = recentProductSlugSchema.safeParse("a");
		expect(result.success).toBe(true);
	});

	it('accepts numeric-only slug "123"', () => {
		const result = recentProductSlugSchema.safeParse("123");
		expect(result.success).toBe(true);
	});

	it("accepts a slug of exactly 100 characters", () => {
		const slug = "a".repeat(100);
		const result = recentProductSlugSchema.safeParse(slug);
		expect(result.success).toBe(true);
	});

	it("accepts slugs with digits and hyphens mixed", () => {
		const result = recentProductSlugSchema.safeParse("bague-or-18k-2024");
		expect(result.success).toBe(true);
	});

	// --------------------------------------------------------------------------
	// Minimum length
	// --------------------------------------------------------------------------

	it("rejects an empty string (min 1)", () => {
		const result = recentProductSlugSchema.safeParse("");
		expect(result.success).toBe(false);
	});

	// --------------------------------------------------------------------------
	// Maximum length
	// --------------------------------------------------------------------------

	it("rejects a slug of 101 characters (max 100)", () => {
		const slug = "a".repeat(101);
		const result = recentProductSlugSchema.safeParse(slug);
		expect(result.success).toBe(false);
	});

	// --------------------------------------------------------------------------
	// Invalid characters
	// --------------------------------------------------------------------------

	it('rejects uppercase letters "Bracelet"', () => {
		const result = recentProductSlugSchema.safeParse("Bracelet");
		expect(result.success).toBe(false);
	});

	it('rejects slug with space "hello world"', () => {
		const result = recentProductSlugSchema.safeParse("hello world");
		expect(result.success).toBe(false);
	});

	it('rejects slug with accented characters "café"', () => {
		const result = recentProductSlugSchema.safeParse("café");
		expect(result.success).toBe(false);
	});

	it("rejects slug with underscore", () => {
		const result = recentProductSlugSchema.safeParse("bracelet_argent");
		expect(result.success).toBe(false);
	});

	it("rejects slug with special characters", () => {
		const result = recentProductSlugSchema.safeParse("bracelet<script>");
		expect(result.success).toBe(false);
	});

	it("rejects slug with dots", () => {
		const result = recentProductSlugSchema.safeParse("bracelet.argent");
		expect(result.success).toBe(false);
	});
});
