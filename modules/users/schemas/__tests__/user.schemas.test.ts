import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Hoisted mocks — must be defined before any module under test is imported.
// ---------------------------------------------------------------------------

vi.mock("@/app/generated/prisma/client", () => ({
	Role: { USER: "USER", ADMIN: "ADMIN" },
}));

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

vi.mock("@/shared/constants/validation-limits", () => ({
	DATE_LIMITS: { FILTERS_MIN: new Date("2020-01-01") },
	TEXT_LIMITS: { USER_SEARCH: { max: 100 } },
}));

vi.mock("@/modules/users/constants/profile.constants", () => ({
	USER_CONSTANTS: {
		MIN_NAME_LENGTH: 2,
		MAX_NAME_LENGTH: 50,
		ACCOUNT_DELETION_CONFIRMATION: "SUPPRIMER MON COMPTE",
	},
	USER_ERROR_MESSAGES: {
		NAME_TOO_SHORT: "Name too short",
		NAME_TOO_LONG: "Name too long",
	},
}));

vi.mock("../../constants/user.constants", () => ({
	GET_USERS_DEFAULT_PER_PAGE: 50,
	GET_USERS_MAX_RESULTS_PER_PAGE: 200,
	GET_USERS_DEFAULT_SORT_BY: "createdAt",
	GET_USERS_DEFAULT_SORT_ORDER: "desc",
	GET_USERS_SORT_FIELDS: ["createdAt", "updatedAt", "name", "email", "role"],
}));

import {
	getUserSchema,
	userFiltersSchema,
	userSortBySchema,
	getUsersSchema,
	updateProfileSchema,
	deleteAccountSchema,
} from "../user.schemas";

// ============================================================================
// getUserSchema
// ============================================================================

