import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: { QueryMode: { insensitive: "insensitive" } },
}));

import type { GetProductTypesParams } from "../../types/product-type.types";
import {
	buildProductTypeSearchConditions,
	buildProductTypeFilterConditions,
	buildProductTypeWhereClause,
} from "../product-type-query-builder";

function params(partial: Partial<GetProductTypesParams> = {}): GetProductTypesParams {
	return {
		direction: "forward",
		perPage: 20,
		sortBy: "label-ascending",
		filters: {},
		...partial,
	} as GetProductTypesParams;
}

describe("buildProductTypeSearchConditions", () => {
	it("should return null when search is an empty string", () => {
		expect(buildProductTypeSearchConditions("")).toBeNull();
	});

	it("should return null when search is only whitespace", () => {
		expect(buildProductTypeSearchConditions("   ")).toBeNull();
	});

	it("should return an OR condition searching label, slug, and description", () => {
		const result = buildProductTypeSearchConditions("collier");

		expect(result).toEqual({
			OR: [
				{ label: { contains: "collier", mode: "insensitive" } },
				{ slug: { contains: "collier", mode: "insensitive" } },
				{ description: { contains: "collier", mode: "insensitive" } },
			],
		});
	});

	it("should trim whitespace from the search term", () => {
		const result = buildProductTypeSearchConditions("  bague  ");

		expect(result).toEqual({
			OR: [
				{ label: { contains: "bague", mode: "insensitive" } },
				{ slug: { contains: "bague", mode: "insensitive" } },
				{ description: { contains: "bague", mode: "insensitive" } },
			],
		});
	});
});

describe("buildProductTypeFilterConditions", () => {
	it("should return empty object when no filters are set", () => {
		expect(buildProductTypeFilterConditions({})).toEqual({});
	});

	it("should add isActive condition when set to true", () => {
		expect(buildProductTypeFilterConditions({ isActive: true })).toEqual({
			isActive: true,
		});
	});

	it("should add isActive condition when set to false", () => {
		expect(buildProductTypeFilterConditions({ isActive: false })).toEqual({
			isActive: false,
		});
	});

	it("should add isSystem condition when set to true", () => {
		expect(buildProductTypeFilterConditions({ isSystem: true })).toEqual({
			isSystem: true,
		});
	});

	it("should add isSystem condition when set to false", () => {
		expect(buildProductTypeFilterConditions({ isSystem: false })).toEqual({
			isSystem: false,
		});
	});

	it("should add hasProducts some condition when set to true", () => {
		expect(buildProductTypeFilterConditions({ hasProducts: true })).toEqual({
			products: { some: {} },
		});
	});

	it("should add hasProducts none condition when set to false", () => {
		expect(buildProductTypeFilterConditions({ hasProducts: false })).toEqual({
			products: { none: {} },
		});
	});

	it("should combine multiple filters", () => {
		const result = buildProductTypeFilterConditions({
			isActive: true,
			isSystem: false,
			hasProducts: true,
		});

		expect(result).toEqual({
			isActive: true,
			isSystem: false,
			products: { some: {} },
		});
	});
});

describe("buildProductTypeWhereClause", () => {
	describe("base behaviour", () => {
		it("should return an empty clause when no params are provided", () => {
			expect(buildProductTypeWhereClause(params())).toEqual({});
		});

		it("should not set AND when no conditions are provided", () => {
			expect(buildProductTypeWhereClause(params()).AND).toBeUndefined();
		});
	});

	describe("search only", () => {
		it("should return the search condition directly when only search is provided", () => {
			const result = buildProductTypeWhereClause(params({ search: "bracelet" }));

			expect(result).toEqual({
				OR: [
					{ label: { contains: "bracelet", mode: "insensitive" } },
					{ slug: { contains: "bracelet", mode: "insensitive" } },
					{ description: { contains: "bracelet", mode: "insensitive" } },
				],
			});
		});

		it("should not add a search condition when search is empty", () => {
			expect(buildProductTypeWhereClause(params({ search: "" }))).toEqual({});
		});

		it("should not add a search condition when search is only whitespace", () => {
			expect(buildProductTypeWhereClause(params({ search: "   " }))).toEqual({});
		});
	});

	describe("filters only", () => {
		it("should return the filter condition directly when only one filter is set", () => {
			const result = buildProductTypeWhereClause(
				params({ filters: { isActive: true } })
			);

			expect(result).toEqual({ isActive: true });
		});

		it("should not add conditions when filters are empty", () => {
			expect(buildProductTypeWhereClause(params({ filters: {} }))).toEqual({});
		});
	});

	describe("search combined with filters", () => {
		it("should wrap both conditions in AND", () => {
			const result = buildProductTypeWhereClause(
				params({ search: "collier", filters: { isActive: true } })
			);

			expect(result.AND).toHaveLength(2);
			expect(result.AND).toContainEqual({ isActive: true });
			expect(result.AND).toContainEqual({
				OR: [
					{ label: { contains: "collier", mode: "insensitive" } },
					{ slug: { contains: "collier", mode: "insensitive" } },
					{ description: { contains: "collier", mode: "insensitive" } },
				],
			});
		});

		it("should add only the filter condition when search is empty", () => {
			const result = buildProductTypeWhereClause(
				params({ search: "", filters: { isActive: false } })
			);

			expect(result).toEqual({ isActive: false });
		});
	});
});
