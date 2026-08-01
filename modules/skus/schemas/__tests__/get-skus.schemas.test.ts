import { describe, it, expect } from "vitest";
import { getProductSkusSchema } from "../get-skus.schemas";
import {
	GET_PRODUCT_SKUS_DEFAULT_PER_PAGE,
	GET_PRODUCT_SKUS_DEFAULT_SORT_BY,
	GET_PRODUCT_SKUS_MAX_RESULTS_PER_PAGE,
	GET_PRODUCT_SKUS_SORT_FIELDS,
} from "../../constants/sku.constants";

// Valid CUID2 of exactly 25 characters
const VALID_CURSOR = "clh1234567890abcdefghijkl";

// ============================================================================
// getProductSkusSchema
// ============================================================================

describe("getProductSkusSchema", () => {
	it("accepts an empty object (all fields have defaults)", () => {
		const result = getProductSkusSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it(`defaults perPage to ${GET_PRODUCT_SKUS_DEFAULT_PER_PAGE}`, () => {
		const result = getProductSkusSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.perPage).toBe(GET_PRODUCT_SKUS_DEFAULT_PER_PAGE);
		}
	});

	it("defaults direction to forward", () => {
		const result = getProductSkusSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.direction).toBe("forward");
		}
	});

	it(`defaults sortBy to ${GET_PRODUCT_SKUS_DEFAULT_SORT_BY}`, () => {
		const result = getProductSkusSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.sortBy).toBe(GET_PRODUCT_SKUS_DEFAULT_SORT_BY);
		}
	});

	it("coerces perPage from string to number", () => {
		const result = getProductSkusSchema.safeParse({ perPage: "50" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.perPage).toBe(50);
		}
	});

	it(`rejects perPage above max (${GET_PRODUCT_SKUS_MAX_RESULTS_PER_PAGE})`, () => {
		expect(
			getProductSkusSchema.safeParse({ perPage: GET_PRODUCT_SKUS_MAX_RESULTS_PER_PAGE + 1 })
				.success,
		).toBe(false);
	});

	it("rejects perPage of 0", () => {
		expect(getProductSkusSchema.safeParse({ perPage: 0 }).success).toBe(false);
	});

	it("accepts perPage at the maximum boundary", () => {
		const result = getProductSkusSchema.safeParse({
			perPage: GET_PRODUCT_SKUS_MAX_RESULTS_PER_PAGE,
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.perPage).toBe(GET_PRODUCT_SKUS_MAX_RESULTS_PER_PAGE);
		}
	});

	it("accepts all valid sortBy values from sort fields", () => {
		for (const sortField of GET_PRODUCT_SKUS_SORT_FIELDS) {
			const result = getProductSkusSchema.safeParse({ sortBy: sortField });
			expect(result.success).toBe(true);
		}
	});

	it("falls back to default sortBy for an invalid sort value (preprocess)", () => {
		// productSkuSortBySchema uses preprocess to fall back to default
		const result = getProductSkusSchema.safeParse({ sortBy: "invalid-sort" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.sortBy).toBe(GET_PRODUCT_SKUS_DEFAULT_SORT_BY);
		}
	});

	it("accepts a valid 25-char cursor", () => {
		const result = getProductSkusSchema.safeParse({ cursor: VALID_CURSOR });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.cursor).toBe(VALID_CURSOR);
		}
	});

	it("rejects a cursor with wrong length", () => {
		expect(getProductSkusSchema.safeParse({ cursor: "tooshort" }).success).toBe(false);
	});

	it("accepts search string up to TEXT_LIMITS.SEARCH.max (100) characters", () => {
		const result = getProductSkusSchema.safeParse({ search: "a".repeat(100) });
		expect(result.success).toBe(true);
	});

	it("rejects search string exceeding TEXT_LIMITS.SEARCH.max characters", () => {
		expect(getProductSkusSchema.safeParse({ search: "a".repeat(101) }).success).toBe(false);
	});

	it("accepts direction backward with valid cursor", () => {
		const result = getProductSkusSchema.safeParse({
			cursor: VALID_CURSOR,
			direction: "backward",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.direction).toBe("backward");
		}
	});

	it("accepts optional filters when omitted", () => {
		const result = getProductSkusSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.filters).toBeUndefined();
		}
	});

	it("accepts filters with isActive boolean", () => {
		const result = getProductSkusSchema.safeParse({
			filters: { isActive: true },
		});
		expect(result.success).toBe(true);
	});
});
