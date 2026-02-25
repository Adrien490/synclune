import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { generateOrderNumber } from "../order-generation.service";

// ============================================================================
// generateOrderNumber
// ============================================================================

describe("generateOrderNumber", () => {
	it("should return a string", () => {
		expect(typeof generateOrderNumber()).toBe("string");
	});

	it("should start with CMD-", () => {
		expect(generateOrderNumber()).toMatch(/^CMD-/);
	});

	it("should follow the format CMD-{timestamp}-{4chars}", () => {
		const result = generateOrderNumber();
		expect(result).toMatch(/^CMD-\d+-[A-Z0-9]{4}$/);
	});

	it("should include a valid timestamp in the middle segment", () => {
		const before = Date.now();
		const result = generateOrderNumber();
		const after = Date.now();
		const timestampStr = result.split("-")[1];
		const timestamp = Number(timestampStr);
		expect(timestamp).toBeGreaterThanOrEqual(before);
		expect(timestamp).toBeLessThanOrEqual(after);
	});

	it("should generate unique numbers on successive calls", () => {
		const numbers = new Set(Array.from({ length: 20 }, () => generateOrderNumber()));
		// Each call should produce a unique value due to random suffix
		expect(numbers.size).toBeGreaterThan(1);
	});

	it("should have a 4-character uppercase alphanumeric suffix", () => {
		const result = generateOrderNumber();
		const parts = result.split("-");
		const suffix = parts[parts.length - 1];
		expect(suffix).toMatch(/^[A-Z0-9]{4}$/);
	});

	it("should use current Date.now() timestamp", () => {
		const mockTimestamp = 1704067200000;
		vi.spyOn(Date, "now").mockReturnValue(mockTimestamp);

		const result = generateOrderNumber();
		expect(result).toMatch(new RegExp(`^CMD-${mockTimestamp}-[A-Z0-9]{4}$`));

		vi.restoreAllMocks();
	});
});
