import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: { QueryMode: { insensitive: "insensitive" } },
}));

vi.mock("@/shared/constants/pagination", () => ({
	cursorSchema: { optional: () => ({}) },
	directionSchema: { default: () => ({}) },
}));

vi.mock("@/shared/utils/pagination", () => ({
	createPerPageSchema: () => ({ default: () => ({}) }),
}));

vi.mock("@/shared/schemas/filters.schema", () => ({
	optionalStringOrStringArraySchema: {},
}));

vi.mock("../../constants/order-items.constants", () => ({
	GET_ORDER_ITEMS_DEFAULT_PER_PAGE: 20,
	GET_ORDER_ITEMS_MAX_RESULTS_PER_PAGE: 100,
	GET_ORDER_ITEMS_DEFAULT_SORT_BY: "created-descending",
	GET_ORDER_ITEMS_DEFAULT_SORT_ORDER: "desc",
	GET_ORDER_ITEMS_SORT_FIELDS: ["created-descending", "created-ascending"],
}));

import {
	buildOrderItemsFilterConditions,
	buildOrderItemsWhereClause,
} from "../order-items-query-builder";

describe("buildOrderItemsFilterConditions", () => {
	it("should return empty array when no filters provided", () => {
		const result = buildOrderItemsFilterConditions({} as never);

		expect(result).toEqual([]);
	});

	it("should filter by single orderId", () => {
		const result = buildOrderItemsFilterConditions({ orderId: "order_1" } as never);

		expect(result).toContainEqual({ orderId: "order_1" });
	});

	it("should filter by multiple orderIds using 'in'", () => {
		const result = buildOrderItemsFilterConditions({
			orderId: ["order_1", "order_2"],
		} as never);

		expect(result).toContainEqual({ orderId: { in: ["order_1", "order_2"] } });
	});

	it("should filter by single productId", () => {
		const result = buildOrderItemsFilterConditions({ productId: "prod_1" } as never);

		expect(result).toContainEqual({ productId: "prod_1" });
	});

	it("should filter by multiple productIds", () => {
		const result = buildOrderItemsFilterConditions({
			productId: ["prod_1", "prod_2"],
		} as never);

		expect(result).toContainEqual({ productId: { in: ["prod_1", "prod_2"] } });
	});

	it("should filter by single skuId", () => {
		const result = buildOrderItemsFilterConditions({ skuId: "sku_1" } as never);

		expect(result).toContainEqual({ skuId: "sku_1" });
	});

	it("should filter by multiple skuIds", () => {
		const result = buildOrderItemsFilterConditions({
			skuId: ["sku_1", "sku_2"],
		} as never);

		expect(result).toContainEqual({ skuId: { in: ["sku_1", "sku_2"] } });
	});

	it("should filter by priceMin", () => {
		const result = buildOrderItemsFilterConditions({ priceMin: 1000 } as never);

		expect(result).toContainEqual({ price: { gte: 1000 } });
	});

	it("should filter by priceMax", () => {
		const result = buildOrderItemsFilterConditions({ priceMax: 5000 } as never);

		expect(result).toContainEqual({ price: { lte: 5000 } });
	});

	it("should filter by quantityMin and quantityMax", () => {
		const result = buildOrderItemsFilterConditions({
			quantityMin: 2,
			quantityMax: 10,
		} as never);

		expect(result).toContainEqual({ quantity: { gte: 2 } });
		expect(result).toContainEqual({ quantity: { lte: 10 } });
	});

	it("should filter by date ranges", () => {
		const after = new Date("2026-01-01");
		const before = new Date("2026-06-01");

		const result = buildOrderItemsFilterConditions({
			createdAfter: after,
			createdBefore: before,
		} as never);

		expect(result).toContainEqual({ createdAt: { gte: after } });
		expect(result).toContainEqual({ createdAt: { lte: before } });
	});

	it("should filter by updated date ranges", () => {
		const after = new Date("2026-02-01");
		const before = new Date("2026-03-01");

		const result = buildOrderItemsFilterConditions({
			updatedAfter: after,
			updatedBefore: before,
		} as never);

		expect(result).toContainEqual({ updatedAt: { gte: after } });
		expect(result).toContainEqual({ updatedAt: { lte: before } });
	});

	it("should combine multiple filters", () => {
		const result = buildOrderItemsFilterConditions({
			orderId: "order_1",
			priceMin: 1000,
			quantityMax: 5,
		} as never);

		expect(result).toHaveLength(3);
	});
});

describe("buildOrderItemsWhereClause", () => {
	it("should return empty object with no filters", () => {
		const result = buildOrderItemsWhereClause({} as never);

		expect(result).toEqual({});
	});

	it("should wrap filters in AND when present", () => {
		const result = buildOrderItemsWhereClause({
			filters: { orderId: "order_1", priceMin: 500 },
		} as never);

		expect(result.AND).toBeDefined();
		expect(result.AND).toHaveLength(2);
	});

	it("should not include AND when filters are empty", () => {
		const result = buildOrderItemsWhereClause({ filters: {} } as never);

		expect(result.AND).toBeUndefined();
	});
});
