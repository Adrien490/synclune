import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: {
		QueryMode: { insensitive: "insensitive" },
	},
}));

import {
	buildAccountsFilterConditions,
	buildAccountsWhereClause,
} from "../accounts-query-builder";
import type { AccountFilters, GetAccountsInput } from "../../schemas/accounts.schemas";

function filters(overrides: Partial<AccountFilters> = {}): AccountFilters {
	return { ...overrides } as AccountFilters;
}

function input(overrides: Partial<GetAccountsInput> = {}): GetAccountsInput {
	return {
		direction: "forward",
		perPage: 20,
		sortBy: "createdAt",
		sortOrder: "desc",
		filters: {},
		...overrides,
	} as GetAccountsInput;
}

// ============================================================================
// buildAccountsFilterConditions
// ============================================================================

describe("buildAccountsFilterConditions", () => {
	it("should return empty array for empty filters", () => {
		expect(buildAccountsFilterConditions(filters())).toEqual([]);
	});

	it("should return empty array for null-ish filters", () => {
		expect(buildAccountsFilterConditions(null as unknown as AccountFilters)).toEqual([]);
	});

	// --- userId ---
	it("should filter by single userId", () => {
		const result = buildAccountsFilterConditions(filters({ userId: "user1" }));
		expect(result).toContainEqual({ userId: "user1" });
	});

	it("should filter by multiple userIds", () => {
		const result = buildAccountsFilterConditions(filters({ userId: ["user1", "user2"] }));
		expect(result).toContainEqual({ userId: { in: ["user1", "user2"] } });
	});

	// --- providerId ---
	it("should filter by single providerId", () => {
		const result = buildAccountsFilterConditions(filters({ providerId: "google" }));
		expect(result).toContainEqual({ providerId: "google" });
	});

	it("should filter by multiple providerIds", () => {
		const result = buildAccountsFilterConditions(filters({ providerId: ["google", "github"] }));
		expect(result).toContainEqual({ providerId: { in: ["google", "github"] } });
	});

	// --- accountId ---
	it("should filter by single accountId (contains, insensitive)", () => {
		const result = buildAccountsFilterConditions(filters({ accountId: "123" }));
		expect(result).toContainEqual({
			accountId: { contains: "123", mode: "insensitive" },
		});
	});

	it("should filter by multiple accountIds with OR", () => {
		const result = buildAccountsFilterConditions(filters({ accountId: ["123", "456"] }));
		expect(result).toContainEqual({
			OR: [
				{ accountId: { contains: "123", mode: "insensitive" } },
				{ accountId: { contains: "456", mode: "insensitive" } },
			],
		});
	});

	// --- scope ---
	it("should filter by single scope", () => {
		const result = buildAccountsFilterConditions(filters({ scope: "email" }));
		expect(result).toContainEqual({
			scope: { contains: "email", mode: "insensitive" },
		});
	});

	it("should filter by multiple scopes with OR", () => {
		const result = buildAccountsFilterConditions(filters({ scope: ["email", "profile"] }));
		expect(result).toContainEqual({
			OR: [
				{ scope: { contains: "email", mode: "insensitive" } },
				{ scope: { contains: "profile", mode: "insensitive" } },
			],
		});
	});

	// --- token boolean filters ---
	it("should filter hasAccessToken true", () => {
		const result = buildAccountsFilterConditions(filters({ hasAccessToken: true }));
		expect(result).toContainEqual({ accessToken: { not: null } });
	});

	it("should filter hasAccessToken false", () => {
		const result = buildAccountsFilterConditions(filters({ hasAccessToken: false }));
		expect(result).toContainEqual({ accessToken: null });
	});

	it("should filter hasRefreshToken true", () => {
		const result = buildAccountsFilterConditions(filters({ hasRefreshToken: true }));
		expect(result).toContainEqual({ refreshToken: { not: null } });
	});

	it("should filter hasRefreshToken false", () => {
		const result = buildAccountsFilterConditions(filters({ hasRefreshToken: false }));
		expect(result).toContainEqual({ refreshToken: null });
	});

	it("should filter hasPassword true", () => {
		const result = buildAccountsFilterConditions(filters({ hasPassword: true }));
		expect(result).toContainEqual({ password: { not: null } });
	});

	it("should filter hasPassword false", () => {
		const result = buildAccountsFilterConditions(filters({ hasPassword: false }));
		expect(result).toContainEqual({ password: null });
	});

	// --- date filters ---
	it("should filter by accessTokenExpiresBefore", () => {
		const date = new Date("2025-01-01");
		const result = buildAccountsFilterConditions(filters({ accessTokenExpiresBefore: date }));
		expect(result).toContainEqual({ accessTokenExpiresAt: { lte: date } });
	});

	it("should filter by accessTokenExpiresAfter", () => {
		const date = new Date("2024-01-01");
		const result = buildAccountsFilterConditions(filters({ accessTokenExpiresAfter: date }));
		expect(result).toContainEqual({ accessTokenExpiresAt: { gte: date } });
	});

	it("should filter by refreshTokenExpiresBefore", () => {
		const date = new Date("2025-06-01");
		const result = buildAccountsFilterConditions(filters({ refreshTokenExpiresBefore: date }));
		expect(result).toContainEqual({ refreshTokenExpiresAt: { lte: date } });
	});

	it("should filter by refreshTokenExpiresAfter", () => {
		const date = new Date("2024-06-01");
		const result = buildAccountsFilterConditions(filters({ refreshTokenExpiresAfter: date }));
		expect(result).toContainEqual({ refreshTokenExpiresAt: { gte: date } });
	});

	it("should filter by createdAfter", () => {
		const date = new Date("2024-01-01");
		const result = buildAccountsFilterConditions(filters({ createdAfter: date }));
		expect(result).toContainEqual({ createdAt: { gte: date } });
	});

	it("should filter by createdBefore", () => {
		const date = new Date("2024-12-31");
		const result = buildAccountsFilterConditions(filters({ createdBefore: date }));
		expect(result).toContainEqual({ createdAt: { lte: date } });
	});

	it("should filter by updatedAfter", () => {
		const date = new Date("2024-03-01");
		const result = buildAccountsFilterConditions(filters({ updatedAfter: date }));
		expect(result).toContainEqual({ updatedAt: { gte: date } });
	});

	it("should filter by updatedBefore", () => {
		const date = new Date("2024-09-30");
		const result = buildAccountsFilterConditions(filters({ updatedBefore: date }));
		expect(result).toContainEqual({ updatedAt: { lte: date } });
	});

	// --- combined ---
	it("should combine multiple filters", () => {
		const result = buildAccountsFilterConditions(
			filters({
				userId: "user1",
				providerId: "google",
				hasAccessToken: true,
				createdAfter: new Date("2024-01-01"),
			})
		);
		expect(result).toHaveLength(4);
	});
});

// ============================================================================
// buildAccountsWhereClause
// ============================================================================

describe("buildAccountsWhereClause", () => {
	it("should return empty object for no filters", () => {
		const result = buildAccountsWhereClause(input());
		expect(result).toEqual({});
	});

	it("should set AND when filters are present", () => {
		const result = buildAccountsWhereClause(
			input({ filters: { userId: "user1" } as AccountFilters })
		);
		expect(result.AND).toBeDefined();
		expect(result.AND).toContainEqual({ userId: "user1" });
	});

	it("should not set AND when filters produce no conditions", () => {
		const result = buildAccountsWhereClause(input({ filters: {} as AccountFilters }));
		expect(result.AND).toBeUndefined();
	});

	it("should combine multiple filter conditions in AND", () => {
		const result = buildAccountsWhereClause(
			input({
				filters: {
					providerId: "google",
					hasAccessToken: true,
				} as AccountFilters,
			})
		);
		expect(result.AND).toHaveLength(2);
	});
});
