import { describe, it, expect } from "vitest";

import { buildSparklinePath } from "../kpi-sparkline-builder.service";

// ---------------------------------------------------------------------------
// buildSparklinePath
// ---------------------------------------------------------------------------

describe("buildSparklinePath", () => {
	// -------------------------------------------------------------------------
	// Return type
	// -------------------------------------------------------------------------

	it("should return a string starting with 'M' for multiple values", () => {
		const result = buildSparklinePath([10, 20, 30]);

		expect(typeof result).toBe("string");
		expect(result).not.toBeNull();
		expect(result!.startsWith("M")).toBe(true);
	});

	it("should return null for an empty array", () => {
		const result = buildSparklinePath([]);

		expect(result).toBeNull();
	});

	it("should return null for a single value", () => {
		const result = buildSparklinePath([42]);

		expect(result).toBeNull();
	});

	// -------------------------------------------------------------------------
	// Valid path structure
	// -------------------------------------------------------------------------

	it("should produce a path containing cubic bezier commands (C)", () => {
		const result = buildSparklinePath([0, 50, 100]);

		expect(result).toContain("C");
	});

	it("should return a valid path for exactly two values", () => {
		const result = buildSparklinePath([10, 90]);

		expect(result).not.toBeNull();
		expect(result!.startsWith("M")).toBe(true);
		expect(result).toContain("C");
	});

	// -------------------------------------------------------------------------
	// Flat line (all same values)
	// -------------------------------------------------------------------------

	it("should return a valid path when all values are identical (flat line)", () => {
		const result = buildSparklinePath([5, 5, 5, 5]);

		expect(result).not.toBeNull();
		expect(result!.startsWith("M")).toBe(true);
	});

	it("should position flat line at vertical center when all values are equal", () => {
		// With all same values, range collapses to 1 (guard), so normalization = 0
		// All y points = padding + innerHeight - 0 = padding + innerHeight
		const result = buildSparklinePath([10, 10], 100, 32);

		expect(result).not.toBeNull();
		// y = padding(2) + innerHeight(28) - 0 = 30 for both points
		expect(result).toContain("30");
	});

	// -------------------------------------------------------------------------
	// Default dimensions (width=100, height=32)
	// -------------------------------------------------------------------------

	it("should use width=100 and height=32 by default", () => {
		const result = buildSparklinePath([0, 100]);

		expect(result).not.toBeNull();
		// With 2 values, stepX = 100 / (2-1) = 100 => second point x = 100
		expect(result).toContain("100");
	});

	it("should start at x=0 for the first point", () => {
		const result = buildSparklinePath([20, 80, 50]);

		expect(result).not.toBeNull();
		expect(result!.startsWith("M 0,")).toBe(true);
	});

	// -------------------------------------------------------------------------
	// Custom dimensions
	// -------------------------------------------------------------------------

	it("should respect custom width", () => {
		const result = buildSparklinePath([10, 90], 200, 32);

		expect(result).not.toBeNull();
		// With 2 values stepX = 200 / 1 = 200, second point x = 200
		expect(result).toContain("200");
	});

	it("should respect custom height and stay within padding bounds", () => {
		const height = 50;
		const padding = 2;
		const innerHeight = height - padding * 2; // 46

		const result = buildSparklinePath([0, 100], 100, height);

		expect(result).not.toBeNull();
		// Max y = padding + innerHeight = 48 (min value, mapped to bottom)
		// Min y = padding = 2 (max value, mapped to top)
		expect(result).toContain(`${padding}`);
		expect(result).toContain(`${padding + innerHeight}`);
	});

	// -------------------------------------------------------------------------
	// Point count drives segment count
	// -------------------------------------------------------------------------

	it("should produce one C segment per additional point after the first", () => {
		// 4 values => 3 bezier segments => 3 occurrences of " C "
		const result = buildSparklinePath([10, 20, 30, 40]);

		expect(result).not.toBeNull();
		const segments = result!.split(" C ").length - 1;
		expect(segments).toBe(3);
	});
});
