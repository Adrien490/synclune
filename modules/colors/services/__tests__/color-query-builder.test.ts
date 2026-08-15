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

	it("should return an OR condition searching name and hex", () => {
		const result = buildColorSearchConditions("rouge");

		expect(result).toEqual({
			OR: [
				{ name: { contains: "rouge", mode: "insensitive" } },
				{ hex: { contains: "rouge", mode: "insensitive" } },
			],
		});
	});

	it("should trim whitespace from the search term", () => {
		const result = buildColorSearchConditions("  bleu  ");

		expect(result).toEqual({
			OR: [
				{ name: { contains: "bleu", mode: "insensitive" } },
				{ hex: { contains: "bleu", mode: "insensitive" } },
			],
		});
	});
});

describe("buildColorFilterConditions", () => {
	// Schéma lean : Color n'a plus de statut — le filtre est un no-op assumé.
	it("should return an empty object whatever the input", () => {
		expect(buildColorFilterConditions({})).toEqual({});
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
		it("should add a case-insensitive search condition across name and hex", () => {
			const result = buildColorWhereClause(params({ search: "FF5733" }));

			expect(result).toEqual({
				OR: [
					{ name: { contains: "FF5733", mode: "insensitive" } },
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

	describe("short-circuit optimization", () => {
		it("should return a single condition without AND when only one condition exists", () => {
			const result = buildColorWhereClause(params({ search: "bleu" }));

			// Single condition should be returned directly, not wrapped in AND
			expect(result.AND).toBeUndefined();
			expect(result.OR).toBeDefined();
		});
	});
});
