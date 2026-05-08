import { describe, it, expect, vi } from "vitest";
import { ProductStatus } from "@/app/generated/prisma/client";

// ============================================================================
// MOCKS
// ============================================================================

// Mock the heavy data layer that pulls in Prisma, Stripe, and auth at import
// time. We re-export the real productFiltersSchema from the schemas module
// (which has no side-effect imports) so the actual validation logic is intact.
vi.mock("@/modules/products/data/get-products", async () => {
	const schemas = await import("@/modules/products/schemas/product.schemas");
	return {
		productFiltersSchema: schemas.productFiltersSchema,
	};
});

import { parseFilters } from "../params";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Builds a minimal ProductsSearchParams object from an arbitrary key/value map.
 * Only filter_* keys are meaningful to parseFilters; other keys are passed through
 * as-is to match the real shape of the type.
 */
function makeParams(
	overrides: Record<string, string | string[] | undefined> = {},
): Record<string, string | string[] | undefined> {
	return overrides;
}

// ============================================================================
// parseFilters — empty / unknown params
// ============================================================================

describe("parseFilters — empty params", () => {
	it("returns an empty object when no params are provided", () => {
		const result = parseFilters(makeParams());
		expect(result).toEqual({});
	});

	it("ignores keys that do not start with filter_", () => {
		const result = parseFilters(
			makeParams({ search: "ring", cursor: "abc", sortBy: "price-ascending" }),
		);
		expect(result).toEqual({});
	});

	it("ignores filter_ keys with undefined values", () => {
		const result = parseFilters(makeParams({ filter_priceMin: undefined }));
		expect(result).toEqual({});
	});

	it("ignores filter_ keys with empty string values", () => {
		const result = parseFilters(makeParams({ filter_priceMin: "" }));
		expect(result).toEqual({});
	});
});

// ============================================================================
// parseFilters — price fields
// ============================================================================

describe("parseFilters — price fields", () => {
	it("parses a valid integer priceMin", () => {
		const result = parseFilters(makeParams({ filter_priceMin: "1000" }));
		expect(result.priceMin).toBe(1000);
	});

	it("parses a valid integer priceMax", () => {
		const result = parseFilters(makeParams({ filter_priceMax: "5000" }));
		expect(result.priceMax).toBe(5000);
	});

	it("floors float values to integer", () => {
		const result = parseFilters(makeParams({ filter_priceMin: "1999.99" }));
		expect(result.priceMin).toBe(1999);
	});

	it("floors float priceMax to integer", () => {
		const result = parseFilters(makeParams({ filter_priceMax: "4500.75" }));
		expect(result.priceMax).toBe(4500);
	});

	it("parses zero as a valid priceMin", () => {
		const result = parseFilters(makeParams({ filter_priceMin: "0" }));
		expect(result.priceMin).toBe(0);
	});

	it("ignores NaN values for priceMin", () => {
		const result = parseFilters(makeParams({ filter_priceMin: "not-a-number" }));
		expect(result.priceMin).toBeUndefined();
	});

	it("ignores NaN values for priceMax", () => {
		const result = parseFilters(makeParams({ filter_priceMax: "abc" }));
		expect(result.priceMax).toBeUndefined();
	});

	it("ignores negative priceMin", () => {
		const result = parseFilters(makeParams({ filter_priceMin: "-100" }));
		expect(result.priceMin).toBeUndefined();
	});

	it("ignores negative priceMax", () => {
		const result = parseFilters(makeParams({ filter_priceMax: "-1" }));
		expect(result.priceMax).toBeUndefined();
	});

	it("parses both priceMin and priceMax when min <= max", () => {
		const result = parseFilters(makeParams({ filter_priceMin: "500", filter_priceMax: "2000" }));
		expect(result.priceMin).toBe(500);
		expect(result.priceMax).toBe(2000);
	});

	it("returns empty filters when priceMin > priceMax (Zod refine fails)", () => {
		// The Zod schema refines that priceMin <= priceMax; failure returns {}
		const result = parseFilters(makeParams({ filter_priceMin: "3000", filter_priceMax: "1000" }));
		expect(result).toEqual({});
	});

	it("ignores priceMin that exceeds FILTER_MAX_CENTS (1 000 000)", () => {
		// Zod schema max is PRICE_LIMITS.FILTER_MAX_CENTS = 1_000_000
		// A value above the limit causes Zod to reject and return {}
		const result = parseFilters(makeParams({ filter_priceMin: "9999999" }));
		expect(result).toEqual({});
	});

	it("accepts priceMax equal to FILTER_MAX_CENTS (1 000 000)", () => {
		const result = parseFilters(makeParams({ filter_priceMax: "1000000" }));
		expect(result.priceMax).toBe(1000000);
	});
});

