import { describe, expect, it } from "vitest";
import { seededRandom } from "./seeded-random";

describe("seededRandom", () => {
	it("returns deterministic results for the same seed", () => {
		expect(seededRandom(42)).toBe(seededRandom(42));
		expect(seededRandom(0)).toBe(seededRandom(0));
		expect(seededRandom(9999)).toBe(seededRandom(9999));
	});

	it("returns different results for different seeds", () => {
		const values = new Set([
			seededRandom(1),
			seededRandom(2),
			seededRandom(3),
			seededRandom(100),
		]);
		expect(values.size).toBe(4);
	});

	it("returns values in [0, 1) range", () => {
		for (let i = 0; i < 1000; i++) {
			const v = seededRandom(i);
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(1);
		}
	});
});
