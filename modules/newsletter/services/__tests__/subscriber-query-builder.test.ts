import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: { QueryMode: { insensitive: "insensitive" } },
	NewsletterStatus: { CONFIRMED: "CONFIRMED", PENDING: "PENDING", UNSUBSCRIBED: "UNSUBSCRIBED" },
}));

import type { GetSubscribersParams } from "../../types/subscriber.types";
import {
	buildSubscriberSearchConditions,
	buildSubscriberFilterConditions,
	buildSubscriberWhereClause,
} from "../subscriber-query-builder";

// Helper to create partial params (only search & filters are used by the builder)
function params(partial: Partial<GetSubscribersParams> = {}): GetSubscribersParams {
	return {
		direction: "forward",
		perPage: 20,
		sortBy: "subscribed-descending",
		...partial,
	} as GetSubscribersParams;
}

// ============================================================================
// buildSubscriberSearchConditions
// ============================================================================

describe("buildSubscriberSearchConditions", () => {
	it("should return null when search is an empty string", () => {
		const result = buildSubscriberSearchConditions("");

		expect(result).toBeNull();
	});

	it("should return null when search is only whitespace", () => {
		const result = buildSubscriberSearchConditions("   ");

		expect(result).toBeNull();
	});

	it("should return an email contains condition for a valid search term", () => {
		const result = buildSubscriberSearchConditions("alice");

		expect(result).toEqual({
			email: { contains: "alice", mode: "insensitive" },
		});
	});

	it("should trim whitespace from the search term", () => {
		const result = buildSubscriberSearchConditions("  alice@example.com  ");

		expect(result).toEqual({
			email: { contains: "alice@example.com", mode: "insensitive" },
		});
	});
});

// ============================================================================
// buildSubscriberFilterConditions
// ============================================================================

describe("buildSubscriberFilterConditions", () => {
	it("should return an empty object when no filters are provided", () => {
		const result = buildSubscriberFilterConditions({});

		expect(result).toEqual({});
	});

	it("should add a status condition when status filter is provided", () => {
		const result = buildSubscriberFilterConditions({ status: "CONFIRMED" });

		expect(result.status).toBe("CONFIRMED");
	});

	it("should add a status condition for PENDING status", () => {
		const result = buildSubscriberFilterConditions({ status: "PENDING" });

		expect(result.status).toBe("PENDING");
	});

	it("should add a status condition for UNSUBSCRIBED status", () => {
		const result = buildSubscriberFilterConditions({ status: "UNSUBSCRIBED" });

		expect(result.status).toBe("UNSUBSCRIBED");
	});

	it("should not add a status condition when status is undefined", () => {
		const result = buildSubscriberFilterConditions({ status: undefined });

		expect(result.status).toBeUndefined();
	});

	it("should add subscribedAt.gte when subscribedAfter is provided", () => {
		const date = new Date("2024-01-01");
		const result = buildSubscriberFilterConditions({ subscribedAfter: date });

		expect(result.subscribedAt).toBeDefined();
		expect((result.subscribedAt as { gte?: Date }).gte).toBe(date);
		expect((result.subscribedAt as { lte?: Date }).lte).toBeUndefined();
	});

	it("should add subscribedAt.lte when subscribedBefore is provided", () => {
		const date = new Date("2024-12-31");
		const result = buildSubscriberFilterConditions({ subscribedBefore: date });

		expect(result.subscribedAt).toBeDefined();
		expect((result.subscribedAt as { lte?: Date }).lte).toBe(date);
		expect((result.subscribedAt as { gte?: Date }).gte).toBeUndefined();
	});

	it("should add both subscribedAt.gte and subscribedAt.lte when both date filters are provided", () => {
		const after = new Date("2024-01-01");
		const before = new Date("2024-12-31");
		const result = buildSubscriberFilterConditions({
			subscribedAfter: after,
			subscribedBefore: before,
		});

		expect(result.subscribedAt).toBeDefined();
		expect((result.subscribedAt as { gte?: Date }).gte).toBe(after);
		expect((result.subscribedAt as { lte?: Date }).lte).toBe(before);
	});

	it("should not add subscribedAt when neither date filter is provided", () => {
		const result = buildSubscriberFilterConditions({});

		expect(result.subscribedAt).toBeUndefined();
	});
});

