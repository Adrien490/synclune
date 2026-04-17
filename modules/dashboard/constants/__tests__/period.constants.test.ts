import { describe, it, expect } from "vitest";

import {
	COMPARISON_LABELS,
	COMPARISON_MODE_LABELS,
	DASHBOARD_PERIODS,
	DEFAULT_COMPARISON_MODE,
	YOY_COMPARISON_LABELS,
	getComparisonLabel,
	parseComparisonMode,
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

// ---------------------------------------------------------------------------
// YOY_COMPARISON_LABELS
// ---------------------------------------------------------------------------

describe("YOY_COMPARISON_LABELS", () => {
	it("has all 5 period keys", () => {
		const keys = Object.keys(YOY_COMPARISON_LABELS) as DashboardPeriod[];

		expect(keys).toHaveLength(5);
		for (const k of ["7d", "30d", "month", "quarter", "year"] as const) {
			expect(keys).toContain(k);
		}
	});

	it("each YoY label is a non-empty string", () => {
		for (const label of Object.values(YOY_COMPARISON_LABELS)) {
			expect(typeof label).toBe("string");
			expect(label.length).toBeGreaterThan(0);
		}
	});
});

// ---------------------------------------------------------------------------
// COMPARISON_MODE_LABELS
// ---------------------------------------------------------------------------

describe("COMPARISON_MODE_LABELS", () => {
	it("has both 'previous' and 'yoy' keys", () => {
		expect(Object.keys(COMPARISON_MODE_LABELS).sort()).toEqual(["previous", "yoy"]);
	});

	it("DEFAULT_COMPARISON_MODE is 'previous'", () => {
		expect(DEFAULT_COMPARISON_MODE).toBe("previous");
	});
});

// ---------------------------------------------------------------------------
// parseComparisonMode
// ---------------------------------------------------------------------------

describe("parseComparisonMode", () => {
	it("returns 'previous' for 'previous'", () => {
		expect(parseComparisonMode("previous")).toBe("previous");
	});

	it("returns 'yoy' for 'yoy'", () => {
		expect(parseComparisonMode("yoy")).toBe("yoy");
	});

	it("returns default 'previous' for undefined", () => {
		expect(parseComparisonMode(undefined)).toBe("previous");
	});

	it("returns default 'previous' for invalid string", () => {
		expect(parseComparisonMode("invalid")).toBe("previous");
		expect(parseComparisonMode("")).toBe("previous");
		expect(parseComparisonMode("YEAR")).toBe("previous");
	});
});

// ---------------------------------------------------------------------------
// getComparisonLabel
// ---------------------------------------------------------------------------

describe("getComparisonLabel", () => {
	it("returns previous-period label for 'previous' mode", () => {
		expect(getComparisonLabel("month", "previous")).toBe(COMPARISON_LABELS.month);
		expect(getComparisonLabel("year", "previous")).toBe(COMPARISON_LABELS.year);
	});

	it("returns YoY label for 'yoy' mode", () => {
		expect(getComparisonLabel("month", "yoy")).toBe(YOY_COMPARISON_LABELS.month);
		expect(getComparisonLabel("quarter", "yoy")).toBe(YOY_COMPARISON_LABELS.quarter);
	});
});
