import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: { QueryMode: { insensitive: "insensitive" } },
}));

import {
	buildVerificationFilterConditions,
	buildVerificationWhereClause,
} from "../verification-query-builder";

describe("buildVerificationFilterConditions", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-03-01T12:00:00Z"));
	});

	it("should return empty array when no filters", () => {
		const result = buildVerificationFilterConditions({});

		expect(result).toEqual([]);
	});

	it("should filter by single identifier (case-insensitive contains)", () => {
		const result = buildVerificationFilterConditions({
			identifier: "user@example.com",
		});

		expect(result).toContainEqual({
			identifier: { contains: "user@example.com", mode: "insensitive" },
		});
	});

	it("should filter by multiple identifiers with OR", () => {
		const result = buildVerificationFilterConditions({
			identifier: ["user@a.com", "user@b.com"],
		});

		expect(result).toContainEqual({
			OR: [
				{ identifier: { contains: "user@a.com", mode: "insensitive" } },
				{ identifier: { contains: "user@b.com", mode: "insensitive" } },
			],
		});
	});

	it("should filter by expiresBefore", () => {
		const date = new Date("2026-01-01");
		const result = buildVerificationFilterConditions({ expiresBefore: date });

		expect(result).toContainEqual({ expiresAt: { lte: date } });
	});

	it("should filter by expiresAfter", () => {
		const date = new Date("2026-06-01");
		const result = buildVerificationFilterConditions({ expiresAfter: date });

		expect(result).toContainEqual({ expiresAt: { gte: date } });
	});

	it("should filter isExpired=true (expiresAt < now)", () => {
		const result = buildVerificationFilterConditions({ isExpired: true });

		expect(result).toContainEqual({
			expiresAt: { lt: expect.any(Date) },
		});
	});

	it("should filter isExpired=false (expiresAt >= now)", () => {
		const result = buildVerificationFilterConditions({ isExpired: false });

		expect(result).toContainEqual({
			expiresAt: { gte: expect.any(Date) },
		});
	});

	it("should filter isActive=true (expiresAt > now)", () => {
		const result = buildVerificationFilterConditions({ isActive: true });

		expect(result).toContainEqual({
			expiresAt: { gt: expect.any(Date) },
		});
	});

	it("should filter isActive=false (expiresAt <= now)", () => {
		const result = buildVerificationFilterConditions({ isActive: false });

		expect(result).toContainEqual({
			expiresAt: { lte: expect.any(Date) },
		});
	});

	it("should filter by created date ranges", () => {
		const after = new Date("2026-01-01");
		const before = new Date("2026-02-01");

		const result = buildVerificationFilterConditions({
			createdAfter: after,
			createdBefore: before,
		});

		expect(result).toContainEqual({ createdAt: { gte: after } });
		expect(result).toContainEqual({ createdAt: { lte: before } });
	});

	it("should filter by updated date ranges", () => {
		const after = new Date("2026-02-15");
		const before = new Date("2026-03-01");

		const result = buildVerificationFilterConditions({
			updatedAfter: after,
			updatedBefore: before,
		});

		expect(result).toContainEqual({ updatedAt: { gte: after } });
		expect(result).toContainEqual({ updatedAt: { lte: before } });
	});

	it("should combine multiple filters", () => {
		const result = buildVerificationFilterConditions({
			identifier: "test@example.com",
			isActive: true,
			createdAfter: new Date("2026-01-01"),
		});

		expect(result).toHaveLength(3);
	});
});

describe("buildVerificationWhereClause", () => {
	it("should return empty object with no filters", () => {
		const result = buildVerificationWhereClause({});

		expect(result).toEqual({});
	});

	it("should wrap conditions in AND when filters present", () => {
		const result = buildVerificationWhereClause({
			filters: { identifier: "test@example.com", isActive: true },
		});

		expect(result.AND).toBeDefined();
		expect(result.AND).toHaveLength(2);
	});

	it("should not include AND for empty filters", () => {
		const result = buildVerificationWhereClause({ filters: {} });

		expect(result.AND).toBeUndefined();
	});
});