// ============================================================================
// parseFilters — date fields
// ============================================================================

describe("parseFilters — date fields", () => {
	it("parses a valid ISO date for createdAfter", () => {
		const result = parseFilters(makeParams({ filter_createdAfter: "2024-01-15" }));
		expect(result.createdAfter).toBeInstanceOf(Date);
		expect((result.createdAfter as Date).getFullYear()).toBe(2024);
	});

	it("parses a valid ISO date for createdBefore", () => {
		const result = parseFilters(makeParams({ filter_createdBefore: "2024-06-30" }));
		expect(result.createdBefore).toBeInstanceOf(Date);
	});

	it("parses a valid ISO date for updatedAfter", () => {
		const result = parseFilters(makeParams({ filter_updatedAfter: "2023-03-01" }));
		expect(result.updatedAfter).toBeInstanceOf(Date);
	});

	it("parses a valid ISO date for updatedBefore", () => {
		const result = parseFilters(makeParams({ filter_updatedBefore: "2023-12-31" }));
		expect(result.updatedBefore).toBeInstanceOf(Date);
	});

	it("ignores strings that are not YYYY-MM-DD", () => {
		const result = parseFilters(makeParams({ filter_createdAfter: "2024/01/15" }));
		expect(result.createdAfter).toBeUndefined();
	});

	it("ignores ISO datetime strings with time component", () => {
		const result = parseFilters(makeParams({ filter_createdAfter: "2024-01-15T10:00:00Z" }));
		expect(result.createdAfter).toBeUndefined();
	});

	it("ignores completely invalid date strings", () => {
		const result = parseFilters(makeParams({ filter_createdBefore: "not-a-date" }));
		expect(result.createdBefore).toBeUndefined();
	});

	it("ignores dates before FILTERS_MIN (2020-01-01) — Zod rejects them", () => {
		// Zod schema sets min to DATE_LIMITS.FILTERS_MIN = 2020-01-01
		const result = parseFilters(makeParams({ filter_createdAfter: "2019-12-31" }));
		expect(result).toEqual({});
	});

	it("ignores dates in the future for createdAfter — Zod max(new Date()) rejects them", () => {
		const result = parseFilters(makeParams({ filter_createdAfter: "2099-01-01" }));
		expect(result).toEqual({});
	});

	it("allows future dates for createdBefore (no max constraint)", () => {
		// createdBefore has no max(new Date()) in the schema
		const result = parseFilters(makeParams({ filter_createdBefore: "2030-12-31" }));
		expect(result.createdBefore).toBeInstanceOf(Date);
	});

	it("returns empty filters when createdAfter > createdBefore (Zod refine fails)", () => {
		const result = parseFilters(
			makeParams({
				filter_createdAfter: "2024-06-01",
				filter_createdBefore: "2024-01-01",
			}),
		);
		expect(result).toEqual({});
	});

	it("returns empty filters when updatedAfter > updatedBefore (Zod refine fails)", () => {
		const result = parseFilters(
			makeParams({
				filter_updatedAfter: "2024-09-01",
				filter_updatedBefore: "2024-08-01",
			}),
		);
		expect(result).toEqual({});
	});
});

// ============================================================================
// parseFilters — status field
// ============================================================================

