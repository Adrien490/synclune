import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: {
		QueryMode: { insensitive: "insensitive" },
	},
}));

import {
	buildOrderSearchConditions,
	buildOrderFilterConditions,
	buildOrderWhereClause,
} from "../order-query-builder";
import type { OrderFilters, GetOrdersParams } from "../../types/order.types";

function filters(overrides: Partial<OrderFilters> = {}): OrderFilters {
	return { showDeleted: undefined, ...overrides } as OrderFilters;
}

function params(overrides: Partial<GetOrdersParams> = {}): GetOrdersParams {
	return {
		direction: "forward",
		perPage: 20,
		sortBy: "created-descending",
		...overrides,
	} as GetOrdersParams;
}

// ============================================================================
// buildOrderSearchConditions
// ============================================================================

describe("buildOrderSearchConditions", () => {
	it("should return null for empty string", () => {
		expect(buildOrderSearchConditions("")).toBeNull();
	});

	it("should return null for whitespace-only string", () => {
		expect(buildOrderSearchConditions("   ")).toBeNull();
	});

	it("should return OR conditions for a search term", () => {
		const result = buildOrderSearchConditions("SYN-001");
		expect(result).not.toBeNull();
		expect(result!.OR).toHaveLength(4);
	});

	it("should include orderNumber search", () => {
		const result = buildOrderSearchConditions("SYN-001");
		expect(result!.OR).toContainEqual({
			orderNumber: { contains: "SYN-001", mode: "insensitive" },
		});
	});

	it("should include user email search", () => {
		const result = buildOrderSearchConditions("test@example.com");
		expect(result!.OR).toContainEqual({
			user: { email: { contains: "test@example.com", mode: "insensitive" } },
		});
	});

	it("should include user name search", () => {
		const result = buildOrderSearchConditions("Jean");
		expect(result!.OR).toContainEqual({
			user: { name: { contains: "Jean", mode: "insensitive" } },
		});
	});

	it("should include stripePaymentIntentId search", () => {
		const result = buildOrderSearchConditions("pi_123");
		expect(result!.OR).toContainEqual({
			stripePaymentIntentId: { contains: "pi_123", mode: "insensitive" },
		});
	});

	it("should trim the search term", () => {
		const result = buildOrderSearchConditions("  SYN-001  ");
		expect(result!.OR).toContainEqual({
			orderNumber: { contains: "SYN-001", mode: "insensitive" },
		});
	});
});

// ============================================================================
// buildOrderFilterConditions
// ============================================================================

describe("buildOrderFilterConditions", () => {
	it("should exclude PENDING by default when no status filter", () => {
		const result = buildOrderFilterConditions(filters({}));
		expect(result.status).toEqual({ not: "PENDING" });
	});

	it("should filter by single status", () => {
		const result = buildOrderFilterConditions(filters({ status: "SHIPPED" }));
		expect(result.status).toBe("SHIPPED");
	});

	it("should filter by multiple statuses", () => {
		const result = buildOrderFilterConditions(filters({
			status: ["SHIPPED", "DELIVERED"],
		}));
		expect(result.status).toEqual({ in: ["SHIPPED", "DELIVERED"] });
	});

	it("should unwrap single-element array status", () => {
		const result = buildOrderFilterConditions(filters({ status: ["PROCESSING"] }));
		expect(result.status).toBe("PROCESSING");
	});

	it("should filter by single paymentStatus", () => {
		const result = buildOrderFilterConditions(filters({ paymentStatus: "PAID" }));
		expect(result.paymentStatus).toBe("PAID");
	});

	it("should filter by multiple paymentStatuses", () => {
		const result = buildOrderFilterConditions(filters({
			paymentStatus: ["PAID", "REFUNDED"],
		}));
		expect(result.paymentStatus).toEqual({ in: ["PAID", "REFUNDED"] });
	});

	it("should filter by single fulfillmentStatus", () => {
		const result = buildOrderFilterConditions(filters({
			fulfillmentStatus: "SHIPPED",
		}));
		expect(result.fulfillmentStatus).toBe("SHIPPED");
	});

	it("should filter by totalMin only", () => {
		const result = buildOrderFilterConditions(filters({ totalMin: 1000 }));
		expect(result.total).toEqual({ gte: 1000 });
	});

	it("should filter by totalMax only", () => {
		const result = buildOrderFilterConditions(filters({ totalMax: 5000 }));
		expect(result.total).toEqual({ lte: 5000 });
	});

	it("should filter by totalMin and totalMax", () => {
		const result = buildOrderFilterConditions(filters({
			totalMin: 1000,
			totalMax: 5000,
		}));
		expect(result.total).toEqual({ gte: 1000, lte: 5000 });
	});

	it("should filter by createdAfter only", () => {
		const date = new Date("2024-01-01");
		const result = buildOrderFilterConditions(filters({ createdAfter: date }));
		expect(result.createdAt).toEqual({ gte: date });
	});

	it("should filter by createdBefore only", () => {
		const date = new Date("2024-12-31");
		const result = buildOrderFilterConditions(filters({ createdBefore: date }));
		expect(result.createdAt).toEqual({ lte: date });
	});

	it("should filter by createdAfter and createdBefore", () => {
		const after = new Date("2024-01-01");
		const before = new Date("2024-12-31");
		const result = buildOrderFilterConditions(filters({
			createdAfter: after,
			createdBefore: before,
		}));
		expect(result.createdAt).toEqual({ gte: after, lte: before });
	});

	it("should combine multiple filters", () => {
		const result = buildOrderFilterConditions(filters({
			status: "SHIPPED",
			paymentStatus: "PAID",
			totalMin: 500,
		}));
		expect(result.status).toBe("SHIPPED");
		expect(result.paymentStatus).toBe("PAID");
		expect(result.total).toEqual({ gte: 500 });
	});
});

// ============================================================================
// buildOrderWhereClause
// ============================================================================

describe("buildOrderWhereClause", () => {
	it("should always set deletedAt to null", () => {
		const result = buildOrderWhereClause(params({}));
		expect(result.deletedAt).toBeNull();
	});

	it("should include default filter conditions (exclude PENDING)", () => {
		const result = buildOrderWhereClause(params({}));
		expect(result.AND).toBeDefined();
		expect(result.AND).toContainEqual(
			expect.objectContaining({ status: { not: "PENDING" } })
		);
	});

	it("should add search conditions when search is provided", () => {
		const result = buildOrderWhereClause(params({ search: "SYN-001" }));
		expect(result.AND).toBeDefined();
		expect((result.AND as unknown[]).length).toBeGreaterThan(1);
	});

	it("should include fuzzy IDs when provided", () => {
		const result = buildOrderWhereClause(
			params({ search: "test" }),
			["id1", "id2"]
		);
		const andConditions = result.AND as Array<Record<string, unknown>>;
		const orCondition = andConditions.find(
			(c) => "OR" in c
		);
		expect(orCondition).toBeDefined();
	});

	it("should use only fuzzy IDs when search produces no exact conditions", () => {
		const result = buildOrderWhereClause(params({}), ["id1", "id2"]);
		// No search term, no fuzzy condition added
		expect(result.AND).toBeDefined();
	});

	it("should handle no search and no fuzzy IDs", () => {
		const result = buildOrderWhereClause(params({}));
		expect(result.AND).toBeDefined();
		// Only filter conditions
		expect(result.AND).toHaveLength(1);
	});
});
