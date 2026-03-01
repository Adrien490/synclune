import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: { QueryMode: { insensitive: "insensitive" } },
}));

import { buildSessionFilterConditions, buildSessionWhereClause } from "../session-query-builder";

describe("buildSessionFilterConditions", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-03-01T12:00:00Z"));
	});

	it("should return empty array when no filters", () => {
		const result = buildSessionFilterConditions({});

		expect(result).toEqual([]);
	});

	it("should filter by single userId", () => {
		const result = buildSessionFilterConditions({ userId: "user_1" });

		expect(result).toContainEqual({ userId: "user_1" });
	});

	it("should filter by multiple userIds using 'in'", () => {
		const result = buildSessionFilterConditions({
			userId: ["user_1", "user_2"],
		});

		expect(result).toContainEqual({ userId: { in: ["user_1", "user_2"] } });
	});

	it("should filter by single IP address (case-insensitive contains)", () => {
		const result = buildSessionFilterConditions({ ipAddress: "192.168.1" });

		expect(result).toContainEqual({
			ipAddress: { contains: "192.168.1", mode: "insensitive" },
		});
	});

	it("should filter by multiple IP addresses with OR", () => {
		const result = buildSessionFilterConditions({
			ipAddress: ["192.168.1.1", "10.0.0.1"],
		});

		expect(result).toContainEqual({
			OR: [
				{ ipAddress: { contains: "192.168.1.1", mode: "insensitive" } },
				{ ipAddress: { contains: "10.0.0.1", mode: "insensitive" } },
			],
		});
	});

	it("should filter hasIpAddress=true (not null)", () => {
		const result = buildSessionFilterConditions({ hasIpAddress: true });

		expect(result).toContainEqual({ ipAddress: { not: null } });
	});

	it("should filter hasIpAddress=false (null)", () => {
		const result = buildSessionFilterConditions({ hasIpAddress: false });

		expect(result).toContainEqual({ ipAddress: null });
	});

	it("should filter hasUserAgent=true (not null)", () => {
		const result = buildSessionFilterConditions({ hasUserAgent: true });

		expect(result).toContainEqual({ userAgent: { not: null } });
	});

	it("should filter hasUserAgent=false (null)", () => {
		const result = buildSessionFilterConditions({ hasUserAgent: false });

		expect(result).toContainEqual({ userAgent: null });
	});

	it("should filter by expiresAfter date", () => {
		const date = new Date("2026-06-01");
		const result = buildSessionFilterConditions({ expiresAfter: date });

		expect(result).toContainEqual({ expiresAt: { gte: date } });
	});

	it("should filter by expiresBefore date", () => {
		const date = new Date("2026-01-01");
		const result = buildSessionFilterConditions({ expiresBefore: date });

		expect(result).toContainEqual({ expiresAt: { lte: date } });
	});

	it("should filter isExpired=true (expiresAt < now)", () => {
		const result = buildSessionFilterConditions({ isExpired: true });

		expect(result).toContainEqual({
			expiresAt: { lt: expect.any(Date) },
		});
	});

	it("should filter isExpired=false (expiresAt >= now)", () => {
		const result = buildSessionFilterConditions({ isExpired: false });

		expect(result).toContainEqual({
			expiresAt: { gte: expect.any(Date) },
		});
	});

	it("should filter isActive=true (expiresAt > now)", () => {
		const result = buildSessionFilterConditions({ isActive: true });

		expect(result).toContainEqual({
			expiresAt: { gt: expect.any(Date) },
		});
	});

	it("should filter isActive=false (expiresAt <= now)", () => {
		const result = buildSessionFilterConditions({ isActive: false });

		expect(result).toContainEqual({
			expiresAt: { lte: expect.any(Date) },
		});
	});

	it("should filter by createdAfter and createdBefore", () => {
		const after = new Date("2026-01-01");
		const before = new Date("2026-02-01");

		const result = buildSessionFilterConditions({
			createdAfter: after,
			createdBefore: before,
		});

		expect(result).toContainEqual({ createdAt: { gte: after } });
		expect(result).toContainEqual({ createdAt: { lte: before } });
	});

	it("should filter by updatedAfter and updatedBefore", () => {
		const after = new Date("2026-02-01");
		const before = new Date("2026-03-01");

		const result = buildSessionFilterConditions({
			updatedAfter: after,
			updatedBefore: before,
		});

		expect(result).toContainEqual({ updatedAt: { gte: after } });
		expect(result).toContainEqual({ updatedAt: { lte: before } });
	});

	it("should combine multiple filters", () => {
		const result = buildSessionFilterConditions({
			userId: "user_1",
			hasIpAddress: true,
			isActive: true,
		});

		expect(result).toHaveLength(3);
	});
});

describe("buildSessionWhereClause", () => {
	it("should return empty object with no filters", () => {
		// params.filters must be present (even if empty) — passing {} causes
		// params.filters to be undefined, which crashes buildSessionFilterConditions.
		const result = buildSessionWhereClause({ filters: {} } as never);

		expect(result).toEqual({});
	});

	it("should wrap conditions in AND when filters present", () => {
		const result = buildSessionWhereClause({
			filters: { userId: "user_1", hasIpAddress: true },
		} as never);

		expect(result.AND).toBeDefined();
		expect(result.AND).toHaveLength(2);
	});

	it("should not include AND for empty filters", () => {
		const result = buildSessionWhereClause({ filters: {} } as never);

		expect(result.AND).toBeUndefined();
	});
});
