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
});
