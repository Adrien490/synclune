import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: {
		QueryMode: { insensitive: "insensitive" },
	},
	Role: { USER: "USER", ADMIN: "ADMIN" },
}));

vi.mock("@/shared/lib/prisma", () => ({
	notDeleted: { deletedAt: null },
}));

import {
	buildUserFilterConditions,
	buildUserWhereClause,
} from "../user-query-builder";
import type { UserFilters, GetUsersParams } from "../../types/user.types";

function filters(overrides: Partial<UserFilters> = {}): UserFilters {
	return { ...overrides } as UserFilters;
}

function params(overrides: Partial<GetUsersParams> = {}): GetUsersParams {
	return {
		direction: "forward",
		perPage: 20,
		sortBy: "created-descending",
		...overrides,
	} as GetUsersParams;
}

// ============================================================================
// buildUserFilterConditions
// ============================================================================

describe("buildUserFilterConditions", () => {
	it("should return empty array for empty filters", () => {
		expect(buildUserFilterConditions(filters())).toEqual([]);
	});

	it("should return empty array for null-ish filters", () => {
		expect(buildUserFilterConditions(null as unknown as UserFilters)).toEqual([]);
	});

	// --- name ---
	it("should filter by single name", () => {
		const result = buildUserFilterConditions(filters({ name: "Alice" }));
		expect(result).toContainEqual({
			name: { contains: "Alice", mode: "insensitive" },
		});
	});

	it("should filter by multiple names with OR", () => {
		const result = buildUserFilterConditions(filters({ name: ["Alice", "Bob"] }));
		expect(result).toContainEqual({
			OR: [
				{ name: { contains: "Alice", mode: "insensitive" } },
				{ name: { contains: "Bob", mode: "insensitive" } },
			],
		});
	});

	it("should unwrap single-element name array", () => {
		const result = buildUserFilterConditions(filters({ name: ["Alice"] }));
		expect(result).toContainEqual({
			name: { contains: "Alice", mode: "insensitive" },
		});
	});

	// --- email ---
	it("should filter by single email", () => {
		const result = buildUserFilterConditions(filters({ email: "test@example.com" }));
		expect(result).toContainEqual({
			email: { contains: "test@example.com", mode: "insensitive" },
		});
	});

	it("should filter by multiple emails with OR", () => {
		const result = buildUserFilterConditions(filters({ email: ["a@b.com", "c@d.com"] }));
		expect(result).toContainEqual({
			OR: [
				{ email: { contains: "a@b.com", mode: "insensitive" } },
				{ email: { contains: "c@d.com", mode: "insensitive" } },
			],
		});
	});

	// --- role ---
	it("should filter by single role", () => {
		const result = buildUserFilterConditions(filters({ role: "ADMIN" as UserFilters["role"] }));
		expect(result).toContainEqual({ role: "ADMIN" });
	});

	it("should filter by multiple roles", () => {
		const result = buildUserFilterConditions(filters({ role: ["USER", "ADMIN"] as unknown as UserFilters["role"] }));
		expect(result).toContainEqual({ role: { in: ["USER", "ADMIN"] } });
	});

	// --- emailVerified ---
	it("should filter by emailVerified true", () => {
		const result = buildUserFilterConditions(filters({ emailVerified: true }));
		expect(result).toContainEqual({ emailVerified: true });
	});

	it("should filter by emailVerified false", () => {
		const result = buildUserFilterConditions(filters({ emailVerified: false }));
		expect(result).toContainEqual({ emailVerified: false });
	});

	it("should not filter emailVerified when undefined", () => {
		const result = buildUserFilterConditions(filters({}));
		const hasEmailVerified = result.some(
			(c) => "emailVerified" in c
		);
		expect(hasEmailVerified).toBe(false);
	});

	// --- date filters ---
	it("should filter by createdAfter", () => {
		const date = new Date("2024-01-01");
		const result = buildUserFilterConditions(filters({ createdAfter: date }));
		expect(result).toContainEqual({ createdAt: { gte: date } });
	});

	it("should filter by createdBefore", () => {
		const date = new Date("2024-12-31");
		const result = buildUserFilterConditions(filters({ createdBefore: date }));
		expect(result).toContainEqual({ createdAt: { lte: date } });
	});

	it("should filter by updatedAfter", () => {
		const date = new Date("2024-06-01");
		const result = buildUserFilterConditions(filters({ updatedAfter: date }));
		expect(result).toContainEqual({ updatedAt: { gte: date } });
	});

	it("should filter by updatedBefore", () => {
		const date = new Date("2024-06-30");
		const result = buildUserFilterConditions(filters({ updatedBefore: date }));
		expect(result).toContainEqual({ updatedAt: { lte: date } });
	});

	// --- relation filters ---
	it("should filter hasOrders true", () => {
		const result = buildUserFilterConditions(filters({ hasOrders: true }));
		expect(result).toContainEqual({ orders: { some: {} } });
	});

	it("should filter hasOrders false", () => {
		const result = buildUserFilterConditions(filters({ hasOrders: false }));
		expect(result).toContainEqual({ orders: { none: {} } });
	});

	it("should filter hasSessions true", () => {
		const result = buildUserFilterConditions(filters({ hasSessions: true }));
		expect(result).toContainEqual({ sessions: { some: {} } });
	});

	it("should filter hasSessions false", () => {
		const result = buildUserFilterConditions(filters({ hasSessions: false }));
		expect(result).toContainEqual({ sessions: { none: {} } });
	});

	// --- boolean field filters ---
	it("should filter hasStripeCustomer true", () => {
		const result = buildUserFilterConditions(filters({ hasStripeCustomer: true }));
		expect(result).toContainEqual({ stripeCustomerId: { not: null } });
	});

	it("should filter hasStripeCustomer false", () => {
		const result = buildUserFilterConditions(filters({ hasStripeCustomer: false }));
		expect(result).toContainEqual({ stripeCustomerId: null });
	});

	it("should filter hasImage true", () => {
		const result = buildUserFilterConditions(filters({ hasImage: true }));
		expect(result).toContainEqual({ image: { not: null } });
	});

	it("should filter hasImage false", () => {
		const result = buildUserFilterConditions(filters({ hasImage: false }));
		expect(result).toContainEqual({ image: null });
	});

	// --- combined ---
	it("should combine multiple filters", () => {
		const result = buildUserFilterConditions(
			filters({
				name: "Alice",
				role: "ADMIN" as UserFilters["role"],
				emailVerified: true,
				hasOrders: true,
			})
		);
		expect(result).toHaveLength(4);
	});
});