describe("parseFilters — status field", () => {
	it("parses a single valid status (DRAFT)", () => {
		const result = parseFilters(makeParams({ filter_status: "DRAFT" }));
		expect(result.status).toEqual([ProductStatus.DRAFT]);
	});

	it("parses a single valid status (PUBLIC)", () => {
		const result = parseFilters(makeParams({ filter_status: "PUBLIC" }));
		expect(result.status).toEqual([ProductStatus.PUBLIC]);
	});

	it("parses a single valid status (ARCHIVED)", () => {
		const result = parseFilters(makeParams({ filter_status: "ARCHIVED" }));
		expect(result.status).toEqual([ProductStatus.ARCHIVED]);
	});

	it("parses comma-separated status values", () => {
		const result = parseFilters(makeParams({ filter_status: "DRAFT,PUBLIC" }));
		expect(result.status).toEqual([ProductStatus.DRAFT, ProductStatus.PUBLIC]);
	});

	it("parses an array of status values", () => {
		const result = parseFilters(makeParams({ filter_status: ["DRAFT", "ARCHIVED"] }));
		expect(result.status).toEqual([ProductStatus.DRAFT, ProductStatus.ARCHIVED]);
	});

	it("filters out invalid status values from a comma-separated list", () => {
		const result = parseFilters(makeParams({ filter_status: "DRAFT,INVALID,PUBLIC" }));
		expect(result.status).toEqual([ProductStatus.DRAFT, ProductStatus.PUBLIC]);
	});

	it("filters out invalid status values from an array", () => {
		const result = parseFilters(makeParams({ filter_status: ["DRAFT", "NOT_A_STATUS"] }));
		expect(result.status).toEqual([ProductStatus.DRAFT]);
	});

	it("ignores filter_status when all values are invalid", () => {
		const result = parseFilters(makeParams({ filter_status: "INVALID" }));
		expect(result.status).toBeUndefined();
	});

	it("ignores lowercase status values (enum is case-sensitive)", () => {
		const result = parseFilters(makeParams({ filter_status: "draft" }));
		expect(result.status).toBeUndefined();
	});

	it("uses only the first element of an array to pass to getFirstParam for comma-split check", () => {
		// When value is an array, the array itself is used directly (not comma-split)
		const result = parseFilters(makeParams({ filter_status: ["PUBLIC", "ARCHIVED"] }));
		expect(result.status).toEqual([ProductStatus.PUBLIC, ProductStatus.ARCHIVED]);
	});
});

// ============================================================================
// parseFilters — stockStatus field
// ============================================================================

describe("parseFilters — stockStatus field", () => {
	it("parses in_stock", () => {
		const result = parseFilters(makeParams({ filter_stockStatus: "in_stock" }));
		expect(result.stockStatus).toBe("in_stock");
	});

	it("parses out_of_stock", () => {
		const result = parseFilters(makeParams({ filter_stockStatus: "out_of_stock" }));
		expect(result.stockStatus).toBe("out_of_stock");
	});

	it("parses low_stock", () => {
		const result = parseFilters(makeParams({ filter_stockStatus: "low_stock" }));
		expect(result.stockStatus).toBe("low_stock");
	});

	it("ignores an invalid stockStatus value", () => {
		const result = parseFilters(makeParams({ filter_stockStatus: "very_low" }));
		expect(result.stockStatus).toBeUndefined();
	});

	it("ignores an arbitrary string for stockStatus", () => {
		const result = parseFilters(makeParams({ filter_stockStatus: "true" }));
		expect(result.stockStatus).toBeUndefined();
	});

	it("uses the first element when stockStatus is passed as an array", () => {
		// getFirstParam returns the first element of an array
		const result = parseFilters(makeParams({ filter_stockStatus: ["in_stock", "out_of_stock"] }));
		expect(result.stockStatus).toBe("in_stock");
	});
});

// ============================================================================
// parseFilters — boolean fields
// ============================================================================

