import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: {
		QueryMode: { insensitive: "insensitive" },
	},
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	STOCK_THRESHOLDS: { CRITICAL: 1, LOW: 3, NORMAL_MAX: 50 },
}));

import {
	buildInventorySearchConditions,
	buildInventoryFilterConditions,
	buildInventoryWhereClause,
} from "../inventory-query-builder.service";
import type { InventoryFilters } from "../../types/inventory.types";
import type { GetSkuStocksParams } from "../../types/inventory.types";

// ============================================================================
// HELPERS
// ============================================================================

function filters(overrides: Partial<InventoryFilters> = {}): InventoryFilters {
	return {
		productTypeId: undefined,
		colorId: undefined,
		material: undefined,
		stockLevel: undefined,
		...overrides,
	};
}

function params(overrides: Partial<GetSkuStocksParams> = {}): GetSkuStocksParams {
	return {
		direction: "forward",
		perPage: 20,
		sortBy: "created-descending",
		filters: filters(),
		...overrides,
	} as GetSkuStocksParams;
}

// ============================================================================
// buildInventorySearchConditions
// ============================================================================

describe("buildInventorySearchConditions", () => {
	it("should return empty object when no search provided", () => {
		const result = buildInventorySearchConditions();
		expect(result).toEqual({});
	});

	it("should return empty object for empty string", () => {
		const result = buildInventorySearchConditions("");
		expect(result).toEqual({});
	});

	it("should return empty object for whitespace-only string", () => {
		const result = buildInventorySearchConditions("   ");
		expect(result).toEqual({});
	});

	it("should return OR conditions for a search term", () => {
		const result = buildInventorySearchConditions("bague");
		expect(result.OR).toBeDefined();
		expect(result.OR).toHaveLength(2);
	});

	it("should include sku contains condition", () => {
		const result = buildInventorySearchConditions("SKU-001");
		expect(result.OR).toContainEqual({
			sku: { contains: "SKU-001", mode: "insensitive" },
		});
	});

	it("should include product title contains condition", () => {
		const result = buildInventorySearchConditions("bague or");
		expect(result.OR).toContainEqual({
			product: { title: { contains: "bague or", mode: "insensitive" } },
		});
	});

	it("should trim the search term", () => {
		const result = buildInventorySearchConditions("  bague  ");
		expect(result.OR).toContainEqual({
			sku: { contains: "bague", mode: "insensitive" },
		});
	});
});

// ============================================================================
// buildInventoryFilterConditions
// ============================================================================

describe("buildInventoryFilterConditions", () => {
	it("should return empty object when no filters applied", () => {
		const result = buildInventoryFilterConditions(filters());
		expect(result).toEqual({});
	});

	it("should filter by single productTypeId", () => {
		const result = buildInventoryFilterConditions(filters({ productTypeId: "type-1" }));
		expect(result.product).toEqual({ typeId: "type-1" });
	});

	it("should filter by multiple productTypeIds using in operator", () => {
		const result = buildInventoryFilterConditions(
			filters({ productTypeId: ["type-1", "type-2"] })
		);
		expect(result.product).toEqual({ typeId: { in: ["type-1", "type-2"] } });
	});

	it("should filter by single colorId", () => {
		const result = buildInventoryFilterConditions(filters({ colorId: "color-1" }));
		expect(result.colorId).toBe("color-1");
	});

	it("should filter by multiple colorIds using in operator", () => {
		const result = buildInventoryFilterConditions(
			filters({ colorId: ["color-1", "color-2"] })
		);
		expect(result.colorId).toEqual({ in: ["color-1", "color-2"] });
	});

	it("should filter by single material", () => {
		const result = buildInventoryFilterConditions(filters({ material: "Argent 925" }));
		expect(result.material).toEqual({ name: "Argent 925" });
	});

	it("should filter by multiple materials using in operator", () => {
		const result = buildInventoryFilterConditions(
			filters({ material: ["Argent 925", "Or 18k"] })
		);
		expect(result.material).toEqual({ name: { in: ["Argent 925", "Or 18k"] } });
	});

	it("should combine multiple filter conditions", () => {
		const result = buildInventoryFilterConditions(
			filters({ colorId: "color-1", material: "Argent 925" })
		);
		expect(result.colorId).toBe("color-1");
		expect(result.material).toEqual({ name: "Argent 925" });
	});
});

// ============================================================================
// buildInventoryWhereClause
// ============================================================================

describe("buildInventoryWhereClause", () => {
	it("should return empty object when no search or filters", () => {
		const result = buildInventoryWhereClause(params());
		expect(result).toEqual({});
	});

	it("should include search conditions when search is provided", () => {
		const result = buildInventoryWhereClause(params({ search: "bague" }));
		expect(result.OR).toBeDefined();
		expect(result.OR).toHaveLength(2);
	});

	it("should include filter conditions when filters are set", () => {
		const result = buildInventoryWhereClause(
			params({ filters: filters({ colorId: "color-1" }) })
		);
		expect(result.colorId).toBe("color-1");
	});

	it("should apply stock level critical filter with AND clause", () => {
		const result = buildInventoryWhereClause(
			params({ filters: filters({ stockLevel: "critical" }) })
		);
		expect(result.AND).toBeDefined();
		const andArr = result.AND as unknown[];
		expect(andArr).toContainEqual({ inventory: { lt: 1 } });
	});

	it("should apply stock level low filter", () => {
		const result = buildInventoryWhereClause(
			params({ filters: filters({ stockLevel: "low" }) })
		);
		const andArr = result.AND as unknown[];
		expect(andArr).toContainEqual({ inventory: { lt: 3 } });
	});

	it("should apply stock level normal filter with gte and lte", () => {
		const result = buildInventoryWhereClause(
			params({ filters: filters({ stockLevel: "normal" }) })
		);
		const andArr = result.AND as unknown[];
		expect(andArr).toContainEqual({ inventory: { gte: 3, lte: 50 } });
	});

	it("should apply stock level high filter", () => {
		const result = buildInventoryWhereClause(
			params({ filters: filters({ stockLevel: "high" }) })
		);
		const andArr = result.AND as unknown[];
		expect(andArr).toContainEqual({ inventory: { gt: 50 } });
	});

	it("should combine search, filters, and stock level", () => {
		const result = buildInventoryWhereClause(
			params({
				search: "bague",
				filters: filters({ colorId: "color-1", stockLevel: "low" }),
			})
		);
		// With stockLevel, AND wraps baseConditions + stockLevel condition
		expect(result.AND).toBeDefined();
	});
});
