import { describe, it, expect } from "vitest";
import {
	orderItemFiltersSchema,
	orderItemSortBySchema,
	getOrderItemsSchema,
} from "@/modules/orders/schemas/order-items.schemas";
import {
	GET_ORDER_ITEMS_DEFAULT_PER_PAGE,
	GET_ORDER_ITEMS_DEFAULT_SORT_BY,
	GET_ORDER_ITEMS_DEFAULT_SORT_ORDER,
	GET_ORDER_ITEMS_MAX_RESULTS_PER_PAGE,
	GET_ORDER_ITEMS_SORT_FIELDS,
} from "@/modules/orders/constants/order-items.constants";

// ============================================================================
// orderItemFiltersSchema
// ============================================================================

describe("orderItemFiltersSchema", () => {
	it("should accept an empty object (all fields optional)", () => {
		const result = orderItemFiltersSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it("should accept orderId, productId, skuId as strings", () => {
		const result = orderItemFiltersSchema.safeParse({
			orderId: "order-1",
			productId: "product-1",
			skuId: "sku-1",
		});
		expect(result.success).toBe(true);
	});

	it("should accept orderId, productId, skuId as arrays", () => {
		const result = orderItemFiltersSchema.safeParse({
			orderId: ["order-1", "order-2"],
			productId: ["prod-1"],
			skuId: ["sku-1", "sku-2"],
		});
		expect(result.success).toBe(true);
	});

	it("should accept priceMin at 0 (nonnegative boundary)", () => {
		const result = orderItemFiltersSchema.safeParse({ priceMin: 0 });
		expect(result.success).toBe(true);
	});

	it("should accept priceMax at boundary 10000000", () => {
		const result = orderItemFiltersSchema.safeParse({ priceMax: 10000000 });
		expect(result.success).toBe(true);
	});

	it("should reject priceMin below 0", () => {
		const result = orderItemFiltersSchema.safeParse({ priceMin: -1 });
		expect(result.success).toBe(false);
	});

	it("should reject priceMax above 10000000", () => {
		const result = orderItemFiltersSchema.safeParse({ priceMax: 10000001 });
		expect(result.success).toBe(false);
	});

	it("should reject a non-integer priceMin", () => {
		const result = orderItemFiltersSchema.safeParse({ priceMin: 100.5 });
		expect(result.success).toBe(false);
	});

	it("should accept quantityMin of 0 and quantityMax of 1000", () => {
		const result = orderItemFiltersSchema.safeParse({ quantityMin: 0, quantityMax: 1000 });
		expect(result.success).toBe(true);
	});

	it("should reject quantityMax above 1000", () => {
		const result = orderItemFiltersSchema.safeParse({ quantityMax: 1001 });
		expect(result.success).toBe(false);
	});

	it("should accept boolean filter fields hasTax, isTaxIncluded, hasCustomizations", () => {
		const result = orderItemFiltersSchema.safeParse({
			hasTax: true,
			isTaxIncluded: false,
			hasCustomizations: true,
		});
		expect(result.success).toBe(true);
	});

	it("should coerce a date string for createdAfter", () => {
		const result = orderItemFiltersSchema.safeParse({ createdAfter: "2022-03-10" });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.createdAfter).toBeInstanceOf(Date);
	});

	it("should reject createdAfter before 2020-01-01", () => {
		const result = orderItemFiltersSchema.safeParse({ createdAfter: "2019-12-31" });
		expect(result.success).toBe(false);
	});

	it("should reject a future date for createdAfter", () => {
		const future = new Date();
		future.setFullYear(future.getFullYear() + 1);
		const result = orderItemFiltersSchema.safeParse({ createdAfter: future.toISOString() });
		expect(result.success).toBe(false);
	});

	// Cross-field refinements

	it("should reject priceMin greater than priceMax", () => {
		const result = orderItemFiltersSchema.safeParse({ priceMin: 5000, priceMax: 1000 });
		expect(result.success).toBe(false);
	});

	it("should accept priceMin equal to priceMax", () => {
		const result = orderItemFiltersSchema.safeParse({ priceMin: 2000, priceMax: 2000 });
		expect(result.success).toBe(true);
	});

	it("should reject quantityMin greater than quantityMax", () => {
		const result = orderItemFiltersSchema.safeParse({ quantityMin: 5, quantityMax: 2 });
		expect(result.success).toBe(false);
	});

	it("should reject createdAfter greater than createdBefore", () => {
		const result = orderItemFiltersSchema.safeParse({
			createdAfter: "2023-08-01",
			createdBefore: "2023-06-01",
		});
		expect(result.success).toBe(false);
	});

	it("should accept createdAfter equal to createdBefore", () => {
		const result = orderItemFiltersSchema.safeParse({
			createdAfter: "2023-06-15",
			createdBefore: "2023-06-15",
		});
		expect(result.success).toBe(true);
	});

	it("should reject updatedAfter greater than updatedBefore", () => {
		const result = orderItemFiltersSchema.safeParse({
			updatedAfter: "2023-09-01",
			updatedBefore: "2023-07-01",
		});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// orderItemSortBySchema
// ============================================================================

describe("orderItemSortBySchema", () => {
	it("should accept each valid sort field", () => {
		for (const field of GET_ORDER_ITEMS_SORT_FIELDS) {
			const result = orderItemSortBySchema.safeParse(field);
			expect(result.success).toBe(true);
			if (result.success) expect(result.data).toBe(field);
		}
	});

	it("should fall back to default sort field for an unknown value", () => {
		const result = orderItemSortBySchema.safeParse("invalidField");
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toBe(GET_ORDER_ITEMS_DEFAULT_SORT_BY);
	});

	it("should fall back to default sort field for a non-string value", () => {
		const result = orderItemSortBySchema.safeParse(null);
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toBe(GET_ORDER_ITEMS_DEFAULT_SORT_BY);
	});
});

// ============================================================================
// getOrderItemsSchema
// ============================================================================

describe("getOrderItemsSchema", () => {
	it("should accept an empty object and apply all defaults", () => {
		const result = getOrderItemsSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.direction).toBe("forward");
			expect(result.data.perPage).toBe(GET_ORDER_ITEMS_DEFAULT_PER_PAGE);
			expect(result.data.sortBy).toBe(GET_ORDER_ITEMS_DEFAULT_SORT_BY);
			expect(result.data.sortOrder).toBe(GET_ORDER_ITEMS_DEFAULT_SORT_ORDER);
			expect(result.data.filters).toEqual({});
		}
	});

	it("should coerce perPage from a string number", () => {
		const result = getOrderItemsSchema.safeParse({ perPage: "25" });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.perPage).toBe(25);
	});

	it("should reject perPage exceeding max", () => {
		const result = getOrderItemsSchema.safeParse({
			perPage: GET_ORDER_ITEMS_MAX_RESULTS_PER_PAGE + 1,
		});
		expect(result.success).toBe(false);
	});

	it("should accept both sortOrder values", () => {
		expect(getOrderItemsSchema.safeParse({ sortOrder: "asc" }).success).toBe(true);
		expect(getOrderItemsSchema.safeParse({ sortOrder: "desc" }).success).toBe(true);
	});

	it("should reject an invalid sortOrder value", () => {
		const result = getOrderItemsSchema.safeParse({ sortOrder: "random" });
		expect(result.success).toBe(false);
	});

	it("should accept direction backward", () => {
		const result = getOrderItemsSchema.safeParse({ direction: "backward" });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.direction).toBe("backward");
	});
});
