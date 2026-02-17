import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: { QueryMode: { insensitive: "insensitive" } },
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	STOCK_THRESHOLDS: { CRITICAL: 1, LOW: 3, NORMAL_MAX: 50 },
}));

import type { GetProductSkusInput } from "../../schemas/get-skus.schemas";
import { buildWhereClause } from "../build-where-clause";

function params(overrides: Partial<GetProductSkusInput> = {}): GetProductSkusInput {
	return {
		perPage: 20,
		sortBy: "created-descending",
		...overrides,
	} as GetProductSkusInput;
}

describe("buildWhereClause", () => {
	it("should return { deletedAt: null } with no search or filters", () => {
		const result = buildWhereClause(params());

		expect(result).toEqual({ deletedAt: null });
	});

	it("should not set AND or OR when params are empty", () => {
		const result = buildWhereClause(params());

		expect(result.AND).toBeUndefined();
		expect(result.OR).toBeUndefined();
	});

	// ========================================================================
	// Search
	// ========================================================================

	it("should generate OR conditions for text search", () => {
		const result = buildWhereClause(params({ search: "bague" }));

		expect(result.OR).toBeDefined();
		expect(result.OR).toHaveLength(4);
		expect(result.OR).toEqual([
			{ sku: { contains: "bague", mode: "insensitive" } },
			{ product: { title: { contains: "bague", mode: "insensitive" } } },
			{ color: { name: { contains: "bague", mode: "insensitive" } } },
			{ material: { name: { contains: "bague", mode: "insensitive" } } },
		]);
	});

	it("should trim search term", () => {
		const result = buildWhereClause(params({ search: "  bague  " }));

		expect(result.OR).toBeDefined();
		expect(result.OR![0]).toEqual({ sku: { contains: "bague", mode: "insensitive" } });
	});

	it("should not add search conditions for empty string", () => {
		const result = buildWhereClause(params({ search: "" }));

		expect(result.OR).toBeUndefined();
	});

	it("should not add search conditions for whitespace only", () => {
		const result = buildWhereClause(params({ search: "   " }));

		expect(result.OR).toBeUndefined();
	});

	// ========================================================================
	// Filters
	// ========================================================================

	it("should add filter conditions in AND array", () => {
		const result = buildWhereClause(params({
			filters: { isActive: true },
		}));

		expect(result.AND).toBeDefined();
		expect(result.AND).toContainEqual({ isActive: true });
	});

	// ========================================================================
	// Combined search + filters
	// ========================================================================

	it("should combine search OR and filter AND", () => {
		const result = buildWhereClause(params({
			search: "bague",
			filters: { isActive: true },
		}));

		expect(result.deletedAt).toBeNull();
		expect(result.OR).toBeDefined();
		expect(result.AND).toBeDefined();
		expect(result.AND).toContainEqual({ isActive: true });
	});
});