// ============================================================================
// buildUserWhereClause
// ============================================================================

describe("buildUserWhereClause", () => {
	it("should exclude deleted users by default", () => {
		const result = buildUserWhereClause(params());
		expect(result.deletedAt).toBeNull();
	});

	it("should include deleted users when includeDeleted is set", () => {
		const result = buildUserWhereClause(
			params({ filters: { includeDeleted: true } as UserFilters })
		);
		expect(result).not.toHaveProperty("deletedAt");
	});

	it("should add OR conditions for search term (no fuzzy IDs)", () => {
		const result = buildUserWhereClause(params({ search: "alice" }));
		expect(result.OR).toBeDefined();
		expect(result.OR).toHaveLength(2);
		expect(result.OR).toContainEqual({
			name: { contains: "alice", mode: "insensitive" },
		});
		expect(result.OR).toContainEqual({
			email: { contains: "alice", mode: "insensitive" },
		});
	});

	it("should combine fuzzy IDs with exact search in AND > OR", () => {
		const result = buildUserWhereClause(
			params({ search: "alice" }),
			["id1", "id2"]
		);
		expect(result.OR).toBeUndefined();
		expect(result.AND).toBeDefined();
		const andConditions = result.AND as Array<Record<string, unknown>>;
		const orCondition = andConditions.find((c) => "OR" in c);
		expect(orCondition).toBeDefined();
		expect((orCondition as { OR: unknown[] }).OR).toContainEqual({ id: { in: ["id1", "id2"] } });
	});

	it("should not add search conditions when search is empty", () => {
		const result = buildUserWhereClause(params({ search: "" }));
		expect(result.OR).toBeUndefined();
	});

	it("should not add search conditions when search is whitespace only", () => {
		const result = buildUserWhereClause(params({ search: "   " }));
		expect(result.OR).toBeUndefined();
	});

	it("should trim search term", () => {
		const result = buildUserWhereClause(params({ search: "  alice  " }));
		expect(result.OR).toContainEqual({
			name: { contains: "alice", mode: "insensitive" },
		});
	});

	it("should include filter conditions in AND", () => {
		const result = buildUserWhereClause(
			params({ filters: { emailVerified: true } as UserFilters })
		);
		expect(result.AND).toBeDefined();
		expect(result.AND).toContainEqual({ emailVerified: true });
	});

	it("should not set AND when no filters and no search", () => {
		const result = buildUserWhereClause(params());
		expect(result.AND).toBeUndefined();
	});

	it("should not add fuzzy condition when no search term", () => {
		const result = buildUserWhereClause(params(), ["id1"]);
		// Without a search term, fuzzy IDs are not used
		expect(result.OR).toBeUndefined();
	});
});
