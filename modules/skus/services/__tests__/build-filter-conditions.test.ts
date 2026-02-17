import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: { QueryMode: { insensitive: "insensitive" } },
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	STOCK_THRESHOLDS: { CRITICAL: 1, LOW: 3, NORMAL_MAX: 50 },
}));

import type { ProductSkuFilters } from "../../schemas/sku-filters-schema";
import { buildFilterConditions } from "../build-filter-conditions";

describe("buildFilterConditions", () => {
	it("should return empty array when filters is empty", () => {
		const result = buildFilterConditions({} as ProductSkuFilters);

		expect(result).toEqual([]);
	});

	// ========================================================================
	// Simple filters
	// ========================================================================

	it("should filter by single productId", () => {
		const result = buildFilterConditions({ productId: "p1" } as ProductSkuFilters);

		expect(result).toContainEqual({ productId: "p1" });
	});

	it("should filter by multiple productIds", () => {
		const result = buildFilterConditions({ productId: ["p1", "p2"] } as ProductSkuFilters);

		expect(result).toContainEqual({ productId: { in: ["p1", "p2"] } });
	});

	it("should filter by single colorId", () => {
		const result = buildFilterConditions({ colorId: "c1" } as ProductSkuFilters);

		expect(result).toContainEqual({ colorId: "c1" });
	});

	it("should filter by isActive true", () => {
		const result = buildFilterConditions({ isActive: true } as ProductSkuFilters);

		expect(result).toContainEqual({ isActive: true });
	});

	it("should filter by isActive false", () => {
		const result = buildFilterConditions({ isActive: false } as ProductSkuFilters);

		expect(result).toContainEqual({ isActive: false });
	});

	it("should filter by isDefault", () => {
		const result = buildFilterConditions({ isDefault: true } as ProductSkuFilters);

		expect(result).toContainEqual({ isDefault: true });
	});

	// ========================================================================
	// Price range filters
	// ========================================================================

	it("should filter by priceMin", () => {
		const result = buildFilterConditions({ priceMin: 1000 } as ProductSkuFilters);

		expect(result).toContainEqual({ priceInclTax: { gte: 1000 } });
	});

	it("should filter by priceMax", () => {
		const result = buildFilterConditions({ priceMax: 5000 } as ProductSkuFilters);

		expect(result).toContainEqual({ priceInclTax: { lte: 5000 } });
	});

	// ========================================================================
	// Inventory range filters
	// ========================================================================

	it("should filter by inventoryMin", () => {
		const result = buildFilterConditions({ inventoryMin: 5 } as ProductSkuFilters);

		expect(result).toContainEqual({ inventory: { gte: 5 } });
	});

	it("should filter by inventoryMax", () => {
		const result = buildFilterConditions({ inventoryMax: 50 } as ProductSkuFilters);

		expect(result).toContainEqual({ inventory: { lte: 50 } });
	});

	// ========================================================================
	// Date filters
	// ========================================================================

	it("should filter by createdAfter", () => {
		const date = new Date("2024-01-01");
		const result = buildFilterConditions({ createdAfter: date } as ProductSkuFilters);

		expect(result).toContainEqual({ createdAt: { gte: date } });
	});

	it("should filter by createdBefore", () => {
		const date = new Date("2024-12-31");
		const result = buildFilterConditions({ createdBefore: date } as ProductSkuFilters);

		expect(result).toContainEqual({ createdAt: { lte: date } });
	});

	// ========================================================================
	// Stock status composite filter
	// ========================================================================

	it("should handle stockStatus: in_stock", () => {
		const result = buildFilterConditions({ stockStatus: "in_stock" } as ProductSkuFilters);

		expect(result).toContainEqual({ inventory: { gte: 3 } });
	});

	it("should handle stockStatus: low_stock", () => {
		const result = buildFilterConditions({ stockStatus: "low_stock" } as ProductSkuFilters);

		expect(result).toContainEqual({
			AND: [
				{ inventory: { gte: 1 } },
				{ inventory: { lt: 3 } },
			],
		});
	});

	it("should handle stockStatus: out_of_stock", () => {
		const result = buildFilterConditions({ stockStatus: "out_of_stock" } as ProductSkuFilters);

		expect(result).toContainEqual({ inventory: { lte: 0 } });
	});

	it("should not add condition for stockStatus: all", () => {
		const result = buildFilterConditions({ stockStatus: "all" } as ProductSkuFilters);

		expect(result).toEqual([]);
	});

	// ========================================================================
	// Relational filters
	// ========================================================================

	it("should filter by hasImages true", () => {
		const result = buildFilterConditions({ hasImages: true } as ProductSkuFilters);

		expect(result).toContainEqual({ images: { some: {} } });
	});

	it("should filter by hasImages false", () => {
		const result = buildFilterConditions({ hasImages: false } as ProductSkuFilters);

		expect(result).toContainEqual({ images: { none: {} } });
	});

	it("should filter by hasOrders true", () => {
		const result = buildFilterConditions({ hasOrders: true } as ProductSkuFilters);

		expect(result).toContainEqual({ orderItems: { some: {} } });
	});

	it("should filter by hasOrders false", () => {
		const result = buildFilterConditions({ hasOrders: false } as ProductSkuFilters);

		expect(result).toContainEqual({ orderItems: { none: {} } });
	});

	// ========================================================================
	// Multiple filters combined
	// ========================================================================

	it("should combine multiple filter conditions", () => {
		const result = buildFilterConditions({
			productId: "p1",
			isActive: true,
			priceMin: 1000,
		} as ProductSkuFilters);

		expect(result).toHaveLength(3);
		expect(result).toContainEqual({ productId: "p1" });
		expect(result).toContainEqual({ isActive: true });
		expect(result).toContainEqual({ priceInclTax: { gte: 1000 } });
	});
});