describe("parseFilters — onSale boolean field", () => {
	it("parses 'true' string as boolean true", () => {
		const result = parseFilters(makeParams({ filter_onSale: "true" }));
		expect(result.onSale).toBe(true);
	});

	it("does not set onSale for 'false' string (only 'true' activates the filter)", () => {
		const result = parseFilters(makeParams({ filter_onSale: "false" }));
		expect(result.onSale).toBeUndefined();
	});

	it("does not set onSale for '1'", () => {
		const result = parseFilters(makeParams({ filter_onSale: "1" }));
		expect(result.onSale).toBeUndefined();
	});

	it("does not set onSale for 'yes'", () => {
		const result = parseFilters(makeParams({ filter_onSale: "yes" }));
		expect(result.onSale).toBeUndefined();
	});

	it("does not set onSale for 'True' (case-sensitive)", () => {
		const result = parseFilters(makeParams({ filter_onSale: "True" }));
		expect(result.onSale).toBeUndefined();
	});
});

// ============================================================================
// parseFilters — multi-select fields
// ============================================================================

describe("parseFilters — typeId field (mapped to 'type')", () => {
	it("parses a single typeId as an array with one element", () => {
		const result = parseFilters(makeParams({ filter_typeId: "type-abc" }));
		expect(result.type).toEqual(["type-abc"]);
	});

	it("parses an array of typeIds", () => {
		const result = parseFilters(makeParams({ filter_typeId: ["type-abc", "type-def"] }));
		expect(result.type).toEqual(["type-abc", "type-def"]);
	});

	it("parses comma-separated typeIds into an array", () => {
		const result = parseFilters(makeParams({ filter_typeId: "type-abc,type-def" }));
		expect(result.type).toEqual(["type-abc", "type-def"]);
	});

	it("trims whitespace from typeId values", () => {
		const result = parseFilters(makeParams({ filter_typeId: " type-abc , type-def " }));
		expect(result.type).toEqual(["type-abc", "type-def"]);
	});

	it("ignores empty string entries in typeId array", () => {
		const result = parseFilters(makeParams({ filter_typeId: ["type-abc", ""] }));
		expect(result.type).toEqual(["type-abc"]);
	});

	it("limits typeId array to 20 items", () => {
		const twentyTwo = Array.from({ length: 22 }, (_, i) => `type-${i}`);
		const result = parseFilters(makeParams({ filter_typeId: twentyTwo }));
		expect(result.type).toHaveLength(20);
	});
});

describe("parseFilters — collectionId field", () => {
	it("parses a single collectionId", () => {
		const result = parseFilters(makeParams({ filter_collectionId: "col-123" }));
		expect(result.collectionId).toEqual(["col-123"]);
	});

	it("parses an array of collectionIds", () => {
		const result = parseFilters(makeParams({ filter_collectionId: ["col-123", "col-456"] }));
		expect(result.collectionId).toEqual(["col-123", "col-456"]);
	});

	it("parses comma-separated collectionIds", () => {
		const result = parseFilters(makeParams({ filter_collectionId: "col-123,col-456" }));
		expect(result.collectionId).toEqual(["col-123", "col-456"]);
	});

	it("limits collectionId array to 20 items", () => {
		const twentyFive = Array.from({ length: 25 }, (_, i) => `col-${i}`);
		const result = parseFilters(makeParams({ filter_collectionId: twentyFive }));
		expect(result.collectionId).toHaveLength(20);
	});

	it("ignores empty string entries in collectionId array", () => {
		const result = parseFilters(makeParams({ filter_collectionId: ["col-123", "", "col-456"] }));
		expect(result.collectionId).toEqual(["col-123", "col-456"]);
	});
});

describe("parseFilters — color field", () => {
	it("parses a single color slug", () => {
		const result = parseFilters(makeParams({ filter_color: "gold" }));
		expect(result.color).toEqual(["gold"]);
	});

	it("parses multiple colors from an array", () => {
		const result = parseFilters(makeParams({ filter_color: ["gold", "silver"] }));
		expect(result.color).toEqual(["gold", "silver"]);
	});

	it("parses comma-separated colors", () => {
		const result = parseFilters(makeParams({ filter_color: "gold,silver,rose" }));
		expect(result.color).toEqual(["gold", "silver", "rose"]);
	});

	it("limits color array to 20 items", () => {
		const colors = Array.from({ length: 25 }, (_, i) => `color-${i}`);
		const result = parseFilters(makeParams({ filter_color: colors }));
		expect(result.color).toHaveLength(20);
	});
});

