import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: {
		QueryMode: { insensitive: "insensitive" },
	},
}));

import { buildRefundWhereClause } from "../refund-query-builder";
import type { GetRefundsParams } from "../../types/refund.types";

// ============================================================================
// Helpers
// ============================================================================

function params(overrides: Partial<GetRefundsParams> = {}): GetRefundsParams {
	return {
		direction: "forward",
		perPage: 10,
		sortBy: "created-descending",
		...overrides,
	} as GetRefundsParams;
}

// ============================================================================
// buildRefundWhereClause
// ============================================================================

describe("buildRefundWhereClause", () => {
	it("should always set deletedAt to null", () => {
		const result = buildRefundWhereClause(params());
		expect(result.deletedAt).toBeNull();
	});

	it("should return no AND clause when no filters or search are provided", () => {
		const result = buildRefundWhereClause(params());
		expect(result.AND).toBeUndefined();
	});

	// --------------------------------------------------------------------------
	// Search
	// --------------------------------------------------------------------------

	describe("search", () => {
		it("should add OR conditions for search term", () => {
			const result = buildRefundWhereClause(params({ search: "SYN-001" }));
			expect(result.AND).toBeDefined();
			const andArray = result.AND as Record<string, unknown>[];
			const orCondition = andArray.find((c) => "OR" in c) as { OR: unknown[] };
			expect(orCondition).toBeDefined();
			expect(orCondition.OR).toHaveLength(3);
		});

		it("should search by orderNumber", () => {
			const result = buildRefundWhereClause(params({ search: "SYN-001" }));
			const andArray = result.AND as Record<string, unknown>[];
			const orCondition = andArray.find((c) => "OR" in c) as { OR: unknown[] };
			expect(orCondition.OR).toContainEqual({
				order: {
					orderNumber: { contains: "SYN-001", mode: "insensitive" },
				},
			});
		});

		it("should search by customerEmail", () => {
			const result = buildRefundWhereClause(params({ search: "test@example.com" }));
			const andArray = result.AND as Record<string, unknown>[];
			const orCondition = andArray.find((c) => "OR" in c) as { OR: unknown[] };
			expect(orCondition.OR).toContainEqual({
				order: {
					customerEmail: { contains: "test@example.com", mode: "insensitive" },
				},
			});
		});

		it("should search by customerName", () => {
			const result = buildRefundWhereClause(params({ search: "Jean" }));
			const andArray = result.AND as Record<string, unknown>[];
			const orCondition = andArray.find((c) => "OR" in c) as { OR: unknown[] };
			expect(orCondition.OR).toContainEqual({
				order: {
					customerName: { contains: "Jean", mode: "insensitive" },
				},
			});
		});
	});

	// --------------------------------------------------------------------------
	// Filters
	// --------------------------------------------------------------------------

	describe("filters", () => {
		it("should filter by single status", () => {
			const result = buildRefundWhereClause(
				params({ filters: { status: "PENDING" as never } })
			);
			const andArray = result.AND as Record<string, unknown>[];
			expect(andArray).toContainEqual({ status: "PENDING" });
		});

		it("should filter by multiple statuses", () => {
			const result = buildRefundWhereClause(
				params({ filters: { status: ["PENDING", "APPROVED"] as never } })
			);
			const andArray = result.AND as Record<string, unknown>[];
			expect(andArray).toContainEqual({
				status: { in: ["PENDING", "APPROVED"] },
			});
		});

		it("should filter by single reason", () => {
			const result = buildRefundWhereClause(
				params({ filters: { reason: "DEFECTIVE" as never } })
			);
			const andArray = result.AND as Record<string, unknown>[];
			expect(andArray).toContainEqual({ reason: "DEFECTIVE" });
		});

		it("should filter by multiple reasons", () => {
			const result = buildRefundWhereClause(
				params({ filters: { reason: ["DEFECTIVE", "FRAUD"] as never } })
			);
			const andArray = result.AND as Record<string, unknown>[];
			expect(andArray).toContainEqual({
				reason: { in: ["DEFECTIVE", "FRAUD"] },
			});
		});

		it("should filter by orderId", () => {
			const result = buildRefundWhereClause(
				params({ filters: { orderId: "order-123" } })
			);
			const andArray = result.AND as Record<string, unknown>[];
			expect(andArray).toContainEqual({ orderId: "order-123" });
		});

		it("should filter by createdAfter", () => {
			const date = new Date("2024-06-01");
			const result = buildRefundWhereClause(
				params({ filters: { createdAfter: date } })
			);
			const andArray = result.AND as Record<string, unknown>[];
			expect(andArray).toContainEqual({
				createdAt: { gte: date },
			});
		});

		it("should filter by createdBefore", () => {
			const date = new Date("2024-12-31");
			const result = buildRefundWhereClause(
				params({ filters: { createdBefore: date } })
			);
			const andArray = result.AND as Record<string, unknown>[];
			expect(andArray).toContainEqual({
				createdAt: { lte: date },
			});
		});

		it("should combine multiple filters", () => {
			const afterDate = new Date("2024-01-01");
			const result = buildRefundWhereClause(
				params({
					filters: {
						status: "COMPLETED" as never,
						reason: "DEFECTIVE" as never,
						createdAfter: afterDate,
					},
				})
			);
			const andArray = result.AND as Record<string, unknown>[];
			expect(andArray).toContainEqual({ status: "COMPLETED" });
			expect(andArray).toContainEqual({ reason: "DEFECTIVE" });
			expect(andArray).toContainEqual({ createdAt: { gte: afterDate } });
		});
	});

	// --------------------------------------------------------------------------
	// Combined search + filters
	// --------------------------------------------------------------------------

	it("should combine search and filters in AND clause", () => {
		const result = buildRefundWhereClause(
			params({
				search: "SYN-001",
				filters: { status: "PENDING" as never },
			})
		);
		const andArray = result.AND as Record<string, unknown>[];
		expect(andArray.length).toBeGreaterThanOrEqual(2);

		const hasSearch = andArray.some((c) => "OR" in c);
		const hasStatus = andArray.some(
			(c) => "status" in c && (c as { status: string }).status === "PENDING"
		);
		expect(hasSearch).toBe(true);
		expect(hasStatus).toBe(true);
	});
});