// ============================================================================
// buildSubscriberWhereClause
// ============================================================================

describe("buildSubscriberWhereClause", () => {
	describe("base behaviour", () => {
		it("should always include deletedAt: null", () => {
			const result = buildSubscriberWhereClause(params());

			expect(result.deletedAt).toBeNull();
		});

		it("should not set AND when no conditions are provided", () => {
			const result = buildSubscriberWhereClause(params());

			expect(result.AND).toBeUndefined();
		});

		it("should not set AND when filters is undefined and search is empty", () => {
			const result = buildSubscriberWhereClause(params({ search: "" }));

			expect(result.AND).toBeUndefined();
		});
	});

	describe("search", () => {
		it("should add a case-insensitive email search condition", () => {
			const result = buildSubscriberWhereClause(params({ search: "alice" }));

			expect(result.AND).toHaveLength(1);
			expect(result.AND).toContainEqual({
				email: { contains: "alice", mode: "insensitive" },
			});
		});

		it("should not add a search condition when search is an empty string", () => {
			const result = buildSubscriberWhereClause(params({ search: "" }));

			expect(result.AND).toBeUndefined();
		});

		it("should not add a search condition when search is only whitespace", () => {
			const result = buildSubscriberWhereClause(params({ search: "   " }));

			expect(result.AND).toBeUndefined();
		});
	});

	describe("filters", () => {
		it("should add a status filter condition when filters.status is provided", () => {
			const result = buildSubscriberWhereClause(
				params({ filters: { status: "CONFIRMED" } }),
			);

			expect(result.AND).toHaveLength(1);
			expect(result.AND).toContainEqual({ status: "CONFIRMED" });
		});

		it("should add a date range filter when subscribedAfter is provided", () => {
			const date = new Date("2024-06-01");
			const result = buildSubscriberWhereClause(
				params({ filters: { subscribedAfter: date } }),
			);

			expect(result.AND).toHaveLength(1);
			expect(result.AND).toContainEqual({
				subscribedAt: { gte: date },
			});
		});

		it("should add a date range filter when subscribedBefore is provided", () => {
			const date = new Date("2024-06-30");
			const result = buildSubscriberWhereClause(
				params({ filters: { subscribedBefore: date } }),
			);

			expect(result.AND).toHaveLength(1);
			expect(result.AND).toContainEqual({
				subscribedAt: { lte: date },
			});
		});

		it("should push an empty filter object to AND when filters is an empty object", () => {
			const result = buildSubscriberWhereClause(params({ filters: {} }));

			expect(result.AND).toHaveLength(1);
			expect(result.AND).toContainEqual({});
		});
	});

	describe("combined search and filters", () => {
		it("should include both search and status conditions in AND", () => {
			const result = buildSubscriberWhereClause(
				params({ search: "alice", filters: { status: "CONFIRMED" } }),
			);

			expect(result.AND).toHaveLength(2);
			expect(result.AND).toContainEqual({ status: "CONFIRMED" });
			expect(result.AND).toContainEqual({
				email: { contains: "alice", mode: "insensitive" },
			});
		});

		it("should include both date range and search conditions in AND", () => {
			const after = new Date("2024-01-01");
			const result = buildSubscriberWhereClause(
				params({ search: "test", filters: { subscribedAfter: after } }),
			);

			expect(result.AND).toHaveLength(2);
			expect(result.AND).toContainEqual({ subscribedAt: { gte: after } });
			expect(result.AND).toContainEqual({
				email: { contains: "test", mode: "insensitive" },
			});
		});

		it("should still include deletedAt: null when conditions are present", () => {
			const result = buildSubscriberWhereClause(
				params({ search: "alice", filters: { status: "PENDING" } }),
			);

			expect(result.deletedAt).toBeNull();
		});
	});
});
