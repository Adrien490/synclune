import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: { QueryMode: { insensitive: "insensitive" } },
}));

import type { GetMaterialsParams } from "../../types/materials.types";
import {
	buildMaterialSearchConditions,
	buildMaterialWhereClause,
} from "../materials-query-builder";

// Helper to create partial params (only search & filters are used by the builder)
function params(partial: Partial<GetMaterialsParams> = {}): GetMaterialsParams {
	return {
		direction: "forward",
		perPage: 20,
		sortBy: "name-ascending",
		filters: {},
		...partial,
	} as GetMaterialsParams;
}

describe("buildMaterialSearchConditions", () => {
	it("should return null when search is an empty string", () => {
		const result = buildMaterialSearchConditions("");

		expect(result).toBeNull();
	});

	it("should return null when search is only whitespace", () => {
		const result = buildMaterialSearchConditions("   ");

		expect(result).toBeNull();
	});

	it("should return an OR condition searching name only", () => {
		const result = buildMaterialSearchConditions("gold");

		expect(result).toEqual({
			OR: [{ name: { contains: "gold", mode: "insensitive" } }],
		});
	});

	it("should trim whitespace from the search term", () => {
		const result = buildMaterialSearchConditions("  silver  ");

		expect(result).toEqual({
			OR: [{ name: { contains: "silver", mode: "insensitive" } }],
		});
	});
});

describe("buildMaterialWhereClause", () => {
	describe("base behaviour", () => {
		it("should return an empty clause when no params are provided", () => {
			const result = buildMaterialWhereClause(params());

			expect(result).toEqual({});
		});

		it("should not set AND when no conditions are provided", () => {
			const result = buildMaterialWhereClause(params());

			expect(result.AND).toBeUndefined();
		});
	});

	describe("search", () => {
		it("should add a case-insensitive search condition across name only", () => {
			const result = buildMaterialWhereClause(params({ search: "bronze" }));

			expect(result.AND).toHaveLength(1);
			expect(result.AND).toContainEqual({
				OR: [{ name: { contains: "bronze", mode: "insensitive" } }],
			});
		});

		it("should not add a search condition when search is an empty string", () => {
			const result = buildMaterialWhereClause(params({ search: "" }));

			expect(result.AND).toBeUndefined();
		});

		it("should not add a search condition when search is only whitespace", () => {
			const result = buildMaterialWhereClause(params({ search: "   " }));

			expect(result.AND).toBeUndefined();
		});
	});
});
