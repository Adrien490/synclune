import { describe, it, expect, vi } from "vitest";

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

	it("should follow the format CMD-{timestamp}-{12 hex chars}", () => {
		const result = generateOrderNumber();
		expect(result).toMatch(/^CMD-\d+-[A-F0-9]{12}$/);
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

	it("should have a 12-character uppercase hex suffix", () => {
		const result = generateOrderNumber();
		const parts = result.split("-");
		const suffix = parts[parts.length - 1];
		expect(suffix).toMatch(/^[A-F0-9]{12}$/);
	});

	it("should use current Date.now() timestamp", () => {
		const mockTimestamp = 1704067200000;
		vi.spyOn(Date, "now").mockReturnValue(mockTimestamp);

		const result = generateOrderNumber();
		expect(result).toMatch(new RegExp(`^CMD-${mockTimestamp}-[A-F0-9]{12}$`));

		vi.restoreAllMocks();
	});

	// EINV-SEC-006 : régression CSPRNG vs Math.random().
	it("should produce no collisions across 10k iterations (CSPRNG entropy ~2^48)", () => {
		const set = new Set<string>();
		for (let i = 0; i < 10_000; i++) {
			set.add(generateOrderNumber());
		}
		expect(set.size).toBe(10_000);
	});

	it("should use crypto.randomBytes (CSPRNG), not Math.random", () => {
		// Sanity check : verify that Math.random is NOT called during generation.
		// Math.random returns predictable values seeded by v8 xorshift — a CSPRNG
		// alternative is required to prevent orderNumber enumeration.
		const mathRandomSpy = vi.spyOn(Math, "random");
		generateOrderNumber();
		expect(mathRandomSpy).not.toHaveBeenCalled();
		mathRandomSpy.mockRestore();
	});
});
