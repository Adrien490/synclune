import { describe, it, expect } from "vitest";
import { productSkuSortBySchema } from "../sku-sort-by-schema";
import {
	GET_PRODUCT_SKUS_DEFAULT_SORT_BY,
	GET_PRODUCT_SKUS_SORT_FIELDS,
} from "../../constants/sku.constants";

// ============================================================================
// productSkuSortBySchema
// ============================================================================

describe("productSkuSortBySchema", () => {
	it("accepts all valid sort fields", () => {
		for (const field of GET_PRODUCT_SKUS_SORT_FIELDS) {
			const result = productSkuSortBySchema.safeParse(field);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe(field);
			}
		}
	});

	it(`falls back to default (${GET_PRODUCT_SKUS_DEFAULT_SORT_BY}) for an unknown string`, () => {
		const result = productSkuSortBySchema.safeParse("totally-invalid-sort");
		// Preprocess replaces unknown values with the default, so parse should succeed
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe(GET_PRODUCT_SKUS_DEFAULT_SORT_BY);
		}
	});

	it(`falls back to default for a non-string value (number)`, () => {
		const result = productSkuSortBySchema.safeParse(42);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe(GET_PRODUCT_SKUS_DEFAULT_SORT_BY);
		}
	});

	it(`falls back to default for undefined`, () => {
		const result = productSkuSortBySchema.safeParse(undefined);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe(GET_PRODUCT_SKUS_DEFAULT_SORT_BY);
		}
	});

	it(`falls back to default for null`, () => {
		const result = productSkuSortBySchema.safeParse(null);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe(GET_PRODUCT_SKUS_DEFAULT_SORT_BY);
		}
	});

	it("is case-sensitive (uppercased variant falls back to default)", () => {
		const result = productSkuSortBySchema.safeParse("Created-Descending");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe(GET_PRODUCT_SKUS_DEFAULT_SORT_BY);
		}
	});
});
