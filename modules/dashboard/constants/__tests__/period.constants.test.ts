import { describe, it, expect } from "vitest";

import {
	COMPARISON_LABELS,
	DASHBOARD_PERIODS,
	parsePeriod,
	type DashboardPeriod,
} from "../period.constants";

// ---------------------------------------------------------------------------
// parsePeriod
// ---------------------------------------------------------------------------

describe("parsePeriod", () => {
	it("returns '7d' for '7d'", () => {
		expect(parsePeriod("7d")).toBe("7d");
	});

	it("returns '30d' for '30d'", () => {
		expect(parsePeriod("30d")).toBe("30d");
	});

	it("returns 'month' for 'month'", () => {
		expect(parsePeriod("month")).toBe("month");
	});

	it("returns 'quarter' for 'quarter'", () => {
		expect(parsePeriod("quarter")).toBe("quarter");
	});

	it("returns 'year' for 'year'", () => {
		expect(parsePeriod("year")).toBe("year");
	});

	it("returns default 'month' for undefined", () => {
		expect(parsePeriod(undefined)).toBe("month");
	});

	it("returns default 'month' for an invalid string", () => {
		expect(parsePeriod("invalid")).toBe("month");
	});

	it("returns default 'month' for an empty string", () => {
		expect(parsePeriod("")).toBe("month");
	});

	it("returns default 'month' for an unknown period key", () => {
		expect(parsePeriod("week")).toBe("month");
	});
});

// ---------------------------------------------------------------------------
// DASHBOARD_PERIODS
// ---------------------------------------------------------------------------

describe("DASHBOARD_PERIODS", () => {
	it("has all 5 period keys", () => {
		const keys = Object.keys(DASHBOARD_PERIODS) as DashboardPeriod[];

		expect(keys).toHaveLength(5);
		expect(keys).toContain("7d");
		expect(keys).toContain("30d");
		expect(keys).toContain("month");
		expect(keys).toContain("quarter");
		expect(keys).toContain("year");
	});

	it("each period has a label string", () => {
		for (const config of Object.values(DASHBOARD_PERIODS)) {
			expect(typeof config.label).toBe("string");
			expect(config.label.length).toBeGreaterThan(0);
		}
	});

	it("each period has a valid chartGranularity", () => {
		const validGranularities = ["daily", "weekly", "monthly"];

		for (const config of Object.values(DASHBOARD_PERIODS)) {
			expect(validGranularities).toContain(config.chartGranularity);
		}
	});
});

// ---------------------------------------------------------------------------
// COMPARISON_LABELS
// ---------------------------------------------------------------------------

describe("COMPARISON_LABELS", () => {
	it("has all 5 period keys", () => {
		const keys = Object.keys(COMPARISON_LABELS) as DashboardPeriod[];

		expect(keys).toHaveLength(5);
		expect(keys).toContain("7d");
		expect(keys).toContain("30d");
		expect(keys).toContain("month");
		expect(keys).toContain("quarter");
		expect(keys).toContain("year");
	});

	it("each label is a non-empty string", () => {
		for (const label of Object.values(COMPARISON_LABELS)) {
			expect(typeof label).toBe("string");
			expect(label.length).toBeGreaterThan(0);
		}
	});
});
