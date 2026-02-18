import { describe, it, expect, vi } from "vitest";

// Mock Prisma client before importing the module under test so that
// Prisma.QueryMode.insensitive is available as a plain string value.
vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: { QueryMode: { insensitive: "insensitive" } },
	CollectionStatus: { PUBLIC: "PUBLIC", DRAFT: "DRAFT", ARCHIVED: "ARCHIVED" },
}));

import type { CollectionFilters, GetCollectionsParams } from "../../types/collection.types";
import {
	buildCollectionSearchConditions,
	buildCollectionFilterConditions,
	buildCollectionWhereClause,
} from "../collection-query-builder";

// ---------------------------------------------------------------------------
// buildCollectionSearchConditions
// ---------------------------------------------------------------------------

describe("buildCollectionSearchConditions", () => {
	it("returns null for an empty string", () => {
		expect(buildCollectionSearchConditions("")).toBeNull();
	});

	it("returns null for a whitespace-only string", () => {
		expect(buildCollectionSearchConditions("   ")).toBeNull();
	});

	it("returns an OR condition object for a non-empty search term", () => {
		const result = buildCollectionSearchConditions("bracelet");
		expect(result).not.toBeNull();
		expect(result).toHaveProperty("OR");
	});

	it("includes case-insensitive name condition", () => {
		const result = buildCollectionSearchConditions("collier");
		expect(result?.OR).toContainEqual({
			name: { contains: "collier", mode: "insensitive" },
		});
	});

	it("includes case-insensitive slug condition", () => {
		const result = buildCollectionSearchConditions("collier");
		expect(result?.OR).toContainEqual({
			slug: { contains: "collier", mode: "insensitive" },
		});
	});

	it("includes case-insensitive description condition", () => {
		const result = buildCollectionSearchConditions("collier");
		expect(result?.OR).toContainEqual({
			description: { contains: "collier", mode: "insensitive" },
		});
	});

	it("produces exactly three OR branches (name, slug, description)", () => {
		const result = buildCollectionSearchConditions("argent");
		expect(result?.OR).toHaveLength(3);
	});

	it("trims leading and trailing whitespace before searching", () => {
		const result = buildCollectionSearchConditions("  bague  ");
		// The trimmed term must be used in every branch, not the raw padded string.
		expect(result?.OR).toContainEqual({
			name: { contains: "bague", mode: "insensitive" },
		});
		expect(result?.OR).toContainEqual({
			slug: { contains: "bague", mode: "insensitive" },
		});
		expect(result?.OR).toContainEqual({
			description: { contains: "bague", mode: "insensitive" },
		});
	});

	it("preserves internal whitespace within the search term", () => {
		const result = buildCollectionSearchConditions("  bijoux argent  ");
		expect(result?.OR).toContainEqual({
			name: { contains: "bijoux argent", mode: "insensitive" },
		});
	});
});

// ---------------------------------------------------------------------------
// buildCollectionFilterConditions
// ---------------------------------------------------------------------------

describe("buildCollectionFilterConditions", () => {
	it("returns an empty object when no filters are provided", () => {
		expect(buildCollectionFilterConditions({} as CollectionFilters)).toEqual({});
	});

	it("filters products using 'some' when hasProducts is true", () => {
		const result = buildCollectionFilterConditions({ hasProducts: true });
		expect(result.products).toEqual({
			some: { product: { status: "PUBLIC", deletedAt: null } },
		});
	});

	it("filters products using 'none' when hasProducts is false", () => {
		const result = buildCollectionFilterConditions({ hasProducts: false });
		expect(result.products).toEqual({
			none: { product: { status: "PUBLIC", deletedAt: null } },
		});
	});

	it("does not set a products condition when hasProducts is undefined", () => {
		const result = buildCollectionFilterConditions({ hasProducts: undefined });
		expect(result).not.toHaveProperty("products");
	});

	it("applies a single status value directly", () => {
		const result = buildCollectionFilterConditions({ status: "PUBLIC" } as CollectionFilters);
		expect(result.status).toBe("PUBLIC");
	});

	it("applies an array of status values using 'in'", () => {
		const result = buildCollectionFilterConditions({
			status: ["PUBLIC", "DRAFT"],
		} as CollectionFilters);
		expect(result.status).toEqual({ in: ["PUBLIC", "DRAFT"] });
	});

	it("does not set a status condition when status is undefined", () => {
		const result = buildCollectionFilterConditions({ status: undefined } as CollectionFilters);
		expect(result).not.toHaveProperty("status");
	});

	it("combines hasProducts and status conditions independently", () => {
		const result = buildCollectionFilterConditions({
			hasProducts: true,
			status: ["PUBLIC", "ARCHIVED"],
		} as CollectionFilters);
		expect(result.products).toEqual({
			some: { product: { status: "PUBLIC", deletedAt: null } },
		});
		expect(result.status).toEqual({ in: ["PUBLIC", "ARCHIVED"] });
	});

	it("handles a single-element status array correctly", () => {
		const result = buildCollectionFilterConditions({
			status: ["DRAFT"],
		} as CollectionFilters);
		expect(result.status).toEqual({ in: ["DRAFT"] });
	});
});

