import { describe, it, expect } from "vitest";
import { getProductVariantsSchema } from "../get-variants.schemas";
import {
	GET_PRODUCT_VARIANTS_DEFAULT_PER_PAGE,
	GET_PRODUCT_VARIANTS_DEFAULT_SORT_BY,
	GET_PRODUCT_VARIANTS_MAX_RESULTS_PER_PAGE,
	GET_PRODUCT_VARIANTS_SORT_FIELDS,
} from "../../constants/variant.constants";

// Valid CUID2 of exactly 25 characters
const VALID_CURSOR = "clh1234567890abcdefghijkl";

// ============================================================================
// getProductVariantsSchema
// ============================================================================

describe("getProductVariantsSchema", () => {
	it("accepts an empty object (all fields have defaults)", () => {
		const result = getProductVariantsSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it(`defaults perPage to ${GET_PRODUCT_VARIANTS_DEFAULT_PER_PAGE}`, () => {
		const result = getProductVariantsSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.perPage).toBe(GET_PRODUCT_VARIANTS_DEFAULT_PER_PAGE);
		}
	});

	it("defaults direction to forward", () => {
		const result = getProductVariantsSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.direction).toBe("forward");
		}
	});

	it(`defaults sortBy to ${GET_PRODUCT_VARIANTS_DEFAULT_SORT_BY}`, () => {
		const result = getProductVariantsSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.sortBy).toBe(GET_PRODUCT_VARIANTS_DEFAULT_SORT_BY);
		}
	});

	it("coerces perPage from string to number", () => {
		const result = getProductVariantsSchema.safeParse({ perPage: "50" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.perPage).toBe(50);
		}
	});

	it(`rejects perPage above max (${GET_PRODUCT_VARIANTS_MAX_RESULTS_PER_PAGE})`, () => {
		expect(
			getProductVariantsSchema.safeParse({ perPage: GET_PRODUCT_VARIANTS_MAX_RESULTS_PER_PAGE + 1 })
				.success,
		).toBe(false);
	});

	it("rejects perPage of 0", () => {
		expect(getProductVariantsSchema.safeParse({ perPage: 0 }).success).toBe(false);
	});

	it("accepts perPage at the maximum boundary", () => {
		const result = getProductVariantsSchema.safeParse({
			perPage: GET_PRODUCT_VARIANTS_MAX_RESULTS_PER_PAGE,
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.perPage).toBe(GET_PRODUCT_VARIANTS_MAX_RESULTS_PER_PAGE);
		}
	});

	it("accepts all valid sortBy values from sort fields", () => {
		for (const sortField of GET_PRODUCT_VARIANTS_SORT_FIELDS) {
			const result = getProductVariantsSchema.safeParse({ sortBy: sortField });
			expect(result.success).toBe(true);
		}
	});

	it("falls back to default sortBy for an invalid sort value (preprocess)", () => {
		// productVariantSortBySchema uses preprocess to fall back to default
		const result = getProductVariantsSchema.safeParse({ sortBy: "invalid-sort" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.sortBy).toBe(GET_PRODUCT_VARIANTS_DEFAULT_SORT_BY);
		}
	});

	it("accepts a valid 25-char cursor", () => {
		const result = getProductVariantsSchema.safeParse({ cursor: VALID_CURSOR });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.cursor).toBe(VALID_CURSOR);
		}
	});

	it("rejects a cursor with wrong length", () => {
		expect(getProductVariantsSchema.safeParse({ cursor: "tooshort" }).success).toBe(false);
	});

	it("accepts search string up to TEXT_LIMITS.SEARCH.max (100) characters", () => {
		const result = getProductVariantsSchema.safeParse({ search: "a".repeat(100) });
		expect(result.success).toBe(true);
	});

	it("rejects search string exceeding TEXT_LIMITS.SEARCH.max characters", () => {
		expect(getProductVariantsSchema.safeParse({ search: "a".repeat(101) }).success).toBe(false);
	});

	it("accepts direction backward with valid cursor", () => {
		const result = getProductVariantsSchema.safeParse({
			cursor: VALID_CURSOR,
			direction: "backward",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.direction).toBe("backward");
		}
	});

	it("accepts optional filters when omitted", () => {
		const result = getProductVariantsSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.filters).toBeUndefined();
		}
	});

	it("accepts filters with active boolean", () => {
		const result = getProductVariantsSchema.safeParse({
			filters: { active: true },
		});
		expect(result.success).toBe(true);
	});
});
