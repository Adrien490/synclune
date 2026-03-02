import { describe, it, expect } from "vitest";

import { getCurrentUserSchema, fetchCurrentUserSchema } from "../current-user.schemas";

// ============================================================================
// getCurrentUserSchema
// ============================================================================

describe("getCurrentUserSchema", () => {
	it("should accept undefined (schema is optional)", () => {
		const result = getCurrentUserSchema.safeParse(undefined);

		expect(result.success).toBe(true);
	});

	it("should accept an empty object", () => {
		const result = getCurrentUserSchema.safeParse({});

		expect(result.success).toBe(true);
	});

	it("should accept unknown keys (strips extra fields silently)", () => {
		const result = getCurrentUserSchema.safeParse({ extra: "ignored" });

		// z.object({}).optional() strips unknown keys — parse succeeds
		expect(result.success).toBe(true);
	});
});

// ============================================================================
// fetchCurrentUserSchema
// ============================================================================

describe("fetchCurrentUserSchema", () => {
	it("should accept a valid userId", () => {
		const result = fetchCurrentUserSchema.safeParse({ userId: "user-abc-123" });

		expect(result.success).toBe(true);
	});

	it("should trim whitespace from userId", () => {
		const result = fetchCurrentUserSchema.safeParse({ userId: "  user-abc-123  " });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.userId).toBe("user-abc-123");
		}
	});

	it("should reject an empty userId string", () => {
		const result = fetchCurrentUserSchema.safeParse({ userId: "" });

		expect(result.success).toBe(false);
	});

	it("should reject a whitespace-only userId string", () => {
		const result = fetchCurrentUserSchema.safeParse({ userId: "   " });

		expect(result.success).toBe(false);
	});

	it("should reject when userId is missing", () => {
		const result = fetchCurrentUserSchema.safeParse({});

		expect(result.success).toBe(false);
	});

	it("should reject when userId is null", () => {
		const result = fetchCurrentUserSchema.safeParse({ userId: null });

		expect(result.success).toBe(false);
	});

	it("should reject when userId is a number", () => {
		const result = fetchCurrentUserSchema.safeParse({ userId: 42 });

		expect(result.success).toBe(false);
	});
});
