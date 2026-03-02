import { describe, it, expect } from "vitest";

import { getLastOrderSchema, fetchLastOrderSchema } from "../last-order.schemas";

// ============================================================================
// getLastOrderSchema
// ============================================================================

describe("getLastOrderSchema", () => {
	it("should accept undefined (schema is optional)", () => {
		const result = getLastOrderSchema.safeParse(undefined);

		expect(result.success).toBe(true);
	});

	it("should accept an empty object", () => {
		const result = getLastOrderSchema.safeParse({});

		expect(result.success).toBe(true);
	});

	it("should accept an object with extra keys (strips silently)", () => {
		const result = getLastOrderSchema.safeParse({ someExtra: "ignored" });

		expect(result.success).toBe(true);
	});
});

// ============================================================================
// fetchLastOrderSchema
// ============================================================================

describe("fetchLastOrderSchema", () => {
	it("should accept a valid userId", () => {
		const result = fetchLastOrderSchema.safeParse({ userId: "user-abc" });

		expect(result.success).toBe(true);
	});

	it("should trim whitespace from userId", () => {
		const result = fetchLastOrderSchema.safeParse({ userId: "  user-abc  " });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.userId).toBe("user-abc");
		}
	});

	it("should reject an empty userId string", () => {
		const result = fetchLastOrderSchema.safeParse({ userId: "" });

		expect(result.success).toBe(false);
	});

	it("should reject a whitespace-only userId string", () => {
		const result = fetchLastOrderSchema.safeParse({ userId: "   " });

		expect(result.success).toBe(false);
	});

	it("should reject when userId is missing", () => {
		const result = fetchLastOrderSchema.safeParse({});

		expect(result.success).toBe(false);
	});

	it("should reject when userId is null", () => {
		const result = fetchLastOrderSchema.safeParse({ userId: null });

		expect(result.success).toBe(false);
	});

	it("should reject when userId is a number", () => {
		const result = fetchLastOrderSchema.safeParse({ userId: 123 });

		expect(result.success).toBe(false);
	});
});
