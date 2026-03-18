import { describe, it, expect } from "vitest";
import {
	getSessionSchema,
	sessionFiltersSchema,
	sessionSortBySchema,
	getSessionsSchema,
} from "@/modules/auth/schemas/session.schemas";
import {
	GET_SESSIONS_DEFAULT_PER_PAGE,
	GET_SESSIONS_DEFAULT_SORT_BY,
	GET_SESSIONS_DEFAULT_SORT_ORDER,
	GET_SESSIONS_MAX_RESULTS_PER_PAGE,
	GET_SESSIONS_SORT_FIELDS,
} from "@/modules/auth/constants/session.constants";

// ============================================================================
// getSessionSchema
// ============================================================================

describe("getSessionSchema", () => {
	it("should accept a non-empty id string", () => {
		const result = getSessionSchema.safeParse({ id: "session-abc-123" });
		expect(result.success).toBe(true);
	});

	it("should trim whitespace from id", () => {
		const result = getSessionSchema.safeParse({ id: "  session-id  " });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.id).toBe("session-id");
	});

	it("should reject an empty id string", () => {
		const result = getSessionSchema.safeParse({ id: "" });
		expect(result.success).toBe(false);
	});

	it("should reject a whitespace-only id", () => {
		const result = getSessionSchema.safeParse({ id: "   " });
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// sessionFiltersSchema
// ============================================================================

describe("sessionFiltersSchema", () => {
	it("should accept an empty object (all fields optional)", () => {
		const result = sessionFiltersSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it("should accept a single userId string", () => {
		const result = sessionFiltersSchema.safeParse({ userId: "user-1" });
		expect(result.success).toBe(true);
	});

	it("should accept userId as an array", () => {
		const result = sessionFiltersSchema.safeParse({ userId: ["user-1", "user-2"] });
		expect(result.success).toBe(true);
	});

	it("should accept boolean filter fields", () => {
		const result = sessionFiltersSchema.safeParse({
			isExpired: true,
			isActive: false,
			hasIpAddress: true,
			hasUserAgent: false,
		});
		expect(result.success).toBe(true);
	});

	it("should coerce a valid date string for createdAfter", () => {
		const result = sessionFiltersSchema.safeParse({ createdAfter: "2022-05-10" });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.createdAfter).toBeInstanceOf(Date);
	});

	it("should reject createdAfter before 2020-01-01", () => {
		const result = sessionFiltersSchema.safeParse({ createdAfter: "2019-12-31" });
		expect(result.success).toBe(false);
	});

	it("should reject a future date for createdAfter (pastDateSchema)", () => {
		const future = new Date();
		future.setFullYear(future.getFullYear() + 1);
		const result = sessionFiltersSchema.safeParse({ createdAfter: future.toISOString() });
		expect(result.success).toBe(false);
	});

	it("should accept a future date for createdBefore (dateSchema allows future)", () => {
		const future = new Date();
		future.setFullYear(future.getFullYear() + 1);
		const result = sessionFiltersSchema.safeParse({ createdBefore: future.toISOString() });
		expect(result.success).toBe(true);
	});

	it("should reject createdAfter greater than createdBefore", () => {
		const result = sessionFiltersSchema.safeParse({
			createdAfter: "2023-06-15",
			createdBefore: "2023-01-01",
		});
		expect(result.success).toBe(false);
	});

	it("should accept createdAfter equal to createdBefore", () => {
		const result = sessionFiltersSchema.safeParse({
			createdAfter: "2023-06-15",
			createdBefore: "2023-06-15",
		});
		expect(result.success).toBe(true);
	});

	it("should reject updatedAfter greater than updatedBefore", () => {
		const result = sessionFiltersSchema.safeParse({
			updatedAfter: "2023-09-01",
			updatedBefore: "2023-08-01",
		});
		expect(result.success).toBe(false);
	});

	it("should reject expiresAfter greater than expiresBefore", () => {
		const result = sessionFiltersSchema.safeParse({
			expiresAfter: "2025-01-01",
			expiresBefore: "2024-01-01",
		});
		expect(result.success).toBe(false);
	});

	it("should accept expiresAfter equal to expiresBefore", () => {
		const result = sessionFiltersSchema.safeParse({
			expiresAfter: "2025-06-01",
			expiresBefore: "2025-06-01",
		});
		expect(result.success).toBe(true);
	});

	it("should accept ipAddress as a string or array", () => {
		expect(sessionFiltersSchema.safeParse({ ipAddress: "192.168.1.1" }).success).toBe(true);
		expect(sessionFiltersSchema.safeParse({ ipAddress: ["192.168.1.1", "10.0.0.1"] }).success).toBe(
			true,
		);
	});
});

// ============================================================================
// sessionSortBySchema
// ============================================================================

describe("sessionSortBySchema", () => {
	it("should accept each valid sort field", () => {
		for (const field of GET_SESSIONS_SORT_FIELDS) {
			const result = sessionSortBySchema.safeParse(field);
			expect(result.success).toBe(true);
			if (result.success) expect(result.data).toBe(field);
		}
	});

	it("should fall back to default sort field for an unknown value", () => {
		const result = sessionSortBySchema.safeParse("unknownField");
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toBe(GET_SESSIONS_DEFAULT_SORT_BY);
	});

	it("should fall back to default sort field for a non-string value", () => {
		const result = sessionSortBySchema.safeParse(42);
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toBe(GET_SESSIONS_DEFAULT_SORT_BY);
	});
});

// ============================================================================
// getSessionsSchema
// ============================================================================

describe("getSessionsSchema", () => {
	it("should accept an empty object and apply all defaults", () => {
		const result = getSessionsSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.direction).toBe("forward");
			expect(result.data.perPage).toBe(GET_SESSIONS_DEFAULT_PER_PAGE);
			expect(result.data.sortBy).toBe(GET_SESSIONS_DEFAULT_SORT_BY);
			expect(result.data.sortOrder).toBe(GET_SESSIONS_DEFAULT_SORT_ORDER);
			expect(result.data.filters).toEqual({});
		}
	});

	it("should coerce perPage from a string number", () => {
		const result = getSessionsSchema.safeParse({ perPage: "50" });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.perPage).toBe(50);
	});

	it("should reject perPage exceeding max", () => {
		const result = getSessionsSchema.safeParse({ perPage: GET_SESSIONS_MAX_RESULTS_PER_PAGE + 1 });
		expect(result.success).toBe(false);
	});

	it("should accept both sortOrder values", () => {
		expect(getSessionsSchema.safeParse({ sortOrder: "asc" }).success).toBe(true);
		expect(getSessionsSchema.safeParse({ sortOrder: "desc" }).success).toBe(true);
	});

	it("should reject an invalid sortOrder value", () => {
		const result = getSessionsSchema.safeParse({ sortOrder: "random" });
		expect(result.success).toBe(false);
	});
});
