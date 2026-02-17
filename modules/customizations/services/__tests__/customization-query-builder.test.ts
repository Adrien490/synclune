import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: {},
}));

import { buildCustomizationWhereClause } from "../customization-query-builder";

describe("buildCustomizationWhereClause", () => {
	describe("base behaviour", () => {
		it("should always set deletedAt to null", () => {
			const result = buildCustomizationWhereClause();

			expect(result.deletedAt).toBeNull();
		});

		it("should not set AND when no filters are provided", () => {
			const result = buildCustomizationWhereClause();

			expect(result.AND).toBeUndefined();
		});

		it("should not set AND when empty filters are provided", () => {
			const result = buildCustomizationWhereClause({});

			expect(result.AND).toBeUndefined();
		});
	});

	describe("status filter", () => {
		it("should add a status condition when status filter is provided", () => {
			const result = buildCustomizationWhereClause({ status: "PENDING" });

			expect(result.AND).toHaveLength(1);
			expect(result.AND).toContainEqual({ status: "PENDING" });
		});

		it("should handle IN_PROGRESS status", () => {
			const result = buildCustomizationWhereClause({ status: "IN_PROGRESS" });

			expect(result.AND).toHaveLength(1);
			expect(result.AND).toContainEqual({ status: "IN_PROGRESS" });
		});

		it("should not add status condition when status is undefined", () => {
			const result = buildCustomizationWhereClause({ search: undefined });

			expect(result.AND).toBeUndefined();
		});
	});

	describe("search filter", () => {
		it("should add OR conditions for firstName and email when search is provided", () => {
			const result = buildCustomizationWhereClause({ search: "alice" });

			expect(result.AND).toHaveLength(1);
			expect(result.AND).toContainEqual({
				OR: [
					{ firstName: { contains: "alice", mode: "insensitive" } },
					{ email: { contains: "alice", mode: "insensitive" } },
				],
			});
		});

		it("should not add search condition when search is empty string", () => {
			const result = buildCustomizationWhereClause({ search: "" });

			expect(result.AND).toBeUndefined();
		});
	});

	describe("combined filters", () => {
		it("should include both status and search conditions in AND", () => {
			const result = buildCustomizationWhereClause({
				status: "COMPLETED",
				search: "test",
			});

			expect(result.deletedAt).toBeNull();
			expect(result.AND).toHaveLength(2);
			expect(result.AND).toContainEqual({ status: "COMPLETED" });
			expect(result.AND).toContainEqual({
				OR: [
					{ firstName: { contains: "test", mode: "insensitive" } },
					{ email: { contains: "test", mode: "insensitive" } },
				],
			});
		});
	});
});
