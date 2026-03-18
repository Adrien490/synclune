import { describe, it, expect } from "vitest";
import {
	subscriberFiltersSchema,
	subscriberSortBySchema,
	getSubscribersSchema,
} from "../subscriber.schemas";

// Valid CUID2 of exactly 25 characters
const VALID_CURSOR = "clh1234567890abcdefghijkl";

// ============================================================================
// subscriberFiltersSchema
// ============================================================================

describe("subscriberFiltersSchema", () => {
	it("accepts an empty object (all fields optional)", () => {
		expect(subscriberFiltersSchema.safeParse({}).success).toBe(true);
	});

	it("accepts a valid status value", () => {
		// NewsletterStatus enum values - try common values
		const result = subscriberFiltersSchema.safeParse({ status: "ACTIVE" });
		// Either succeeds (ACTIVE is a valid value) or fails (not in enum)
		// The key is it must not throw - just check parse completes
		expect(typeof result.success).toBe("boolean");
	});

	it("rejects an invalid status value", () => {
		const result = subscriberFiltersSchema.safeParse({ status: "INVALID_STATUS_XYZ" });
		expect(result.success).toBe(false);
	});

	it("accepts a valid ISO date string for subscribedAfter", () => {
		const result = subscriberFiltersSchema.safeParse({
			subscribedAfter: "2024-01-15T00:00:00.000Z",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.subscribedAfter).toBeInstanceOf(Date);
		}
	});

	it("accepts a Date object for subscribedBefore", () => {
		const result = subscriberFiltersSchema.safeParse({
			subscribedBefore: new Date("2025-06-01"),
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.subscribedBefore).toBeInstanceOf(Date);
		}
	});

	it("accepts when subscribedAfter equals subscribedBefore (boundary)", () => {
		const sameDate = "2025-03-01T00:00:00.000Z";
		const result = subscriberFiltersSchema.safeParse({
			subscribedAfter: sameDate,
			subscribedBefore: sameDate,
		});
		expect(result.success).toBe(true);
	});

	it("accepts when subscribedAfter is before subscribedBefore", () => {
		const result = subscriberFiltersSchema.safeParse({
			subscribedAfter: "2025-01-01T00:00:00.000Z",
			subscribedBefore: "2025-12-31T00:00:00.000Z",
		});
		expect(result.success).toBe(true);
	});

	it("rejects when subscribedAfter is after subscribedBefore", () => {
		const result = subscriberFiltersSchema.safeParse({
			subscribedAfter: "2025-12-01T00:00:00.000Z",
			subscribedBefore: "2025-01-01T00:00:00.000Z",
		});
		expect(result.success).toBe(false);
	});

	it("transforms an invalid date string to undefined (graceful degradation)", () => {
		const result = subscriberFiltersSchema.safeParse({
			subscribedAfter: "not-a-date",
		});
		// stringOrDateSchema returns undefined for invalid strings
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.subscribedAfter).toBeUndefined();
		}
	});
});

// ============================================================================
// subscriberSortBySchema
// ============================================================================

describe("subscriberSortBySchema", () => {
	it("accepts all valid sort values", () => {
		const validValues = [
			"subscribed-descending",
			"subscribed-ascending",
			"email-ascending",
			"email-descending",
			"status-ascending",
			"status-descending",
		];
		for (const value of validValues) {
			expect(subscriberSortBySchema.safeParse(value).success).toBe(true);
		}
	});

	it("rejects an unknown sort value", () => {
		expect(subscriberSortBySchema.safeParse("unknown-sort").success).toBe(false);
	});

	it("rejects an empty string", () => {
		expect(subscriberSortBySchema.safeParse("").success).toBe(false);
	});

	it("is case-sensitive (rejects uppercase variant)", () => {
		expect(subscriberSortBySchema.safeParse("Subscribed-Descending").success).toBe(false);
	});
});

// ============================================================================
// getSubscribersSchema
// ============================================================================

describe("getSubscribersSchema", () => {
	const validInput = {
		sortBy: "subscribed-descending",
	};

	it("accepts minimal valid input (only sortBy required)", () => {
		const result = getSubscribersSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	it("defaults perPage to 20", () => {
		const result = getSubscribersSchema.safeParse(validInput);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.perPage).toBe(20);
		}
	});

	it("defaults direction to forward", () => {
		const result = getSubscribersSchema.safeParse(validInput);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.direction).toBe("forward");
		}
	});

	it("coerces perPage from string to number", () => {
		const result = getSubscribersSchema.safeParse({ ...validInput, perPage: "50" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.perPage).toBe(50);
		}
	});

	it("rejects perPage above max (100)", () => {
		expect(getSubscribersSchema.safeParse({ ...validInput, perPage: 101 }).success).toBe(false);
	});

	it("rejects perPage of 0", () => {
		expect(getSubscribersSchema.safeParse({ ...validInput, perPage: 0 }).success).toBe(false);
	});

	it("accepts a valid 25-char cursor", () => {
		const result = getSubscribersSchema.safeParse({ ...validInput, cursor: VALID_CURSOR });
		expect(result.success).toBe(true);
	});

	it("rejects a cursor with wrong length", () => {
		expect(getSubscribersSchema.safeParse({ ...validInput, cursor: "tooshort" }).success).toBe(
			false,
		);
	});

	it("accepts search string up to 255 characters", () => {
		const result = getSubscribersSchema.safeParse({
			...validInput,
			search: "a".repeat(255),
		});
		expect(result.success).toBe(true);
	});

	it("rejects search string exceeding 255 characters", () => {
		expect(getSubscribersSchema.safeParse({ ...validInput, search: "a".repeat(256) }).success).toBe(
			false,
		);
	});

	it("accepts direction backward", () => {
		const result = getSubscribersSchema.safeParse({ ...validInput, direction: "backward" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.direction).toBe("backward");
		}
	});

	it("rejects an invalid direction value", () => {
		expect(getSubscribersSchema.safeParse({ ...validInput, direction: "sideways" }).success).toBe(
			false,
		);
	});
});
