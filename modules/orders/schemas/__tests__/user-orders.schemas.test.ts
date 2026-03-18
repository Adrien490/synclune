import { describe, it, expect } from "vitest";
import { userOrdersSortBySchema, getUserOrdersSchema } from "../user-orders.schemas";
import {
	GET_USER_ORDERS_DEFAULT_PER_PAGE,
	GET_USER_ORDERS_MAX_RESULTS_PER_PAGE,
	USER_ORDERS_SORT_OPTIONS,
} from "../../constants/user-orders.constants";

// Valid CUID2 of exactly 25 characters
const VALID_CURSOR = "clh1234567890abcdefghijkl";

// ============================================================================
// userOrdersSortBySchema
// ============================================================================

describe("userOrdersSortBySchema", () => {
	it("accepts all valid sort values", () => {
		const validValues = Object.values(USER_ORDERS_SORT_OPTIONS);
		for (const value of validValues) {
			expect(userOrdersSortBySchema.safeParse(value).success).toBe(true);
		}
	});

	it("defaults to created-descending when undefined", () => {
		const result = userOrdersSortBySchema.safeParse(undefined);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe(USER_ORDERS_SORT_OPTIONS.CREATED_DESC);
		}
	});

	it("rejects an unknown sort value", () => {
		expect(userOrdersSortBySchema.safeParse("unknown-sort").success).toBe(false);
	});

	it("rejects an empty string", () => {
		expect(userOrdersSortBySchema.safeParse("").success).toBe(false);
	});
});

// ============================================================================
// getUserOrdersSchema
// ============================================================================

describe("getUserOrdersSchema", () => {
	it("accepts an empty object (all fields have defaults)", () => {
		const result = getUserOrdersSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it(`defaults perPage to ${GET_USER_ORDERS_DEFAULT_PER_PAGE}`, () => {
		const result = getUserOrdersSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.perPage).toBe(GET_USER_ORDERS_DEFAULT_PER_PAGE);
		}
	});

	it("defaults direction to forward", () => {
		const result = getUserOrdersSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.direction).toBe("forward");
		}
	});

	it("defaults sortBy to created-descending", () => {
		const result = getUserOrdersSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.sortBy).toBe(USER_ORDERS_SORT_OPTIONS.CREATED_DESC);
		}
	});

	it("coerces perPage from string to number", () => {
		const result = getUserOrdersSchema.safeParse({ perPage: "25" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.perPage).toBe(25);
		}
	});

	it(`rejects perPage above max (${GET_USER_ORDERS_MAX_RESULTS_PER_PAGE})`, () => {
		expect(
			getUserOrdersSchema.safeParse({ perPage: GET_USER_ORDERS_MAX_RESULTS_PER_PAGE + 1 }).success,
		).toBe(false);
	});

	it("rejects perPage of 0", () => {
		expect(getUserOrdersSchema.safeParse({ perPage: 0 }).success).toBe(false);
	});

	it("accepts perPage at the maximum boundary", () => {
		const result = getUserOrdersSchema.safeParse({
			perPage: GET_USER_ORDERS_MAX_RESULTS_PER_PAGE,
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.perPage).toBe(GET_USER_ORDERS_MAX_RESULTS_PER_PAGE);
		}
	});

	it("accepts a valid 25-char cursor with direction backward", () => {
		const result = getUserOrdersSchema.safeParse({
			cursor: VALID_CURSOR,
			direction: "backward",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.cursor).toBe(VALID_CURSOR);
			expect(result.data.direction).toBe("backward");
		}
	});

	it("rejects a cursor with wrong length", () => {
		expect(getUserOrdersSchema.safeParse({ cursor: "short" }).success).toBe(false);
	});

	it("rejects an invalid direction value", () => {
		expect(getUserOrdersSchema.safeParse({ direction: "up" }).success).toBe(false);
	});

	it("accepts total-ascending as sortBy", () => {
		const result = getUserOrdersSchema.safeParse({
			sortBy: USER_ORDERS_SORT_OPTIONS.TOTAL_ASC,
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.sortBy).toBe(USER_ORDERS_SORT_OPTIONS.TOTAL_ASC);
		}
	});
});