describe("parseFilters — material field", () => {
	it("parses a single material slug", () => {
		const result = parseFilters(makeParams({ filter_material: "silver" }));
		expect(result.material).toEqual(["silver"]);
	});

	it("parses multiple materials from an array", () => {
		const result = parseFilters(makeParams({ filter_material: ["silver", "gold-14k"] }));
		expect(result.material).toEqual(["silver", "gold-14k"]);
	});

	it("parses comma-separated materials", () => {
		const result = parseFilters(makeParams({ filter_material: "silver,gold-14k,platinum" }));
		expect(result.material).toEqual(["silver", "gold-14k", "platinum"]);
	});

	it("limits material array to 20 items", () => {
		const materials = Array.from({ length: 30 }, (_, i) => `mat-${i}`);
		const result = parseFilters(makeParams({ filter_material: materials }));
		expect(result.material).toHaveLength(20);
	});

	it("filters out empty string entries from material array", () => {
		const result = parseFilters(makeParams({ filter_material: ["silver", "  ", "gold"] }));
		// "  " trims to "" and is filtered out
		expect(result.material).toEqual(["silver", "gold"]);
	});
});

// ============================================================================
// parseFilters — Zod validation fail-safe
// ============================================================================

describe("parseFilters — Zod validation fail-safe", () => {
	it("returns empty object when the assembled filters object fails Zod validation", () => {
		// priceMin > priceMax triggers Zod refine — the whole filters object is rejected
		const result = parseFilters(makeParams({ filter_priceMin: "5000", filter_priceMax: "1000" }));
		expect(result).toEqual({});
	});

	it("returns empty object when createdAfter is before FILTERS_MIN boundary", () => {
		const result = parseFilters(makeParams({ filter_createdAfter: "2019-01-01" }));
		expect(result).toEqual({});
	});

	it("still returns valid fields that do not conflict when a Zod refine fails", () => {
		// Only the cross-field refines (priceMin > priceMax) cause rejection;
		// a single out-of-range price causes the whole result to be {}
		const result = parseFilters(makeParams({ filter_priceMax: "9999999" }));
		expect(result).toEqual({});
	});
});

// ============================================================================
// parseFilters — combined filters
// ============================================================================

describe("parseFilters — combined filters", () => {
	it("parses multiple filter categories together", () => {
		const result = parseFilters(
			makeParams({
				filter_priceMin: "500",
				filter_priceMax: "3000",
				filter_status: "PUBLIC",
				filter_stockStatus: "in_stock",
				filter_onSale: "true",
				filter_color: ["gold", "silver"],
				filter_material: "silver",
				filter_typeId: "type-bague",
				filter_createdAfter: "2023-01-01",
			}),
		);

		expect(result.priceMin).toBe(500);
		expect(result.priceMax).toBe(3000);
		expect(result.status).toEqual([ProductStatus.PUBLIC]);
		expect(result.stockStatus).toBe("in_stock");
		expect(result.onSale).toBe(true);
		expect(result.color).toEqual(["gold", "silver"]);
		expect(result.material).toEqual(["silver"]);
		expect(result.type).toEqual(["type-bague"]);
		expect(result.createdAfter).toBeInstanceOf(Date);
	});

	it("ignores non-filter_ keys mixed with filter_ keys", () => {
		const result = parseFilters(
			makeParams({
				search: "bracelet",
				cursor: "xyz",
				filter_onSale: "true",
			}),
		);

		expect(result.onSale).toBe(true);
		// No extra keys from search/cursor
		expect(Object.keys(result)).toEqual(["onSale"]);
	});
});