// ---------------------------------------------------------------------------
// buildCollectionWhereClause
// ---------------------------------------------------------------------------

describe("buildCollectionWhereClause", () => {
	it("returns an empty object when no search and no filters are provided", () => {
		expect(buildCollectionWhereClause({} as GetCollectionsParams)).toEqual({});
	});

	it("returns the filter condition directly (no AND) when only filters are provided", () => {
		const result = buildCollectionWhereClause({
			filters: { hasProducts: true },
		} as GetCollectionsParams);
		// Single condition: should be returned unwrapped, not inside AND.
		expect(result).toEqual({
			products: { some: { product: { status: "PUBLIC", deletedAt: null } } },
		});
		expect(result).not.toHaveProperty("AND");
	});

	it("returns the search condition directly (no AND) when only search is provided", () => {
		const result = buildCollectionWhereClause({ search: "bague" } as GetCollectionsParams);
		expect(result).toHaveProperty("OR");
		expect(result).not.toHaveProperty("AND");
	});

	it("wraps both conditions in AND when search and filters are provided", () => {
		const result = buildCollectionWhereClause({
			search: "bague",
			filters: { hasProducts: true },
		} as GetCollectionsParams);
		expect(result).toHaveProperty("AND");
		const andArray = (result as { AND: unknown[] }).AND;
		expect(andArray).toHaveLength(2);
	});

	it("places the filter condition first inside AND", () => {
		const result = buildCollectionWhereClause({
			search: "argent",
			filters: { status: "DRAFT" },
		} as GetCollectionsParams);
		const andArray = (result as { AND: unknown[] }).AND;
		// The first element is the filter object.
		expect(andArray[0]).toEqual({ status: "DRAFT" });
	});

	it("places the search condition second inside AND", () => {
		const result = buildCollectionWhereClause({
			search: "argent",
			filters: { status: "DRAFT" },
		} as GetCollectionsParams);
		const andArray = (result as { AND: unknown[] }).AND;
		// The second element is the search OR object.
		expect(andArray[1]).toHaveProperty("OR");
	});

	it("ignores a search string that is only whitespace", () => {
		const result = buildCollectionWhereClause({
			search: "   ",
			filters: { hasProducts: false },
		} as GetCollectionsParams);
		// Single condition - returned without AND wrapper.
		expect(result).not.toHaveProperty("AND");
		expect(result).toEqual({
			products: { none: { product: { status: "PUBLIC", deletedAt: null } } },
		});
	});

	it("returns an empty object when search is whitespace and filters is undefined", () => {
		expect(buildCollectionWhereClause({ search: "   " } as GetCollectionsParams)).toEqual({});
	});

	it("handles empty filters object alongside a search term", () => {
		const result = buildCollectionWhereClause({
			search: "collier",
			filters: {},
		} as GetCollectionsParams);
		const andArray = (result as { AND: unknown[] }).AND;
		expect(andArray).toHaveLength(2);
		// First condition is the empty filter object.
		expect(andArray[0]).toEqual({});
		// Second condition is the search object.
		expect(andArray[1]).toHaveProperty("OR");
	});
});
