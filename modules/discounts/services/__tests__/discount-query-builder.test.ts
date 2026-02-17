import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: {},
}));

import { buildDiscountWhereClause } from "../discount-query-builder";

describe("buildDiscountWhereClause", () => {
	describe("base behaviour", () => {
		it("should always set deletedAt to null", () => {
			const result = buildDiscountWhereClause({});

			expect(result.deletedAt).toBeNull();
		});

		it("should not set AND when no conditions are provided", () => {
			const result = buildDiscountWhereClause({});

			expect(result.AND).toBeUndefined();
		});
	});

	describe("search", () => {
		it("should add a case-insensitive code search condition when search is provided", () => {
			const result = buildDiscountWhereClause({ search: "SUMMER" });

			expect(result.AND).toHaveLength(1);
			expect(result.AND).toContainEqual({
				code: { contains: "SUMMER", mode: "insensitive" },
			});
		});

		it("should not add a search condition when search is an empty string", () => {
			const result = buildDiscountWhereClause({ search: "" });

			expect(result.AND).toBeUndefined();
		});
	});

	describe("filter by type", () => {
		it("should add a type filter when filters.type is provided", () => {
			const result = buildDiscountWhereClause({
				filters: { type: "PERCENTAGE" },
			});

			expect(result.AND).toHaveLength(1);
			expect(result.AND).toContainEqual({ type: "PERCENTAGE" });
		});

		it("should add a FIXED_AMOUNT type filter correctly", () => {
			const result = buildDiscountWhereClause({
				filters: { type: "FIXED_AMOUNT" },
			});

			expect(result.AND).toHaveLength(1);
			expect(result.AND).toContainEqual({ type: "FIXED_AMOUNT" });
		});
	});

	describe("filter by isActive", () => {
		it("should add an isActive true condition when filters.isActive is true", () => {
			const result = buildDiscountWhereClause({
				filters: { isActive: true },
			});

			expect(result.AND).toHaveLength(1);
			expect(result.AND).toContainEqual({ isActive: true });
		});

		it("should add an isActive false condition when filters.isActive is false", () => {
			const result = buildDiscountWhereClause({
				filters: { isActive: false },
			});

			expect(result.AND).toHaveLength(1);
			expect(result.AND).toContainEqual({ isActive: false });
		});

		it("should not add an isActive condition when filters.isActive is undefined", () => {
			const result = buildDiscountWhereClause({ filters: {} });

			expect(result.AND).toBeUndefined();
		});
	});

	describe("filter by hasUsages", () => {
		it("should add a usageCount gt 0 condition when filters.hasUsages is true", () => {
			const result = buildDiscountWhereClause({
				filters: { hasUsages: true },
			});

			expect(result.AND).toHaveLength(1);
			expect(result.AND).toContainEqual({ usageCount: { gt: 0 } });
		});

		it("should add a usageCount equals 0 condition when filters.hasUsages is false", () => {
			const result = buildDiscountWhereClause({
				filters: { hasUsages: false },
			});

			expect(result.AND).toHaveLength(1);
			expect(result.AND).toContainEqual({ usageCount: { equals: 0 } });
		});

		it("should not add a usageCount condition when filters.hasUsages is undefined", () => {
			const result = buildDiscountWhereClause({ filters: {} });

			expect(result.AND).toBeUndefined();
		});
	});

	describe("multiple filters combined", () => {
		it("should include all active filters in AND when multiple filters are provided", () => {
			const result = buildDiscountWhereClause({
				filters: {
					type: "PERCENTAGE",
					isActive: true,
					hasUsages: true,
				},
			});

			expect(result.deletedAt).toBeNull();
			expect(result.AND).toHaveLength(3);
			expect(result.AND).toContainEqual({ type: "PERCENTAGE" });
			expect(result.AND).toContainEqual({ isActive: true });
			expect(result.AND).toContainEqual({ usageCount: { gt: 0 } });
		});
	});

	describe("search combined with filters", () => {
		it("should include both search and all filter conditions in AND", () => {
			const result = buildDiscountWhereClause({
				search: "ETE",
				filters: {
					type: "FIXED_AMOUNT",
					isActive: false,
					hasUsages: false,
				},
			});

			expect(result.deletedAt).toBeNull();
			expect(result.AND).toHaveLength(4);
			expect(result.AND).toContainEqual({
				code: { contains: "ETE", mode: "insensitive" },
			});
			expect(result.AND).toContainEqual({ type: "FIXED_AMOUNT" });
			expect(result.AND).toContainEqual({ isActive: false });
			expect(result.AND).toContainEqual({ usageCount: { equals: 0 } });
		});
	});
});
