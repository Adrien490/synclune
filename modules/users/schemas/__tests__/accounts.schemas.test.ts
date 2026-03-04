import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Hoisted mocks — must be defined before any module under test is imported.
// ---------------------------------------------------------------------------

vi.mock("@/shared/constants/pagination", () => ({
	cursorSchema: z.string().optional(),
	directionSchema: z.enum(["forward", "backward"]).optional(),
}));

vi.mock("@/shared/utils/pagination", () => ({
	createPerPageSchema: (defaultVal: number, _max: number) => z.number().default(defaultVal),
}));

vi.mock("@/shared/schemas/filters.schema", () => ({
	optionalStringOrStringArraySchema: z.union([z.string(), z.array(z.string())]).optional(),
}));

vi.mock("../../constants/accounts.constants", () => ({
	GET_ACCOUNTS_DEFAULT_PER_PAGE: 50,
	GET_ACCOUNTS_MAX_RESULTS_PER_PAGE: 200,
	GET_ACCOUNTS_DEFAULT_SORT_BY: "createdAt",
	GET_ACCOUNTS_DEFAULT_SORT_ORDER: "desc",
	GET_ACCOUNTS_SORT_FIELDS: ["createdAt", "updatedAt", "providerId"],
}));

import {
	getAccountSchema,
	accountFiltersSchema,
	accountSortBySchema,
	getAccountsSchema,
} from "../accounts.schemas";

// A valid cuid2 string (26 lowercase alphanumeric chars, starts with a letter).
const VALID_CUID = "clh1234567890abcdefghijklm";

// ============================================================================
// getAccountSchema
// ============================================================================

describe("getAccountSchema", () => {
	it("accepts a valid cuid2 id", () => {
		const result = getAccountSchema.safeParse({ id: VALID_CUID });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.id).toBe(VALID_CUID);
		}
	});

	it("rejects an invalid id format", () => {
		const result = getAccountSchema.safeParse({ id: "not-a-cuid2" });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe("ID de compte invalide");
		}
	});

	it("rejects an empty id string", () => {
		const result = getAccountSchema.safeParse({ id: "" });
		expect(result.success).toBe(false);
	});

	it("rejects when id is missing", () => {
		const result = getAccountSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// accountFiltersSchema
// ============================================================================

describe("accountFiltersSchema", () => {
	it("accepts an empty object", () => {
		const result = accountFiltersSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it("accepts hasAccessToken: true", () => {
		const result = accountFiltersSchema.safeParse({ hasAccessToken: true });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.hasAccessToken).toBe(true);
		}
	});

	it("accepts hasAccessToken: false", () => {
		const result = accountFiltersSchema.safeParse({ hasAccessToken: false });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.hasAccessToken).toBe(false);
		}
	});

	it("accepts hasRefreshToken: true", () => {
		const result = accountFiltersSchema.safeParse({ hasRefreshToken: true });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.hasRefreshToken).toBe(true);
		}
	});

	it("accepts hasPassword: false", () => {
		const result = accountFiltersSchema.safeParse({ hasPassword: false });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.hasPassword).toBe(false);
		}
	});

	it("accepts valid accessToken date range where after <= before", () => {
		const result = accountFiltersSchema.safeParse({
			accessTokenExpiresAfter: "2024-01-01",
			accessTokenExpiresBefore: "2024-06-01",
		});
		expect(result.success).toBe(true);
	});

	it("accepts equal accessToken dates", () => {
		const result = accountFiltersSchema.safeParse({
			accessTokenExpiresAfter: "2024-03-15",
			accessTokenExpiresBefore: "2024-03-15",
		});
		expect(result.success).toBe(true);
	});

	it("rejects inverted accessToken dates (after > before)", () => {
		const result = accountFiltersSchema.safeParse({
			accessTokenExpiresAfter: "2024-06-01",
			accessTokenExpiresBefore: "2024-01-01",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toMatch(
				/accessTokenExpiresAfter must be before or equal to accessTokenExpiresBefore/,
			);
		}
	});

	it("accepts valid refreshToken date range where after <= before", () => {
		const result = accountFiltersSchema.safeParse({
			refreshTokenExpiresAfter: "2024-02-01",
			refreshTokenExpiresBefore: "2024-08-01",
		});
		expect(result.success).toBe(true);
	});

	it("rejects inverted refreshToken dates (after > before)", () => {
		const result = accountFiltersSchema.safeParse({
			refreshTokenExpiresAfter: "2024-08-01",
			refreshTokenExpiresBefore: "2024-02-01",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toMatch(
				/refreshTokenExpiresAfter must be before or equal to refreshTokenExpiresBefore/,
			);
		}
	});

	it("accepts valid createdAfter/createdBefore range", () => {
		const result = accountFiltersSchema.safeParse({
			createdAfter: "2023-01-01",
			createdBefore: "2023-12-31",
		});
		expect(result.success).toBe(true);
	});

	it("rejects inverted createdAfter/createdBefore dates", () => {
		const result = accountFiltersSchema.safeParse({
			createdAfter: "2023-12-31",
			createdBefore: "2023-01-01",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toMatch(
				/createdAfter must be before or equal to createdBefore/,
			);
		}
	});

	it("accepts valid updatedAfter/updatedBefore range", () => {
		const result = accountFiltersSchema.safeParse({
			updatedAfter: "2023-03-01",
			updatedBefore: "2023-09-01",
		});
		expect(result.success).toBe(true);
	});

	it("rejects inverted updatedAfter/updatedBefore dates", () => {
		const result = accountFiltersSchema.safeParse({
			updatedAfter: "2023-09-01",
			updatedBefore: "2023-03-01",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toMatch(
				/updatedAfter must be before or equal to updatedBefore/,
			);
		}
	});

	it("passes when only one side of a date range is provided", () => {
		const afterOnly = accountFiltersSchema.safeParse({ createdAfter: "2023-01-01" });
		expect(afterOnly.success).toBe(true);

		const beforeOnly = accountFiltersSchema.safeParse({ createdBefore: "2023-12-31" });
		expect(beforeOnly.success).toBe(true);
	});

	it("accepts userId as a single string", () => {
		const result = accountFiltersSchema.safeParse({ userId: VALID_CUID });
		expect(result.success).toBe(true);
	});

	it("accepts providerId as an array of strings", () => {
		const result = accountFiltersSchema.safeParse({ providerId: ["google", "github"] });
		expect(result.success).toBe(true);
	});

	it("accepts all boolean filters together", () => {
		const result = accountFiltersSchema.safeParse({
			hasAccessToken: true,
			hasRefreshToken: false,
			hasPassword: true,
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.hasAccessToken).toBe(true);
			expect(result.data.hasRefreshToken).toBe(false);
			expect(result.data.hasPassword).toBe(true);
		}
	});
});

// ============================================================================
// accountSortBySchema
// ============================================================================

describe("accountSortBySchema", () => {
	it('accepts "createdAt" as a valid sort field', () => {
		const result = accountSortBySchema.safeParse("createdAt");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("createdAt");
		}
	});

	it('accepts "updatedAt" as a valid sort field', () => {
		const result = accountSortBySchema.safeParse("updatedAt");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("updatedAt");
		}
	});

	it('accepts "providerId" as a valid sort field', () => {
		const result = accountSortBySchema.safeParse("providerId");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("providerId");
		}
	});

	it("falls back to the default sort field for an unknown value", () => {
		const result = accountSortBySchema.safeParse("unknownField");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("createdAt");
		}
	});

	it("falls back to the default sort field for undefined", () => {
		const result = accountSortBySchema.safeParse(undefined);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("createdAt");
		}
	});

	it("falls back to the default sort field for a non-string value", () => {
		const result = accountSortBySchema.safeParse(42);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("createdAt");
		}
	});
});

