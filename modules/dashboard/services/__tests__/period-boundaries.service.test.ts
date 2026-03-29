import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getChartConfig, getPeriodBoundaries } from "../period-boundaries.service";

// ---------------------------------------------------------------------------
// Frozen time: 2026-03-15T12:00:00Z
//   - UTC year:  2026
//   - UTC month: 2 (March, 0-indexed)
//   - UTC date:  15
// ---------------------------------------------------------------------------

const FROZEN_DATE = new Date("2026-03-15T12:00:00Z");

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(FROZEN_DATE);
});

afterEach(() => {
	vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// getPeriodBoundaries
// ---------------------------------------------------------------------------

describe("getPeriodBoundaries", () => {
	describe("7d", () => {
		it("currentStart is 7 days ago in UTC", () => {
			const { currentStart } = getPeriodBoundaries("7d");

			expect(currentStart).toEqual(new Date(Date.UTC(2026, 2, 8)));
		});

		it("previousStart is 14 days ago in UTC", () => {
			const { previousStart } = getPeriodBoundaries("7d");

			expect(previousStart).toEqual(new Date(Date.UTC(2026, 2, 1)));
		});

		it("previousEnd equals currentStart", () => {
			const { previousEnd, currentStart } = getPeriodBoundaries("7d");

			expect(previousEnd).toEqual(currentStart);
		});

		it("currentEnd is approximately now", () => {
			const { currentEnd } = getPeriodBoundaries("7d");

			expect(currentEnd.getTime()).toBeCloseTo(FROZEN_DATE.getTime(), -2);
		});
	});

	describe("30d", () => {
		it("currentStart is 30 days ago in UTC", () => {
			const { currentStart } = getPeriodBoundaries("30d");

			expect(currentStart).toEqual(new Date(Date.UTC(2026, 2, -15)));
		});

		it("previousStart is 60 days ago in UTC", () => {
			const { previousStart } = getPeriodBoundaries("30d");

			expect(previousStart).toEqual(new Date(Date.UTC(2026, 2, -45)));
		});

		it("previousEnd equals currentStart", () => {
			const { previousEnd, currentStart } = getPeriodBoundaries("30d");

			expect(previousEnd).toEqual(currentStart);
		});

		it("currentEnd is approximately now", () => {
			const { currentEnd } = getPeriodBoundaries("30d");

			expect(currentEnd.getTime()).toBeCloseTo(FROZEN_DATE.getTime(), -2);
		});
	});

	describe("month", () => {
		it("currentStart is March 1 2026 UTC", () => {
			const { currentStart } = getPeriodBoundaries("month");

			expect(currentStart).toEqual(new Date(Date.UTC(2026, 2, 1)));
		});

		it("previousStart is February 1 2026 UTC", () => {
			const { previousStart } = getPeriodBoundaries("month");

			expect(previousStart).toEqual(new Date(Date.UTC(2026, 1, 1)));
		});

		it("previousEnd is February 28 2026 23:59:59.999 UTC", () => {
			const { previousEnd } = getPeriodBoundaries("month");

			expect(previousEnd).toEqual(new Date(Date.UTC(2026, 2, 0, 23, 59, 59, 999)));
		});

		it("currentEnd is approximately now", () => {
			const { currentEnd } = getPeriodBoundaries("month");

			expect(currentEnd.getTime()).toBeCloseTo(FROZEN_DATE.getTime(), -2);
		});
	});

	describe("quarter", () => {
		// March 2026 is Q1 (months 0-2): quarter starts Jan 1
		it("currentStart is January 1 2026 UTC (Q1 start)", () => {
			const { currentStart } = getPeriodBoundaries("quarter");

			expect(currentStart).toEqual(new Date(Date.UTC(2026, 0, 1)));
		});

		it("previousStart is October 1 2025 UTC (Q4 2025 start)", () => {
			const { previousStart } = getPeriodBoundaries("quarter");

			expect(previousStart).toEqual(new Date(Date.UTC(2025, 9, 1)));
		});

		it("previousEnd is December 31 2025 23:59:59.999 UTC", () => {
			const { previousEnd } = getPeriodBoundaries("quarter");

			expect(previousEnd).toEqual(new Date(Date.UTC(2026, 0, 0, 23, 59, 59, 999)));
		});

		it("currentEnd is approximately now", () => {
			const { currentEnd } = getPeriodBoundaries("quarter");

			expect(currentEnd.getTime()).toBeCloseTo(FROZEN_DATE.getTime(), -2);
		});
	});

	describe("year", () => {
		it("currentStart is January 1 2026 UTC", () => {
			const { currentStart } = getPeriodBoundaries("year");

			expect(currentStart).toEqual(new Date(Date.UTC(2026, 0, 1)));
		});

		it("previousStart is January 1 2025 UTC", () => {
			const { previousStart } = getPeriodBoundaries("year");

			expect(previousStart).toEqual(new Date(Date.UTC(2025, 0, 1)));
		});

		it("previousEnd is December 31 2025 23:59:59.999 UTC", () => {
			const { previousEnd } = getPeriodBoundaries("year");

			expect(previousEnd).toEqual(new Date(Date.UTC(2025, 11, 31, 23, 59, 59, 999)));
		});

		it("currentEnd is approximately now", () => {
			const { currentEnd } = getPeriodBoundaries("year");

			expect(currentEnd.getTime()).toBeCloseTo(FROZEN_DATE.getTime(), -2);
		});
	});
});

// ---------------------------------------------------------------------------
// getPeriodBoundaries — edge cases
// ---------------------------------------------------------------------------

describe("getPeriodBoundaries edge cases", () => {
	describe("January 1 midnight (2026-01-01T00:00:01Z)", () => {
		beforeEach(() => {
			vi.setSystemTime(new Date("2026-01-01T00:00:01Z"));
		});

		it("7d: currentStart is December 25 2025 UTC", () => {
			const { currentStart } = getPeriodBoundaries("7d");

			expect(currentStart).toEqual(new Date(Date.UTC(2025, 11, 25)));
		});

		it("month: currentStart is January 1 2026 UTC", () => {
			const { currentStart } = getPeriodBoundaries("month");

			expect(currentStart).toEqual(new Date(Date.UTC(2026, 0, 1)));
		});

		it("month: previousStart is December 1 2025 UTC", () => {
			const { previousStart } = getPeriodBoundaries("month");

			expect(previousStart).toEqual(new Date(Date.UTC(2025, 11, 1)));
		});

		it("month: previousEnd is December 31 2025 23:59:59.999 UTC", () => {
			const { previousEnd } = getPeriodBoundaries("month");

			expect(previousEnd).toEqual(new Date(Date.UTC(2025, 11, 31, 23, 59, 59, 999)));
		});

		it("quarter: currentStart is January 1 2026 UTC (Q1 start)", () => {
			const { currentStart } = getPeriodBoundaries("quarter");

			expect(currentStart).toEqual(new Date(Date.UTC(2026, 0, 1)));
		});

		it("quarter: previousStart is October 1 2025 UTC (Q4 2025 start)", () => {
			const { previousStart } = getPeriodBoundaries("quarter");

			expect(previousStart).toEqual(new Date(Date.UTC(2025, 9, 1)));
		});

		it("year: currentStart is January 1 2026 UTC", () => {
			const { currentStart } = getPeriodBoundaries("year");

			expect(currentStart).toEqual(new Date(Date.UTC(2026, 0, 1)));
		});

		it("year: previousStart is January 1 2025 UTC", () => {
			const { previousStart } = getPeriodBoundaries("year");

			expect(previousStart).toEqual(new Date(Date.UTC(2025, 0, 1)));
		});
	});

	describe("February 28 non-leap year (2026-02-28T12:00:00Z)", () => {
		beforeEach(() => {
			vi.setSystemTime(new Date("2026-02-28T12:00:00Z"));
		});

		it("month: previousEnd is January 31 2026 23:59:59.999 UTC (not Feb 28)", () => {
			const { previousEnd } = getPeriodBoundaries("month");

			expect(previousEnd).toEqual(new Date(Date.UTC(2026, 1, 0, 23, 59, 59, 999)));
		});
	});

	describe("February 29 leap year (2028-02-29T12:00:00Z)", () => {
		beforeEach(() => {
			vi.setSystemTime(new Date("2028-02-29T12:00:00Z"));
		});

		it("month: currentStart is February 1 2028 UTC", () => {
			const { currentStart } = getPeriodBoundaries("month");

			expect(currentStart).toEqual(new Date(Date.UTC(2028, 1, 1)));
		});

		it("month: previousEnd is January 31 2028 23:59:59.999 UTC", () => {
			const { previousEnd } = getPeriodBoundaries("month");

			expect(previousEnd).toEqual(new Date(Date.UTC(2028, 1, 0, 23, 59, 59, 999)));
		});
	});

	describe("March 31 → quarter transition (2026-04-01T00:00:01Z)", () => {
		beforeEach(() => {
			vi.setSystemTime(new Date("2026-04-01T00:00:01Z"));
		});

		it("quarter: currentStart is April 1 2026 UTC (Q2 start)", () => {
			const { currentStart } = getPeriodBoundaries("quarter");

			expect(currentStart).toEqual(new Date(Date.UTC(2026, 3, 1)));
		});

		it("quarter: previousStart is January 1 2026 UTC (Q1 start)", () => {
			const { previousStart } = getPeriodBoundaries("quarter");

			expect(previousStart).toEqual(new Date(Date.UTC(2026, 0, 1)));
		});

		it("quarter: previousEnd is March 31 2026 23:59:59.999 UTC", () => {
			const { previousEnd } = getPeriodBoundaries("quarter");

			expect(previousEnd).toEqual(new Date(Date.UTC(2026, 3, 0, 23, 59, 59, 999)));
		});
	});

	describe("December 31 (2026-12-31T23:59:00Z)", () => {
		beforeEach(() => {
			vi.setSystemTime(new Date("2026-12-31T23:59:00Z"));
		});

		it("year: currentStart is January 1 2026 UTC", () => {
			const { currentStart } = getPeriodBoundaries("year");

			expect(currentStart).toEqual(new Date(Date.UTC(2026, 0, 1)));
		});

		it("year: previousStart is January 1 2025 UTC", () => {
			const { previousStart } = getPeriodBoundaries("year");

			expect(previousStart).toEqual(new Date(Date.UTC(2025, 0, 1)));
		});

		it("quarter: currentStart is October 1 2026 UTC (Q4 start)", () => {
			const { currentStart } = getPeriodBoundaries("quarter");

			expect(currentStart).toEqual(new Date(Date.UTC(2026, 9, 1)));
		});

		it("quarter: previousStart is July 1 2026 UTC (Q3 start)", () => {
			const { previousStart } = getPeriodBoundaries("quarter");

			expect(previousStart).toEqual(new Date(Date.UTC(2026, 6, 1)));
		});
	});
});

// ---------------------------------------------------------------------------
// getChartConfig
// ---------------------------------------------------------------------------

describe("getChartConfig", () => {
	describe("7d", () => {
		it("has pointCount of 7", () => {
			const config = getChartConfig("7d");

			expect(config.pointCount).toBe(7);
		});

		it("has daily granularity", () => {
			const config = getChartConfig("7d");

			expect(config.granularity).toBe("daily");
		});

		it("has YYYY-MM-DD SQL date format", () => {
			const config = getChartConfig("7d");

			expect(config.sqlDateFormat).toBe("YYYY-MM-DD");
		});

		it("startDate matches getPeriodBoundaries currentStart", () => {
			const config = getChartConfig("7d");
			const { currentStart } = getPeriodBoundaries("7d");

			expect(config.startDate).toEqual(currentStart);
		});
	});

	describe("30d", () => {
		it("has pointCount of 30", () => {
			const config = getChartConfig("30d");

			expect(config.pointCount).toBe(30);
		});

		it("has daily granularity", () => {
			const config = getChartConfig("30d");

			expect(config.granularity).toBe("daily");
		});

		it("has YYYY-MM-DD SQL date format", () => {
			const config = getChartConfig("30d");

			expect(config.sqlDateFormat).toBe("YYYY-MM-DD");
		});

		it("startDate matches getPeriodBoundaries currentStart", () => {
			const config = getChartConfig("30d");
			const { currentStart } = getPeriodBoundaries("30d");

			expect(config.startDate).toEqual(currentStart);
		});
	});

	describe("month", () => {
		// Date is the 15th, so 15 days have elapsed in the month
		it("has pointCount of 15 (days elapsed in March)", () => {
			const config = getChartConfig("month");

			expect(config.pointCount).toBe(15);
		});

		it("has daily granularity", () => {
			const config = getChartConfig("month");

			expect(config.granularity).toBe("daily");
		});

		it("has YYYY-MM-DD SQL date format", () => {
			const config = getChartConfig("month");

			expect(config.sqlDateFormat).toBe("YYYY-MM-DD");
		});

		it("startDate matches getPeriodBoundaries currentStart", () => {
			const config = getChartConfig("month");
			const { currentStart } = getPeriodBoundaries("month");

			expect(config.startDate).toEqual(currentStart);
		});
	});

	describe("quarter", () => {
		it("has weekly granularity", () => {
			const config = getChartConfig("quarter");

			expect(config.granularity).toBe("weekly");
		});

		it("has IYYY-IW SQL date format", () => {
			const config = getChartConfig("quarter");

			expect(config.sqlDateFormat).toBe("IYYY-IW");
		});

		it("startDate matches getPeriodBoundaries currentStart", () => {
			const config = getChartConfig("quarter");
			const { currentStart } = getPeriodBoundaries("quarter");

			expect(config.startDate).toEqual(currentStart);
		});

		it("has a positive pointCount", () => {
			const config = getChartConfig("quarter");

			expect(config.pointCount).toBeGreaterThan(0);
		});
	});

	describe("year", () => {
		// March is the 3rd month (month index 2 + 1 = 3)
		it("has pointCount of 3 (March is the 3rd month)", () => {
			const config = getChartConfig("year");

			expect(config.pointCount).toBe(3);
		});

		it("has monthly granularity", () => {
			const config = getChartConfig("year");

			expect(config.granularity).toBe("monthly");
		});

		it("has YYYY-MM SQL date format", () => {
			const config = getChartConfig("year");

			expect(config.sqlDateFormat).toBe("YYYY-MM");
		});

		it("startDate matches getPeriodBoundaries currentStart", () => {
			const config = getChartConfig("year");
			const { currentStart } = getPeriodBoundaries("year");

			expect(config.startDate).toEqual(currentStart);
		});
	});
});

// ---------------------------------------------------------------------------
// getChartConfig — edge cases
// ---------------------------------------------------------------------------

describe("getChartConfig edge cases", () => {
	describe("January 1 (2026-01-01T00:00:01Z)", () => {
		beforeEach(() => {
			vi.setSystemTime(new Date("2026-01-01T00:00:01Z"));
		});

		it("month: pointCount is 1 (day 1 of the month)", () => {
			const config = getChartConfig("month");

			expect(config.pointCount).toBe(1);
		});

		it("year: pointCount is 1 (January is the 1st month)", () => {
			const config = getChartConfig("year");

			expect(config.pointCount).toBe(1);
		});
	});

	describe("Last day of month — December 31 (2026-12-31T23:59:00Z)", () => {
		beforeEach(() => {
			vi.setSystemTime(new Date("2026-12-31T23:59:00Z"));
		});

		it("month: pointCount is 31 (day 31 of the month)", () => {
			const config = getChartConfig("month");

			expect(config.pointCount).toBe(31);
		});
	});

	describe("Last day of a 28-day month — February 28 non-leap (2026-02-28T12:00:00Z)", () => {
		beforeEach(() => {
			vi.setSystemTime(new Date("2026-02-28T12:00:00Z"));
		});

		it("month: pointCount is 28 (day 28 of February)", () => {
			const config = getChartConfig("month");

			expect(config.pointCount).toBe(28);
		});
	});

	describe("Last day of a 29-day month — February 29 leap year (2028-02-29T12:00:00Z)", () => {
		beforeEach(() => {
			vi.setSystemTime(new Date("2028-02-29T12:00:00Z"));
		});

		it("month: pointCount is 29 (day 29 of February in leap year)", () => {
			const config = getChartConfig("month");

			expect(config.pointCount).toBe(29);
		});
	});
});
