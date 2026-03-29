import { describe, it, expect } from "vitest";
import { installPromptCookieSchema, installPromptActionSchema } from "../install-prompt.schema";

// ============================================================================
// installPromptCookieSchema
// ============================================================================

describe("installPromptCookieSchema", () => {
	it("accepts valid data with all fields present", () => {
		const result = installPromptCookieSchema.safeParse({ v: 3, d: 1, p: false });
		expect(result.success).toBe(true);
	});

	it("accepts zero values for v and d", () => {
		const result = installPromptCookieSchema.safeParse({ v: 0, d: 0, p: false });
		expect(result.success).toBe(true);
	});

	it("accepts p=true", () => {
		const result = installPromptCookieSchema.safeParse({ v: 0, d: 3, p: true });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.p).toBe(true);
		}
	});

	it("rejects negative value for v", () => {
		const result = installPromptCookieSchema.safeParse({ v: -1, d: 0, p: false });
		expect(result.success).toBe(false);
	});

	it("rejects negative value for d", () => {
		const result = installPromptCookieSchema.safeParse({ v: 0, d: -1, p: false });
		expect(result.success).toBe(false);
	});

	it("rejects float value for v", () => {
		const result = installPromptCookieSchema.safeParse({ v: 1.5, d: 0, p: false });
		expect(result.success).toBe(false);
	});

	it("rejects float value for d", () => {
		const result = installPromptCookieSchema.safeParse({ v: 0, d: 2.7, p: false });
		expect(result.success).toBe(false);
	});

	it("rejects string value for v", () => {
		const result = installPromptCookieSchema.safeParse({ v: "3", d: 0, p: false });
		expect(result.success).toBe(false);
	});

	it("rejects non-boolean value for p", () => {
		const result = installPromptCookieSchema.safeParse({ v: 0, d: 0, p: "true" });
		expect(result.success).toBe(false);
	});

	it("rejects missing field p", () => {
		const result = installPromptCookieSchema.safeParse({ v: 0, d: 0 });
		expect(result.success).toBe(false);
	});

	it("rejects missing field v", () => {
		const result = installPromptCookieSchema.safeParse({ d: 0, p: false });
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// installPromptActionSchema
// ============================================================================

describe("installPromptActionSchema", () => {
	it('accepts action "dismiss"', () => {
		const result = installPromptActionSchema.safeParse({ action: "dismiss" });
		expect(result.success).toBe(true);
	});

	it('accepts action "install"', () => {
		const result = installPromptActionSchema.safeParse({ action: "install" });
		expect(result.success).toBe(true);
	});

	it('accepts action "visit"', () => {
		const result = installPromptActionSchema.safeParse({ action: "visit" });
		expect(result.success).toBe(true);
	});

	it("rejects an unknown action string", () => {
		const result = installPromptActionSchema.safeParse({ action: "close" });
		expect(result.success).toBe(false);
	});

	it("rejects missing action field", () => {
		const result = installPromptActionSchema.safeParse({});
		expect(result.success).toBe(false);
	});

	it("rejects numeric action value", () => {
		const result = installPromptActionSchema.safeParse({ action: 1 });
		expect(result.success).toBe(false);
	});
});
