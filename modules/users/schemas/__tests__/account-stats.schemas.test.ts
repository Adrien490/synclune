import { describe, it, expect } from "vitest";

import { getAccountStatsSchema, fetchAccountStatsSchema } from "../account-stats.schemas";

// ============================================================================
// getAccountStatsSchema
// ============================================================================

describe("getAccountStatsSchema", () => {
	it("should accept undefined (schema is optional)", () => {
		const result = getAccountStatsSchema.safeParse(undefined);

		expect(result.success).toBe(true);
	});

	it("should accept an empty object", () => {
		const result = getAccountStatsSchema.safeParse({});

		expect(result.success).toBe(true);
	});

	it("should accept unknown keys (passthrough behaviour of optional empty object)", () => {
		const result = getAccountStatsSchema.safeParse({ unexpected: "value" });

		// z.object({}).optional() strips unknown keys by default — parse succeeds
		expect(result.success).toBe(true);
	});
});

// ============================================================================
// fetchAccountStatsSchema
// ============================================================================

describe("fetchAccountStatsSchema", () => {
	it("should accept a valid userId", () => {
		const result = fetchAccountStatsSchema.safeParse({ userId: "user-123" });

		expect(result.success).toBe(true);
	});

	it("should trim whitespace from userId", () => {
		const result = fetchAccountStatsSchema.safeParse({ userId: "  user-123  " });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.userId).toBe("user-123");
		}
	});

	it("should reject an empty userId string", () => {
		const result = fetchAccountStatsSchema.safeParse({ userId: "" });

		expect(result.success).toBe(false);
	});

	it("should reject a whitespace-only userId string", () => {
		const result = fetchAccountStatsSchema.safeParse({ userId: "   " });

		expect(result.success).toBe(false);
	});

	it("should reject when userId is missing", () => {
		const result = fetchAccountStatsSchema.safeParse({});

		expect(result.success).toBe(false);
	});

	it("should reject when userId is null", () => {
		const result = fetchAccountStatsSchema.safeParse({ userId: null });

		expect(result.success).toBe(false);
	});
});
