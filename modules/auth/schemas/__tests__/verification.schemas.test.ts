import { describe, it, expect } from "vitest";
import {
	getVerificationSchema,
	verificationFiltersSchema,
	verificationSortBySchema,
	getVerificationsSchema,
} from "@/modules/auth/schemas/verification.schemas";
import {
	GET_VERIFICATIONS_DEFAULT_PER_PAGE,
	GET_VERIFICATIONS_DEFAULT_SORT_BY,
	GET_VERIFICATIONS_DEFAULT_SORT_ORDER,
	GET_VERIFICATIONS_MAX_RESULTS_PER_PAGE,
	GET_VERIFICATIONS_SORT_FIELDS,
} from "@/modules/auth/constants/verification.constants";

// ============================================================================
// getVerificationSchema
// ============================================================================

describe("getVerificationSchema", () => {
	it("should accept a valid non-empty id string", () => {
		const result = getVerificationSchema.safeParse({ id: "verification-abc" });
		expect(result.success).toBe(true);
	});

	it("should trim whitespace from id", () => {
		const result = getVerificationSchema.safeParse({ id: "  verification-abc  " });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.id).toBe("verification-abc");
	});

	it("should reject an empty string id", () => {
		const result = getVerificationSchema.safeParse({ id: "" });
		expect(result.success).toBe(false);
	});

	it("should reject a whitespace-only id", () => {
		const result = getVerificationSchema.safeParse({ id: "   " });
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// verificationFiltersSchema
// ============================================================================

describe("verificationFiltersSchema", () => {
	it("should accept an empty object (all fields optional)", () => {
		const result = verificationFiltersSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it("should accept identifier as a string", () => {
		const result = verificationFiltersSchema.safeParse({ identifier: "user@example.com" });
		expect(result.success).toBe(true);
	});

	it("should accept identifier as an array of strings", () => {
		const result = verificationFiltersSchema.safeParse({
			identifier: ["user1@example.com", "user2@example.com"],
		});
		expect(result.success).toBe(true);
	});

	it("should accept boolean filter fields isExpired and isActive", () => {
		const result = verificationFiltersSchema.safeParse({ isExpired: true, isActive: false });
		expect(result.success).toBe(true);
	});

	it("should coerce a date string for createdAfter", () => {
		const result = verificationFiltersSchema.safeParse({ createdAfter: "2022-04-20" });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.createdAfter).toBeInstanceOf(Date);
	});

	it("should reject createdAfter before 2020-01-01", () => {
		const result = verificationFiltersSchema.safeParse({ createdAfter: "2019-12-31" });
		expect(result.success).toBe(false);
	});

	it("should reject a future date for createdAfter (pastDateSchema)", () => {
		const future = new Date();
		future.setFullYear(future.getFullYear() + 1);
		const result = verificationFiltersSchema.safeParse({ createdAfter: future.toISOString() });
		expect(result.success).toBe(false);
	});

	it("should accept a future date for createdBefore (dateSchema allows future)", () => {
		const future = new Date();
		future.setFullYear(future.getFullYear() + 1);
		const result = verificationFiltersSchema.safeParse({ createdBefore: future.toISOString() });
		expect(result.success).toBe(true);
	});

	// Cross-field refinements

	it("should reject expiresAfter greater than expiresBefore", () => {
		const result = verificationFiltersSchema.safeParse({
			expiresAfter: "2025-06-01",
			expiresBefore: "2024-06-01",
		});
		expect(result.success).toBe(false);
	});

	it("should accept expiresAfter equal to expiresBefore", () => {
		const result = verificationFiltersSchema.safeParse({
			expiresAfter: "2025-06-01",
			expiresBefore: "2025-06-01",
		});
		expect(result.success).toBe(true);
	});

	it("should reject createdAfter greater than createdBefore", () => {
		const result = verificationFiltersSchema.safeParse({
			createdAfter: "2023-08-01",
			createdBefore: "2023-06-01",
		});
		expect(result.success).toBe(false);
	});

	it("should accept createdAfter equal to createdBefore", () => {
		const result = verificationFiltersSchema.safeParse({
			createdAfter: "2023-06-15",
			createdBefore: "2023-06-15",
		});
		expect(result.success).toBe(true);
	});

	it("should reject updatedAfter greater than updatedBefore", () => {
		const result = verificationFiltersSchema.safeParse({
			updatedAfter: "2023-09-01",
			updatedBefore: "2023-07-01",
		});
		expect(result.success).toBe(false);
	});

	it("should accept updatedAfter equal to updatedBefore", () => {
		const result = verificationFiltersSchema.safeParse({
			updatedAfter: "2023-08-15",
			updatedBefore: "2023-08-15",
		});
		expect(result.success).toBe(true);
	});
});

// ============================================================================
// verificationSortBySchema
// ============================================================================

describe("verificationSortBySchema", () => {
	it("should accept each valid sort field", () => {
		for (const field of GET_VERIFICATIONS_SORT_FIELDS) {
			const result = verificationSortBySchema.safeParse(field);
			expect(result.success).toBe(true);
			if (result.success) expect(result.data).toBe(field);
		}
	});

	it("should fall back to default sort field for an unknown string value", () => {
		const result = verificationSortBySchema.safeParse("unknownField");
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toBe(GET_VERIFICATIONS_DEFAULT_SORT_BY);
	});

	it("should fall back to default sort field for a non-string value", () => {
		const result = verificationSortBySchema.safeParse(undefined);
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toBe(GET_VERIFICATIONS_DEFAULT_SORT_BY);
	});
});

// ============================================================================
// getVerificationsSchema
// ============================================================================

describe("getVerificationsSchema", () => {
	it("should accept an empty object and apply all defaults", () => {
		const result = getVerificationsSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.direction).toBe("forward");
			expect(result.data.perPage).toBe(GET_VERIFICATIONS_DEFAULT_PER_PAGE);
			expect(result.data.sortBy).toBe(GET_VERIFICATIONS_DEFAULT_SORT_BY);
			expect(result.data.sortOrder).toBe(GET_VERIFICATIONS_DEFAULT_SORT_ORDER);
			expect(result.data.filters).toEqual({});
		}
	});

	it("should coerce perPage from a string number", () => {
		const result = getVerificationsSchema.safeParse({ perPage: "100" });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.perPage).toBe(100);
	});

	it("should reject perPage exceeding max", () => {
		const result = getVerificationsSchema.safeParse({
			perPage: GET_VERIFICATIONS_MAX_RESULTS_PER_PAGE + 1,
		});
		expect(result.success).toBe(false);
	});

	it("should reject perPage below 1", () => {
		const result = getVerificationsSchema.safeParse({ perPage: 0 });
		expect(result.success).toBe(false);
	});

	it("should accept both sortOrder values", () => {
		expect(getVerificationsSchema.safeParse({ sortOrder: "asc" }).success).toBe(true);
		expect(getVerificationsSchema.safeParse({ sortOrder: "desc" }).success).toBe(true);
	});

	it("should accept a valid cursor of exactly 25 characters", () => {
		const cursor = "a".repeat(25);
		const result = getVerificationsSchema.safeParse({ cursor });
		expect(result.success).toBe(true);
	});

	it("should reject a cursor with incorrect length", () => {
		const result = getVerificationsSchema.safeParse({ cursor: "short" });
		expect(result.success).toBe(false);
	});
});
