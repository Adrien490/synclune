import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: { QueryMode: { insensitive: "insensitive" } },
}));

import {
	buildMaterialSearchConditions,
	buildMaterialWhereClause,
} from "../materials-query-builder";

describe("buildMaterialSearchConditions", () => {
	it("should return null when search is an empty string", () => {
		const result = buildMaterialSearchConditions("");

		expect(result).toBeNull();
	});

	it("should return null when search is only whitespace", () => {
		const result = buildMaterialSearchConditions("   ");

		expect(result).toBeNull();
	});

	it("should return an OR condition searching name, slug, and description", () => {
		const result = buildMaterialSearchConditions("gold");

		expect(result).toEqual({
			OR: [
				{ name: { contains: "gold", mode: "insensitive" } },
				{ slug: { contains: "gold", mode: "insensitive" } },
				{ description: { contains: "gold", mode: "insensitive" } },
			],
		});
	});

	it("should trim whitespace from the search term", () => {
		const result = buildMaterialSearchConditions("  silver  ");

		expect(result).toEqual({
			OR: [
				{ name: { contains: "silver", mode: "insensitive" } },
				{ slug: { contains: "silver", mode: "insensitive" } },
				{ description: { contains: "silver", mode: "insensitive" } },
			],
		});
	});
});

describe("buildMaterialWhereClause", () => {
	describe("base behaviour", () => {
		it("should return an empty clause when no params are provided", () => {
			const result = buildMaterialWhereClause({});

			expect(result).toEqual({});
		});

		it("should not set AND when no conditions are provided", () => {
			const result = buildMaterialWhereClause({});

			expect(result.AND).toBeUndefined();
		});
	});

	describe("search", () => {
		it("should add a case-insensitive search condition across name, slug, and description", () => {
			const result = buildMaterialWhereClause({ search: "bronze" });

			expect(result.AND).toHaveLength(1);
			expect(result.AND).toContainEqual({
				OR: [
					{ name: { contains: "bronze", mode: "insensitive" } },
					{ slug: { contains: "bronze", mode: "insensitive" } },
					{ description: { contains: "bronze", mode: "insensitive" } },
				],
			});
		});

		it("should not add a search condition when search is an empty string", () => {
			const result = buildMaterialWhereClause({ search: "" });

			expect(result.AND).toBeUndefined();
		});

		it("should not add a search condition when search is only whitespace", () => {
			const result = buildMaterialWhereClause({ search: "   " });

			expect(result.AND).toBeUndefined();
		});
	});

	describe("filter by isActive", () => {
		it("should add an isActive true condition when filters.isActive is true", () => {
			const result = buildMaterialWhereClause({
				filters: { isActive: true },
			});

			expect(result.AND).toHaveLength(1);
			expect(result.AND).toContainEqual({ isActive: true });
		});

		it("should add an isActive false condition when filters.isActive is false", () => {
			const result = buildMaterialWhereClause({
				filters: { isActive: false },
			});

			expect(result.AND).toHaveLength(1);
			expect(result.AND).toContainEqual({ isActive: false });
		});

		it("should not add an isActive condition when filters.isActive is undefined", () => {
			const result = buildMaterialWhereClause({ filters: {} });

			expect(result.AND).toBeUndefined();
		});

		it("should not add an isActive condition when filters is undefined", () => {
			const result = buildMaterialWhereClause({});

			expect(result.AND).toBeUndefined();
		});
	});

	describe("search combined with filters", () => {
		it("should include both search and isActive conditions in AND", () => {
			const result = buildMaterialWhereClause({
				search: "steel",
				filters: { isActive: true },
			});

			expect(result.AND).toHaveLength(2);
			expect(result.AND).toContainEqual({ isActive: true });
			expect(result.AND).toContainEqual({
				OR: [
					{ name: { contains: "steel", mode: "insensitive" } },
					{ slug: { contains: "steel", mode: "insensitive" } },
					{ description: { contains: "steel", mode: "insensitive" } },
				],
			});
		});

		it("should add only the isActive condition when search is empty", () => {
			const result = buildMaterialWhereClause({
				search: "",
				filters: { isActive: false },
			});

			expect(result.AND).toHaveLength(1);
			expect(result.AND).toContainEqual({ isActive: false });
		});
	});
});
