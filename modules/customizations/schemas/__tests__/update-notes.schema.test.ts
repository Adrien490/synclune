import { describe, it, expect } from "vitest";

import { updateNotesSchema } from "../update-notes.schema";

// A valid cuid2 string (26 lowercase alphanumeric chars, starts with a letter).
const VALID_CUID = "clh1234567890abcdefghijklm";

// ============================================================================
// updateNotesSchema
// ============================================================================

describe("updateNotesSchema", () => {
	it("should accept valid requestId and non-empty notes", () => {
		const result = updateNotesSchema.safeParse({
			requestId: VALID_CUID,
			notes: "These are admin notes about this request.",
		});

		expect(result.success).toBe(true);
	});

	it("should preserve non-empty notes after trimming", () => {
		const result = updateNotesSchema.safeParse({
			requestId: VALID_CUID,
			notes: "  Important notes  ",
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.notes).toBe("Important notes");
		}
	});

	describe("notes field", () => {
		it("should transform empty string to null", () => {
			const result = updateNotesSchema.safeParse({
				requestId: VALID_CUID,
				notes: "",
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.notes).toBeNull();
			}
		});

		it("should transform whitespace-only string to null", () => {
			const result = updateNotesSchema.safeParse({
				requestId: VALID_CUID,
				notes: "   ",
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.notes).toBeNull();
			}
		});

		it("should accept notes at exactly 2000 characters", () => {
			const result = updateNotesSchema.safeParse({
				requestId: VALID_CUID,
				notes: "a".repeat(2000),
			});

			expect(result.success).toBe(true);
		});

		it("should reject notes exceeding 2000 characters", () => {
			const result = updateNotesSchema.safeParse({
				requestId: VALID_CUID,
				notes: "a".repeat(2001),
			});

			expect(result.success).toBe(false);
		});

		it("should reject when notes field is missing", () => {
			const result = updateNotesSchema.safeParse({ requestId: VALID_CUID });

			expect(result.success).toBe(false);
		});
	});

	describe("requestId field", () => {
		it("should reject an invalid requestId (not cuid2)", () => {
			const result = updateNotesSchema.safeParse({
				requestId: "not-a-cuid2",
				notes: "Some notes.",
			});

			expect(result.success).toBe(false);
		});

		it("should reject an empty requestId", () => {
			const result = updateNotesSchema.safeParse({
				requestId: "",
				notes: "Some notes.",
			});

			expect(result.success).toBe(false);
		});

		it("should reject when requestId is missing", () => {
			const result = updateNotesSchema.safeParse({ notes: "Some notes." });

			expect(result.success).toBe(false);
		});
	});
});
