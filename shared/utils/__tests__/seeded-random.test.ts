import { describe, it, expect } from "vitest";
import { seededRandom } from "../seeded-random";

describe("seededRandom", () => {
	it("returns a value between 0 and 1", () => {
		for (let i = 0; i < 100; i++) {
			const value = seededRandom(i);
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
		}
	});

	it("returns the same value for the same seed", () => {
		expect(seededRandom(42)).toBe(seededRandom(42));
		expect(seededRandom(123)).toBe(seededRandom(123));
	});

	it("returns different values for different seeds", () => {
		expect(seededRandom(1)).not.toBe(seededRandom(2));
		expect(seededRandom(100)).not.toBe(seededRandom(200));
	});

	it("handles negative seeds", () => {
		const value = seededRandom(-5);
		expect(value).toBeGreaterThanOrEqual(0);
		expect(value).toBeLessThan(1);
	});

	it("handles zero seed", () => {
		const value = seededRandom(0);
		expect(value).toBeGreaterThanOrEqual(0);
		expect(value).toBeLessThan(1);
	});

	it("handles large positive seeds", () => {
		const value = seededRandom(999999);
		expect(value).toBeGreaterThanOrEqual(0);
		expect(value).toBeLessThan(1);
	});

	it("handles large negative seeds", () => {
		const value = seededRandom(-999999);
		expect(value).toBeGreaterThanOrEqual(0);
		expect(value).toBeLessThan(1);
	});

	it("handles floating point seeds", () => {
		const value = seededRandom(3.14);
		expect(value).toBeGreaterThanOrEqual(0);
		expect(value).toBeLessThan(1);
	});

	it("is deterministic across multiple calls with the same seed", () => {
		// Call multiple times to verify stability
		const first = seededRandom(77);
		const second = seededRandom(77);
		const third = seededRandom(77);
		expect(first).toBe(second);
		expect(second).toBe(third);
	});

	it("produces values spread across [0, 1) range (not all the same)", () => {
		const values = Array.from({ length: 10 }, (_, i) => seededRandom(i));
		const unique = new Set(values);
		// At least 5 unique values out of 10 — confirms distribution
		expect(unique.size).toBeGreaterThan(5);
	});

	it("returns fractional part — never exactly 1", () => {
		// The formula is x - Math.floor(x), so result is always strictly < 1
		for (let i = 0; i < 50; i++) {
			expect(seededRandom(i)).toBeLessThan(1);
		}
	});
});
