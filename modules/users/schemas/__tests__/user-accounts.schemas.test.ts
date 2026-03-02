import { describe, it, expect } from "vitest";

import { getUserAccountsSchema, fetchUserAccountsSchema } from "../user-accounts.schemas";

// ============================================================================
// getUserAccountsSchema
// ============================================================================

describe("getUserAccountsSchema", () => {
	it("should accept undefined (schema is optional)", () => {
		const result = getUserAccountsSchema.safeParse(undefined);

		expect(result.success).toBe(true);
	});

	it("should accept an empty object", () => {
		const result = getUserAccountsSchema.safeParse({});

		expect(result.success).toBe(true);
	});

	it("should accept an object with extra keys (strips silently)", () => {
		const result = getUserAccountsSchema.safeParse({ someExtra: true });

		expect(result.success).toBe(true);
	});
});

// ============================================================================
// fetchUserAccountsSchema
// ============================================================================

describe("fetchUserAccountsSchema", () => {
	it("should accept a valid userId", () => {
		const result = fetchUserAccountsSchema.safeParse({ userId: "user-xyz-456" });

		expect(result.success).toBe(true);
	});

	it("should trim whitespace from userId", () => {
		const result = fetchUserAccountsSchema.safeParse({ userId: "  user-xyz-456  " });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.userId).toBe("user-xyz-456");
		}
	});

	it("should reject an empty userId string", () => {
		const result = fetchUserAccountsSchema.safeParse({ userId: "" });

		expect(result.success).toBe(false);
	});

	it("should reject a whitespace-only userId string", () => {
		const result = fetchUserAccountsSchema.safeParse({ userId: "   " });

		expect(result.success).toBe(false);
	});

	it("should reject when userId is missing", () => {
		const result = fetchUserAccountsSchema.safeParse({});

		expect(result.success).toBe(false);
	});

	it("should reject when userId is null", () => {
		const result = fetchUserAccountsSchema.safeParse({ userId: null });

		expect(result.success).toBe(false);
	});

	it("should reject when userId is a number", () => {
		const result = fetchUserAccountsSchema.safeParse({ userId: 99 });

		expect(result.success).toBe(false);
	});
});