// ============================================================================
// getAccountsSchema
// ============================================================================

describe("getAccountsSchema", () => {
	it("parses an empty object applying all defaults", () => {
		const result = getAccountsSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.perPage).toBe(50);
			expect(result.data.sortBy).toBe("createdAt");
			expect(result.data.sortOrder).toBe("desc");
			expect(result.data.filters).toEqual({});
			expect(result.data.cursor).toBeUndefined();
			expect(result.data.direction).toBeUndefined();
		}
	});

	it("accepts an explicit perPage value", () => {
		const result = getAccountsSchema.safeParse({ perPage: 100 });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.perPage).toBe(100);
		}
	});

	it('accepts sortOrder "asc"', () => {
		const result = getAccountsSchema.safeParse({ sortOrder: "asc" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.sortOrder).toBe("asc");
		}
	});

	it("accepts a cursor and direction for pagination", () => {
		const result = getAccountsSchema.safeParse({
			cursor: "some-cursor-token",
			direction: "forward",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.cursor).toBe("some-cursor-token");
			expect(result.data.direction).toBe("forward");
		}
	});

	it("applies nested filters when provided", () => {
		const result = getAccountsSchema.safeParse({
			filters: {
				hasAccessToken: true,
				providerId: "google",
			},
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.filters.hasAccessToken).toBe(true);
			expect(result.data.filters.providerId).toBe("google");
		}
	});

	it("rejects invalid nested filters (inverted date range)", () => {
		const result = getAccountsSchema.safeParse({
			filters: {
				createdAfter: "2023-12-31",
				createdBefore: "2023-01-01",
			},
		});
		expect(result.success).toBe(false);
	});

	it("falls back sortBy to default when an invalid field is passed", () => {
		const result = getAccountsSchema.safeParse({ sortBy: "nonExistentField" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.sortBy).toBe("createdAt");
		}
	});

	it('rejects an invalid sortOrder value (not "asc" or "desc")', () => {
		const result = getAccountsSchema.safeParse({ sortOrder: "random" });
		expect(result.success).toBe(false);
	});
});
