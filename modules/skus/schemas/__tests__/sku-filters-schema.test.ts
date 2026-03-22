import { describe, it, expect } from "vitest";
import { productSkuFiltersSchema } from "@/modules/skus/schemas/sku-filters-schema";
import {
	SKU_FILTERS_MAX_INVENTORY,
	SKU_FILTERS_MAX_PRICE_CENTS,
} from "@/modules/skus/constants/sku.constants";

describe("productSkuFiltersSchema", () => {
	// -------------------------------------------------------------------------
	// Valid data
	// -------------------------------------------------------------------------

	it("should accept an empty object (all fields optional)", () => {
		const result = productSkuFiltersSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it("should accept a single productId string", () => {
		const result = productSkuFiltersSchema.safeParse({ productId: "abc123" });
		expect(result.success).toBe(true);
	});

	it("should accept an array of productId strings", () => {
		const result = productSkuFiltersSchema.safeParse({ productId: ["id1", "id2"] });
		expect(result.success).toBe(true);
	});

	it("should accept boolean flags isActive and isDefault", () => {
		const result = productSkuFiltersSchema.safeParse({ isActive: true, isDefault: false });
		expect(result.success).toBe(true);
	});

	it("should accept priceMin of 0 (nonnegative boundary)", () => {
		const result = productSkuFiltersSchema.safeParse({ priceMin: 0 });
		expect(result.success).toBe(true);
	});

	it("should accept priceMax at maximum boundary", () => {
		const result = productSkuFiltersSchema.safeParse({ priceMax: SKU_FILTERS_MAX_PRICE_CENTS });
		expect(result.success).toBe(true);
	});

	it("should accept inventoryMin and inventoryMax at maximum boundary", () => {
		const result = productSkuFiltersSchema.safeParse({
			inventoryMin: 0,
			inventoryMax: SKU_FILTERS_MAX_INVENTORY,
		});
		expect(result.success).toBe(true);
	});

	it("should accept all stockStatus enum values", () => {
		const values = ["all", "in_stock", "low_stock", "out_of_stock"] as const;
		for (const stockStatus of values) {
			const result = productSkuFiltersSchema.safeParse({ stockStatus });
			expect(result.success).toBe(true);
		}
	});

	it("should accept valid date strings via coerce for createdAfter", () => {
		const result = productSkuFiltersSchema.safeParse({ createdAfter: "2023-06-15" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.createdAfter).toBeInstanceOf(Date);
		}
	});

	it("should accept a size value as string or array", () => {
		expect(productSkuFiltersSchema.safeParse({ size: "M" }).success).toBe(true);
		expect(productSkuFiltersSchema.safeParse({ size: ["S", "M", "L"] }).success).toBe(true);
	});

	it("should accept colorId and materialId as arrays", () => {
		const result = productSkuFiltersSchema.safeParse({
			colorId: ["color1", "color2"],
			materialId: ["mat1"],
		});
		expect(result.success).toBe(true);
	});

	// -------------------------------------------------------------------------
	// Invalid field types
	// -------------------------------------------------------------------------

	it("should reject a negative priceMin", () => {
		const result = productSkuFiltersSchema.safeParse({ priceMin: -1 });
		expect(result.success).toBe(false);
	});

	it("should reject priceMax exceeding maximum", () => {
		const result = productSkuFiltersSchema.safeParse({
			priceMax: SKU_FILTERS_MAX_PRICE_CENTS + 1,
		});
		expect(result.success).toBe(false);
	});

	it("should reject a non-integer priceMin", () => {
		const result = productSkuFiltersSchema.safeParse({ priceMin: 10.5 });
		expect(result.success).toBe(false);
	});

	it("should reject inventoryMax exceeding maximum", () => {
		const result = productSkuFiltersSchema.safeParse({
			inventoryMax: SKU_FILTERS_MAX_INVENTORY + 1,
		});
		expect(result.success).toBe(false);
	});

	it("should reject an invalid stockStatus enum value", () => {
		const result = productSkuFiltersSchema.safeParse({ stockStatus: "unknown_status" });
		expect(result.success).toBe(false);
	});

	it("should reject a date before SKU_FILTERS_MIN_DATE", () => {
		// One day before the minimum date 2020-01-01
		const result = productSkuFiltersSchema.safeParse({ createdAfter: "2019-12-31" });
		expect(result.success).toBe(false);
	});

	it("should reject a future date for createdAfter", () => {
		const future = new Date();
		future.setFullYear(future.getFullYear() + 1);
		const result = productSkuFiltersSchema.safeParse({
			createdAfter: future.toISOString(),
		});
		expect(result.success).toBe(false);
	});

	// -------------------------------------------------------------------------
	// Cross-field refinements
	// -------------------------------------------------------------------------

	it("should reject priceMin greater than priceMax", () => {
		const result = productSkuFiltersSchema.safeParse({ priceMin: 5000, priceMax: 1000 });
		expect(result.success).toBe(false);
	});

	it("should accept priceMin equal to priceMax", () => {
		const result = productSkuFiltersSchema.safeParse({ priceMin: 1000, priceMax: 1000 });
		expect(result.success).toBe(true);
	});

	it("should reject inventoryMin greater than inventoryMax", () => {
		const result = productSkuFiltersSchema.safeParse({ inventoryMin: 50, inventoryMax: 10 });
		expect(result.success).toBe(false);
	});

	it("should reject createdAfter greater than createdBefore", () => {
		const result = productSkuFiltersSchema.safeParse({
			createdAfter: "2023-06-15",
			createdBefore: "2023-01-01",
		});
		expect(result.success).toBe(false);
	});

	it("should accept createdAfter equal to createdBefore", () => {
		const result = productSkuFiltersSchema.safeParse({
			createdAfter: "2023-06-15",
			createdBefore: "2023-06-15",
		});
		expect(result.success).toBe(true);
	});

	it("should reject updatedAfter greater than updatedBefore", () => {
		const result = productSkuFiltersSchema.safeParse({
			updatedAfter: "2023-09-01",
			updatedBefore: "2023-08-01",
		});
		expect(result.success).toBe(false);
	});

	it("should accept updatedAfter equal to updatedBefore", () => {
		const result = productSkuFiltersSchema.safeParse({
			updatedAfter: "2023-08-01",
			updatedBefore: "2023-08-01",
		});
		expect(result.success).toBe(true);
	});

	it("should pass refinement when only priceMin is set (no priceMax)", () => {
		const result = productSkuFiltersSchema.safeParse({ priceMin: 9999 });
		expect(result.success).toBe(true);
	});

	it("should accept hasImages and hasOrders boolean flags", () => {
		const result = productSkuFiltersSchema.safeParse({ hasImages: true, hasOrders: false });
		expect(result.success).toBe(true);
	});
});