describe("getUserSchema", () => {
	it("accepts an object with no userId", () => {
		const result = getUserSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it("accepts an object with a string userId", () => {
		const result = getUserSchema.safeParse({ userId: "user-123" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.userId).toBe("user-123");
		}
	});

	it("accepts an object with undefined userId", () => {
		const result = getUserSchema.safeParse({ userId: undefined });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.userId).toBeUndefined();
		}
	});

	it("rejects a non-string userId", () => {
		const result = getUserSchema.safeParse({ userId: 42 });
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// userFiltersSchema
// ============================================================================

describe("userFiltersSchema", () => {
	it("accepts an empty object", () => {
		const result = userFiltersSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it("accepts valid name and email string filters", () => {
		const result = userFiltersSchema.safeParse({
			name: "Alice",
			email: "alice@example.com",
		});
		expect(result.success).toBe(true);
	});

	it("accepts name and email as arrays of strings", () => {
		const result = userFiltersSchema.safeParse({
			name: ["Alice", "Bob"],
			email: ["alice@example.com", "bob@example.com"],
		});
		expect(result.success).toBe(true);
	});

	it('accepts role as "USER"', () => {
		const result = userFiltersSchema.safeParse({ role: "USER" });
		expect(result.success).toBe(true);
	});

	it('accepts role as "ADMIN"', () => {
		const result = userFiltersSchema.safeParse({ role: "ADMIN" });
		expect(result.success).toBe(true);
	});

	it("accepts role as an array of roles", () => {
		const result = userFiltersSchema.safeParse({ role: ["USER", "ADMIN"] });
		expect(result.success).toBe(true);
	});

	it("rejects an invalid role value", () => {
		const result = userFiltersSchema.safeParse({ role: "SUPERADMIN" });
		expect(result.success).toBe(false);
	});

	it("accepts emailVerified as a boolean", () => {
		const resultTrue = userFiltersSchema.safeParse({ emailVerified: true });
		expect(resultTrue.success).toBe(true);

		const resultFalse = userFiltersSchema.safeParse({ emailVerified: false });
		expect(resultFalse.success).toBe(true);
	});

	it("accepts hasStripeCustomer as a boolean", () => {
		const result = userFiltersSchema.safeParse({ hasStripeCustomer: true });
		expect(result.success).toBe(true);
	});

	it("accepts hasImage as a boolean", () => {
		const result = userFiltersSchema.safeParse({ hasImage: false });
		expect(result.success).toBe(true);
	});

	it("accepts hasOrders as a boolean", () => {
		const result = userFiltersSchema.safeParse({ hasOrders: true });
		expect(result.success).toBe(true);
	});

	it("accepts hasSessions as a boolean", () => {
		const result = userFiltersSchema.safeParse({ hasSessions: false });
		expect(result.success).toBe(true);
	});

	it("accepts marketingOptIn as true", () => {
		const result = userFiltersSchema.safeParse({ marketingOptIn: true });
		expect(result.success).toBe(true);
	});

	it("accepts marketingOptIn as false", () => {
		const result = userFiltersSchema.safeParse({ marketingOptIn: false });
		expect(result.success).toBe(true);
	});

	it("accepts valid minOrderCount", () => {
		const result = userFiltersSchema.safeParse({ minOrderCount: 5 });
		expect(result.success).toBe(true);
	});

	it("rejects negative minOrderCount", () => {
		const result = userFiltersSchema.safeParse({ minOrderCount: -1 });
		expect(result.success).toBe(false);
	});

	it("rejects minOrderCount above 10000", () => {
		const result = userFiltersSchema.safeParse({ minOrderCount: 10001 });
		expect(result.success).toBe(false);
	});

	it("rejects non-integer minOrderCount", () => {
		const result = userFiltersSchema.safeParse({ minOrderCount: 1.5 });
		expect(result.success).toBe(false);
	});

	it("accepts includeDeleted as a boolean", () => {
		const result = userFiltersSchema.safeParse({ includeDeleted: true });
		expect(result.success).toBe(true);
	});

	it("accepts valid createdAfter and createdBefore in correct order", () => {
		const result = userFiltersSchema.safeParse({
			createdAfter: "2023-01-01",
			createdBefore: "2023-12-31",
		});
		expect(result.success).toBe(true);
	});

	it("accepts createdAfter equal to createdBefore", () => {
		const result = userFiltersSchema.safeParse({
			createdAfter: "2023-06-15",
			createdBefore: "2023-06-15",
		});
		expect(result.success).toBe(true);
	});

	it("rejects createdAfter that is after createdBefore", () => {
		const result = userFiltersSchema.safeParse({
			createdAfter: "2023-12-31",
			createdBefore: "2023-01-01",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe(
				"createdAfter must be before or equal to createdBefore",
			);
		}
	});

	it("accepts valid updatedAfter and updatedBefore in correct order", () => {
		const result = userFiltersSchema.safeParse({
			updatedAfter: "2023-03-01",
			updatedBefore: "2023-09-01",
		});
		expect(result.success).toBe(true);
	});

	it("rejects updatedAfter that is after updatedBefore", () => {
		const result = userFiltersSchema.safeParse({
			updatedAfter: "2023-09-01",
			updatedBefore: "2023-03-01",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe(
				"updatedAfter must be before or equal to updatedBefore",
			);
		}
	});

	it("accepts createdAfter alone without createdBefore", () => {
		const result = userFiltersSchema.safeParse({ createdAfter: "2023-01-01" });
		expect(result.success).toBe(true);
	});

	it("accepts createdBefore alone without createdAfter", () => {
		const result = userFiltersSchema.safeParse({ createdBefore: "2023-12-31" });
		expect(result.success).toBe(true);
	});

	it("rejects a date before FILTERS_MIN (2020-01-01)", () => {
		const result = userFiltersSchema.safeParse({ createdAfter: "2019-12-31" });
		expect(result.success).toBe(false);
	});

	it("accepts a full valid filters object", () => {
		const result = userFiltersSchema.safeParse({
			name: "Alice",
			email: "alice@example.com",
			role: "USER",
			emailVerified: true,
			hasStripeCustomer: false,
			hasImage: true,
			hasOrders: true,
			hasSessions: false,
			marketingOptIn: true,
			minOrderCount: 2,
			includeDeleted: false,
			createdAfter: "2022-01-01",
			createdBefore: "2024-01-01",
			updatedAfter: "2022-06-01",
			updatedBefore: "2024-06-01",
		});
		expect(result.success).toBe(true);
	});
});

// ============================================================================
// userSortBySchema
// ============================================================================

describe("userSortBySchema", () => {
	it("accepts a valid sort field", () => {
		const result = userSortBySchema.safeParse("name");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("name");
		}
	});

	it("accepts all valid sort fields", () => {
		for (const field of ["createdAt", "updatedAt", "name", "email", "role"]) {
			const result = userSortBySchema.safeParse(field);
			expect(result.success).toBe(true);
		}
	});

	it("falls back to default sort field for an invalid value", () => {
		const result = userSortBySchema.safeParse("invalidField");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("createdAt");
		}
	});

	it("falls back to default sort field for undefined", () => {
		const result = userSortBySchema.safeParse(undefined);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("createdAt");
		}
	});
});

// ============================================================================
// getUsersSchema
// ============================================================================

describe("getUsersSchema", () => {
	it("applies default values when called with an empty object", () => {
		const result = getUsersSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.perPage).toBe(50);
			expect(result.data.sortBy).toBe("createdAt");
			expect(result.data.sortOrder).toBe("desc");
			expect(result.data.filters).toEqual({});
		}
	});

	it("accepts a valid search string", () => {
		const result = getUsersSchema.safeParse({ search: "alice" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.search).toBe("alice");
		}
	});

	it("trims whitespace from the search field", () => {
		const result = getUsersSchema.safeParse({ search: "  alice  " });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.search).toBe("alice");
		}
	});

	it("rejects a search string longer than 100 characters", () => {
		const result = getUsersSchema.safeParse({ search: "a".repeat(101) });
		expect(result.success).toBe(false);
	});

	it("accepts a valid cursor string", () => {
		const result = getUsersSchema.safeParse({ cursor: "some-cursor-value" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.cursor).toBe("some-cursor-value");
		}
	});

	it('accepts direction "forward"', () => {
		const result = getUsersSchema.safeParse({ direction: "forward" });
		expect(result.success).toBe(true);
	});

	it('accepts direction "backward"', () => {
		const result = getUsersSchema.safeParse({ direction: "backward" });
		expect(result.success).toBe(true);
	});

	it("rejects an invalid direction value", () => {
		const result = getUsersSchema.safeParse({ direction: "sideways" });
		expect(result.success).toBe(false);
	});

	it('accepts sortOrder "asc"', () => {
		const result = getUsersSchema.safeParse({ sortOrder: "asc" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.sortOrder).toBe("asc");
		}
	});

	it("rejects an invalid sortOrder value", () => {
		const result = getUsersSchema.safeParse({ sortOrder: "random" });
		expect(result.success).toBe(false);
	});

	it("accepts valid nested filters", () => {
		const result = getUsersSchema.safeParse({
			filters: { role: "ADMIN", emailVerified: true },
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.filters.role).toBe("ADMIN");
			expect(result.data.filters.emailVerified).toBe(true);
		}
	});

	it("rejects invalid nested filters (bad date ordering)", () => {
		const result = getUsersSchema.safeParse({
			filters: {
				createdAfter: "2024-12-31",
				createdBefore: "2024-01-01",
			},
		});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// updateProfileSchema
// ============================================================================

describe("updateProfileSchema", () => {
	it("accepts a valid name", () => {
		const result = updateProfileSchema.safeParse({ name: "Alice" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe("Alice");
		}
	});

	it("accepts a name at the minimum length boundary (2 chars)", () => {
		const result = updateProfileSchema.safeParse({ name: "Al" });
		expect(result.success).toBe(true);
	});

	it("accepts a name at the maximum length boundary (50 chars)", () => {
		const result = updateProfileSchema.safeParse({ name: "A".repeat(50) });
		expect(result.success).toBe(true);
	});

	it("rejects a name shorter than the minimum length", () => {
		const result = updateProfileSchema.safeParse({ name: "A" });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe("Name too short");
		}
	});

	it("rejects a name longer than the maximum length", () => {
		const result = updateProfileSchema.safeParse({ name: "A".repeat(51) });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe("Name too long");
		}
	});

	it("trims surrounding whitespace from name", () => {
		const result = updateProfileSchema.safeParse({ name: "  Alice  " });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe("Alice");
		}
	});

	it("rejects when name is missing", () => {
		const result = updateProfileSchema.safeParse({});
		expect(result.success).toBe(false);
	});

	it("rejects a non-string name", () => {
		const result = updateProfileSchema.safeParse({ name: 123 });
		expect(result.success).toBe(false);
	});

	it("accepts whitespace-padded name and trims it in output", () => {
		// The schema applies .trim() after .min()/.max(), so length is measured
		// on the original string. "  Hi  " (6 chars) passes min(2) then is
		// trimmed to "Hi" in the output.
		const result = updateProfileSchema.safeParse({ name: "  Hi  " });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe("Hi");
		}
	});
});

// ============================================================================
// deleteAccountSchema
// ============================================================================

describe("deleteAccountSchema", () => {
	it("accepts the exact confirmation text", () => {
		const result = deleteAccountSchema.safeParse({
			confirmation: "SUPPRIMER MON COMPTE",
		});
		expect(result.success).toBe(true);
	});

	it("rejects a wrong confirmation text", () => {
		const result = deleteAccountSchema.safeParse({
			confirmation: "DELETE MY ACCOUNT",
		});
		expect(result.success).toBe(false);
	});

	it("rejects a partial confirmation text", () => {
		const result = deleteAccountSchema.safeParse({
			confirmation: "SUPPRIMER",
		});
		expect(result.success).toBe(false);
	});

	it("rejects a lowercase version of the confirmation text", () => {
		const result = deleteAccountSchema.safeParse({
			confirmation: "supprimer mon compte",
		});
		expect(result.success).toBe(false);
	});

	it("rejects an empty confirmation string", () => {
		const result = deleteAccountSchema.safeParse({ confirmation: "" });
		expect(result.success).toBe(false);
	});

	it("rejects when confirmation field is missing", () => {
		const result = deleteAccountSchema.safeParse({});
		expect(result.success).toBe(false);
	});

	it("rejects confirmation text with extra whitespace", () => {
		const result = deleteAccountSchema.safeParse({
			confirmation: " SUPPRIMER MON COMPTE ",
		});
		expect(result.success).toBe(false);
	});
});
