import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: { QueryMode: { insensitive: "insensitive" } },
}));

import type { GetColorsParams } from "../../types/color.types";
import {
	buildColorSearchConditions,
	buildColorFilterConditions,
	buildColorWhereClause,
} from "../color-query-builder";

// Helper to create partial params (only search & filters are used by the builder)
function params(partial: Partial<GetColorsParams> = {}): GetColorsParams {
	return {
		direction: "forward",
		perPage: 20,
		sortBy: "name-ascending",
		filters: {},
		...partial,
	} as GetColorsParams;
}

describe("buildColorSearchConditions", () => {
	it("should return null when search is an empty string", () => {
		const result = buildColorSearchConditions("");

		expect(result).toBeNull();
	});

	it("should return null when search is only whitespace", () => {
		const result = buildColorSearchConditions("   ");

		expect(result).toBeNull();
	});

	it("should return an OR condition searching name, slug, and hex", () => {
		const result = buildColorSearchConditions("rouge");

		expect(result).toEqual({
			OR: [
				{ name: { contains: "rouge", mode: "insensitive" } },
				{ slug: { contains: "rouge", mode: "insensitive" } },
				{ hex: { contains: "rouge", mode: "insensitive" } },
			],
		});
	});

	it("should trim whitespace from the search term", () => {
		const result = buildColorSearchConditions("  bleu  ");

		expect(result).toEqual({
			OR: [
				{ name: { contains: "bleu", mode: "insensitive" } },
				{ slug: { contains: "bleu", mode: "insensitive" } },
				{ hex: { contains: "bleu", mode: "insensitive" } },
			],
		});
	});
});

describe("buildColorFilterConditions", () => {
	it("should return an empty object when no filters are provided", () => {
		const result = buildColorFilterConditions({});

		expect(result).toEqual({});
	});

	it("should add isActive true when filters.isActive is true", () => {
		const result = buildColorFilterConditions({ isActive: true });

		expect(result).toEqual({ isActive: true });
	});

	it("should add isActive false when filters.isActive is false", () => {
		const result = buildColorFilterConditions({ isActive: false });

		expect(result).toEqual({ isActive: false });
	});

	it("should not add isActive when filters.isActive is undefined", () => {
		const result = buildColorFilterConditions({ isActive: undefined });

		expect(result).toEqual({});
	});
});

describe("buildColorWhereClause", () => {
	describe("base behaviour", () => {
		it("should return an empty clause when no params are provided", () => {
			const result = buildColorWhereClause(params());

			expect(result).toEqual({});
		});

		it("should not set AND when no conditions are provided", () => {
			const result = buildColorWhereClause(params());

			expect(result.AND).toBeUndefined();
		});
	});

	describe("search", () => {
		it("should add a case-insensitive search condition across name, slug, and hex", () => {
			const result = buildColorWhereClause(params({ search: "FF5733" }));

			expect(result).toEqual({
				OR: [
					{ name: { contains: "FF5733", mode: "insensitive" } },
					{ slug: { contains: "FF5733", mode: "insensitive" } },
					{ hex: { contains: "FF5733", mode: "insensitive" } },
				],
			});
		});

		it("should not add a search condition when search is an empty string", () => {
			const result = buildColorWhereClause(params({ search: "" }));

			expect(result).toEqual({});
		});

		it("should not add a search condition when search is only whitespace", () => {
			const result = buildColorWhereClause(params({ search: "   " }));

			expect(result).toEqual({});
		});
	});

	describe("filter by isActive", () => {
		it("should add an isActive true condition when filters.isActive is true", () => {
			const result = buildColorWhereClause(params({
				filters: { isActive: true },
			}));

			expect(result).toEqual({ isActive: true });
		});

		it("should add an isActive false condition when filters.isActive is false", () => {
			const result = buildColorWhereClause(params({
				filters: { isActive: false },
			}));

			expect(result).toEqual({ isActive: false });
		});

		it("should not add an isActive condition when filters.isActive is undefined", () => {
			const result = buildColorWhereClause(params({ filters: {} }));

			expect(result).toEqual({});
		});

		it("should not add an isActive condition when filters is undefined", () => {
			const result = buildColorWhereClause(params());

			expect(result).toEqual({});
		});
	});

	describe("search combined with filters", () => {
		it("should include both search and isActive conditions in AND", () => {
			const result = buildColorWhereClause(params({
				search: "vert",
				filters: { isActive: true },
			}));

			expect(result.AND).toHaveLength(2);
			expect(result.AND).toContainEqual({ isActive: true });
			expect(result.AND).toContainEqual({
				OR: [
					{ name: { contains: "vert", mode: "insensitive" } },
					{ slug: { contains: "vert", mode: "insensitive" } },
					{ hex: { contains: "vert", mode: "insensitive" } },
				],
			});
		});

		it("should add only the isActive condition when search is empty", () => {
			const result = buildColorWhereClause(params({
				search: "",
				filters: { isActive: false },
			}));

			expect(result).toEqual({ isActive: false });
		});
	});

	describe("short-circuit optimization", () => {
		it("should return a single condition without AND when only one condition exists", () => {
			const result = buildColorWhereClause(params({ search: "bleu" }));

			// Single condition should be returned directly, not wrapped in AND
			expect(result.AND).toBeUndefined();
			expect(result.OR).toBeDefined();
		});
	});
});
