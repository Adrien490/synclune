import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: {
		QueryMode: { insensitive: "insensitive" },
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	notDeleted: { deletedAt: null },
}));

import {
	buildReviewOrderBy,
	buildReviewWhereClause,
} from "../review-query-builder";
import type { GetReviewsParams } from "../../types/review.types";

function params(overrides: Partial<GetReviewsParams> = {}): GetReviewsParams {
	return { ...overrides } as GetReviewsParams;
}

// ============================================================================
// buildReviewOrderBy
// ============================================================================

describe("buildReviewOrderBy", () => {
	it("should return { createdAt: 'desc' } for 'createdAt-desc'", () => {
		expect(buildReviewOrderBy("createdAt-desc")).toEqual({ createdAt: "desc" });
	});

	it("should return { rating: 'asc' } for 'rating-asc'", () => {
		expect(buildReviewOrderBy("rating-asc")).toEqual({ rating: "asc" });
	});

	it("should return { updatedAt: 'desc' } for 'updatedAt-desc'", () => {
		expect(buildReviewOrderBy("updatedAt-desc")).toEqual({ updatedAt: "desc" });
	});
});

// ============================================================================
// buildReviewWhereClause — storefront context
// ============================================================================

describe("buildReviewWhereClause (storefront)", () => {
	it("should always include deletedAt: null", () => {
		const result = buildReviewWhereClause(params(), false);

		expect(result.deletedAt).toBeNull();
	});

	it("should always include status: 'PUBLISHED'", () => {
		const result = buildReviewWhereClause(params(), false);

		expect(result.status).toBe("PUBLISHED");
	});

	it("should filter by productId when provided", () => {
		const result = buildReviewWhereClause(params({ productId: "prod-1" }), false);

		expect(result.productId).toBe("prod-1");
	});

	it("should filter by rating when filterRating is provided", () => {
		const result = buildReviewWhereClause(params({ filterRating: 4 }), false);

		expect(result.rating).toBe(4);
	});

	it("should not include admin-only filters (userId)", () => {
		const result = buildReviewWhereClause(params({ userId: "user-1" }), false);

		expect(result.userId).toBeUndefined();
	});

	it("should not include admin-only filters (hasResponse)", () => {
		const result = buildReviewWhereClause(params({ hasResponse: true }), false);

		expect(result.response).toBeUndefined();
	});

	it("should not include admin-only filters (dateFrom/dateTo)", () => {
		const result = buildReviewWhereClause(
			params({ dateFrom: new Date("2024-01-01"), dateTo: new Date("2024-12-31") }),
			false
		);

		expect(result.createdAt).toBeUndefined();
	});

	it("should not include OR search conditions", () => {
		const result = buildReviewWhereClause(params({ search: "gold" }), false);

		expect(result.OR).toBeUndefined();
	});

	it("should return minimal where clause with no params", () => {
		const result = buildReviewWhereClause(params(), false);

		expect(result).toEqual({ deletedAt: null, status: "PUBLISHED" });
	});
});

// ============================================================================
// buildReviewWhereClause — admin context
// ============================================================================

describe("buildReviewWhereClause (admin)", () => {
	it("should always include deletedAt: null", () => {
		const result = buildReviewWhereClause(params(), true);

		expect(result.deletedAt).toBeNull();
	});

	it("should not include status: 'PUBLISHED' by default", () => {
		const result = buildReviewWhereClause(params(), true);

		expect(result.status).toBeUndefined();
	});

	it("should filter by status when provided", () => {
		const result = buildReviewWhereClause(params({ status: "PENDING" }), true);

		expect(result.status).toBe("PENDING");
	});

	it("should filter by userId when provided", () => {
		const result = buildReviewWhereClause(params({ userId: "user-42" }), true);

		expect(result.userId).toBe("user-42");
	});

	it("should filter by productId when provided", () => {
		const result = buildReviewWhereClause(params({ productId: "prod-99" }), true);

		expect(result.productId).toBe("prod-99");
	});

	it("should filter by filterRating when provided", () => {
		const result = buildReviewWhereClause(params({ filterRating: 5 }), true);

		expect(result.rating).toBe(5);
	});

	it("should set response: { isNot: null } when hasResponse is true", () => {
		const result = buildReviewWhereClause(params({ hasResponse: true }), true);

		expect(result.response).toEqual({ isNot: null });
	});

	it("should set response: null when hasResponse is false", () => {
		const result = buildReviewWhereClause(params({ hasResponse: false }), true);

		expect(result.response).toBeNull();
	});

	it("should not set response when hasResponse is undefined", () => {
		const result = buildReviewWhereClause(params(), true);

		expect(result.response).toBeUndefined();
	});

	it("should filter by dateFrom only", () => {
		const from = new Date("2024-01-01");
		const result = buildReviewWhereClause(params({ dateFrom: from }), true);

		expect(result.createdAt).toEqual({ gte: from });
	});

	it("should filter by dateTo only", () => {
		const to = new Date("2024-12-31");
		const result = buildReviewWhereClause(params({ dateTo: to }), true);

		expect(result.createdAt).toEqual({ lte: to });
	});

	it("should filter by both dateFrom and dateTo", () => {
		const from = new Date("2024-01-01");
		const to = new Date("2024-12-31");
		const result = buildReviewWhereClause(params({ dateFrom: from, dateTo: to }), true);

		expect(result.createdAt).toEqual({ gte: from, lte: to });
	});

	it("should not set createdAt when neither dateFrom nor dateTo is provided", () => {
		const result = buildReviewWhereClause(params(), true);

		expect(result.createdAt).toBeUndefined();
	});

	it("should build OR search across title, content, user.name, user.email, product.title", () => {
		const result = buildReviewWhereClause(params({ search: "bague" }), true);

		expect(result.OR).toEqual([
			{ title: { contains: "bague", mode: "insensitive" } },
			{ content: { contains: "bague", mode: "insensitive" } },
			{ user: { name: { contains: "bague", mode: "insensitive" } } },
			{ user: { email: { contains: "bague", mode: "insensitive" } } },
			{ product: { title: { contains: "bague", mode: "insensitive" } } },
		]);
	});

	it("should trim the search term before building OR conditions", () => {
		const result = buildReviewWhereClause(params({ search: "  bague  " }), true);

		expect(result.OR).toEqual([
			{ title: { contains: "bague", mode: "insensitive" } },
			{ content: { contains: "bague", mode: "insensitive" } },
			{ user: { name: { contains: "bague", mode: "insensitive" } } },
			{ user: { email: { contains: "bague", mode: "insensitive" } } },
			{ product: { title: { contains: "bague", mode: "insensitive" } } },
		]);
	});

	it("should not add OR when search is an empty string", () => {
		const result = buildReviewWhereClause(params({ search: "" }), true);

		expect(result.OR).toBeUndefined();
	});

	it("should not add OR when search is whitespace only", () => {
		const result = buildReviewWhereClause(params({ search: "   " }), true);

		expect(result.OR).toBeUndefined();
	});

	it("should combine multiple admin filters correctly", () => {
		const from = new Date("2024-06-01");
		const result = buildReviewWhereClause(
			params({
				status: "PUBLISHED",
				userId: "user-1",
				hasResponse: true,
				dateFrom: from,
				search: "bijou",
			}),
			true
		);

		expect(result.deletedAt).toBeNull();
		expect(result.status).toBe("PUBLISHED");
		expect(result.userId).toBe("user-1");
		expect(result.response).toEqual({ isNot: null });
		expect(result.createdAt).toEqual({ gte: from });
		expect(result.OR).toHaveLength(5);
	});
});
