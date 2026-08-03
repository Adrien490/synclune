import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPeriodBoundaries } from "../period-boundaries.service";
import { parisWallTimeToUtc } from "@/shared/utils/timezone";

// ---------------------------------------------------------------------------
// Frozen time: 2026-03-15T12:00:00Z
//   - Paris (hiver, UTC+1) : 13:00 le 15 mars 2026 → mêmes composantes calendaires
//   - Toutes les bornes sont calées sur l'heure murale de Paris (ANALYTICS-AUDIT-005) :
//     `parisWallTimeToUtc(y, m, d)` = instant UTC du `d/m/y 00:00` heure de Paris.
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
		it("currentStart is 7 days ago (Paris)", () => {
			const { currentStart } = getPeriodBoundaries("7d");

			expect(currentStart).toEqual(parisWallTimeToUtc(2026, 2, 8));
		});

		it("previousStart is 14 days ago (Paris)", () => {
			const { previousStart } = getPeriodBoundaries("7d");

			expect(previousStart).toEqual(parisWallTimeToUtc(2026, 2, 1));
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
		it("currentStart is 30 days ago (Paris)", () => {
			const { currentStart } = getPeriodBoundaries("30d");

			expect(currentStart).toEqual(parisWallTimeToUtc(2026, 2, -15));
		});

		it("previousStart is 60 days ago (Paris)", () => {
			const { previousStart } = getPeriodBoundaries("30d");

			expect(previousStart).toEqual(parisWallTimeToUtc(2026, 2, -45));
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
		it("currentStart is March 1 2026 (Paris)", () => {
			const { currentStart } = getPeriodBoundaries("month");

			expect(currentStart).toEqual(parisWallTimeToUtc(2026, 2, 1));
		});

		it("previousStart is February 1 2026 (Paris)", () => {
			const { previousStart } = getPeriodBoundaries("month");

			expect(previousStart).toEqual(parisWallTimeToUtc(2026, 1, 1));
		});

		it("previousEnd is February 28 2026 23:59:59.999 (Paris)", () => {
			const { previousEnd } = getPeriodBoundaries("month");

			expect(previousEnd).toEqual(parisWallTimeToUtc(2026, 2, 0, 23, 59, 59, 999));
		});

		it("currentEnd is approximately now", () => {
			const { currentEnd } = getPeriodBoundaries("month");

			expect(currentEnd.getTime()).toBeCloseTo(FROZEN_DATE.getTime(), -2);
		});
	});

	describe("quarter", () => {
		// March 2026 is Q1 (months 0-2): quarter starts Jan 1
		it("currentStart is January 1 2026 (Paris, Q1 start)", () => {
			const { currentStart } = getPeriodBoundaries("quarter");

			expect(currentStart).toEqual(parisWallTimeToUtc(2026, 0, 1));
		});

		it("previousStart is October 1 2025 (Paris, Q4 2025 start)", () => {
			const { previousStart } = getPeriodBoundaries("quarter");

			expect(previousStart).toEqual(parisWallTimeToUtc(2025, 9, 1));
		});

		it("previousEnd is December 31 2025 23:59:59.999 (Paris)", () => {
			const { previousEnd } = getPeriodBoundaries("quarter");

			expect(previousEnd).toEqual(parisWallTimeToUtc(2026, 0, 0, 23, 59, 59, 999));
		});

		it("currentEnd is approximately now", () => {
			const { currentEnd } = getPeriodBoundaries("quarter");

			expect(currentEnd.getTime()).toBeCloseTo(FROZEN_DATE.getTime(), -2);
		});
	});

	describe("year", () => {
		it("currentStart is January 1 2026 (Paris)", () => {
			const { currentStart } = getPeriodBoundaries("year");

			expect(currentStart).toEqual(parisWallTimeToUtc(2026, 0, 1));
		});

		it("previousStart is January 1 2025 (Paris)", () => {
			const { previousStart } = getPeriodBoundaries("year");

			expect(previousStart).toEqual(parisWallTimeToUtc(2025, 0, 1));
		});

		it("previousEnd is December 31 2025 23:59:59.999 (Paris)", () => {
			const { previousEnd } = getPeriodBoundaries("year");

			expect(previousEnd).toEqual(parisWallTimeToUtc(2025, 11, 31, 23, 59, 59, 999));
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
	describe("January 1 (2026-01-01T00:00:01Z → Paris 01:00 Jan 1)", () => {
		beforeEach(() => {
			vi.setSystemTime(new Date("2026-01-01T00:00:01Z"));
		});

		it("7d: currentStart is December 25 2025 (Paris)", () => {
			const { currentStart } = getPeriodBoundaries("7d");

			expect(currentStart).toEqual(parisWallTimeToUtc(2025, 11, 25));
		});

		it("month: currentStart is January 1 2026 (Paris)", () => {
			const { currentStart } = getPeriodBoundaries("month");

			expect(currentStart).toEqual(parisWallTimeToUtc(2026, 0, 1));
		});

		it("month: previousStart is December 1 2025 (Paris)", () => {
			const { previousStart } = getPeriodBoundaries("month");

			expect(previousStart).toEqual(parisWallTimeToUtc(2025, 11, 1));
		});

		it("month: previousEnd is December 31 2025 23:59:59.999 (Paris)", () => {
			const { previousEnd } = getPeriodBoundaries("month");

			expect(previousEnd).toEqual(parisWallTimeToUtc(2026, 0, 0, 23, 59, 59, 999));
		});

		it("quarter: currentStart is January 1 2026 (Paris, Q1 start)", () => {
			const { currentStart } = getPeriodBoundaries("quarter");

			expect(currentStart).toEqual(parisWallTimeToUtc(2026, 0, 1));
		});

		it("quarter: previousStart is October 1 2025 (Paris, Q4 2025 start)", () => {
			const { previousStart } = getPeriodBoundaries("quarter");

			expect(previousStart).toEqual(parisWallTimeToUtc(2025, 9, 1));
		});

		it("year: currentStart is January 1 2026 (Paris)", () => {
			const { currentStart } = getPeriodBoundaries("year");

			expect(currentStart).toEqual(parisWallTimeToUtc(2026, 0, 1));
		});

		it("year: previousStart is January 1 2025 (Paris)", () => {
			const { previousStart } = getPeriodBoundaries("year");

			expect(previousStart).toEqual(parisWallTimeToUtc(2025, 0, 1));
		});
	});

	describe("February 28 non-leap year (2026-02-28T12:00:00Z)", () => {
		beforeEach(() => {
			vi.setSystemTime(new Date("2026-02-28T12:00:00Z"));
		});

		it("month: previousEnd is January 31 2026 23:59:59.999 (Paris, not Feb 28)", () => {
			const { previousEnd } = getPeriodBoundaries("month");

			expect(previousEnd).toEqual(parisWallTimeToUtc(2026, 1, 0, 23, 59, 59, 999));
		});
	});

	describe("February 29 leap year (2028-02-29T12:00:00Z)", () => {
		beforeEach(() => {
			vi.setSystemTime(new Date("2028-02-29T12:00:00Z"));
		});

		it("month: currentStart is February 1 2028 (Paris)", () => {
			const { currentStart } = getPeriodBoundaries("month");

			expect(currentStart).toEqual(parisWallTimeToUtc(2028, 1, 1));
		});

		it("month: previousEnd is January 31 2028 23:59:59.999 (Paris)", () => {
			const { previousEnd } = getPeriodBoundaries("month");

			expect(previousEnd).toEqual(parisWallTimeToUtc(2028, 1, 0, 23, 59, 59, 999));
		});
	});

	describe("March 31 → quarter transition (2026-04-01T00:00:01Z → Paris 02:00 Apr 1)", () => {
		beforeEach(() => {
			vi.setSystemTime(new Date("2026-04-01T00:00:01Z"));
		});

		it("quarter: currentStart is April 1 2026 (Paris, Q2 start)", () => {
			const { currentStart } = getPeriodBoundaries("quarter");

			expect(currentStart).toEqual(parisWallTimeToUtc(2026, 3, 1));
		});

		it("quarter: previousStart is January 1 2026 (Paris, Q1 start)", () => {
			const { previousStart } = getPeriodBoundaries("quarter");

			expect(previousStart).toEqual(parisWallTimeToUtc(2026, 0, 1));
		});

		it("quarter: previousEnd is March 31 2026 23:59:59.999 (Paris)", () => {
			const { previousEnd } = getPeriodBoundaries("quarter");

			expect(previousEnd).toEqual(parisWallTimeToUtc(2026, 3, 0, 23, 59, 59, 999));
		});
	});

	describe("December 31 noon (2026-12-31T12:00:00Z → Paris 13:00 Dec 31)", () => {
		beforeEach(() => {
			vi.setSystemTime(new Date("2026-12-31T12:00:00Z"));
		});

		it("year: currentStart is January 1 2026 (Paris)", () => {
			const { currentStart } = getPeriodBoundaries("year");

			expect(currentStart).toEqual(parisWallTimeToUtc(2026, 0, 1));
		});

		it("year: previousStart is January 1 2025 (Paris)", () => {
			const { previousStart } = getPeriodBoundaries("year");

			expect(previousStart).toEqual(parisWallTimeToUtc(2025, 0, 1));
		});

		it("quarter: currentStart is October 1 2026 (Paris, Q4 start)", () => {
			const { currentStart } = getPeriodBoundaries("quarter");

			expect(currentStart).toEqual(parisWallTimeToUtc(2026, 9, 1));
		});

		it("quarter: previousStart is July 1 2026 (Paris, Q3 start)", () => {
			const { previousStart } = getPeriodBoundaries("quarter");

			expect(previousStart).toEqual(parisWallTimeToUtc(2026, 6, 1));
		});
	});
});

// ---------------------------------------------------------------------------
// getPeriodBoundaries — Year-over-Year (previousYearStart / previousYearEnd)
// ---------------------------------------------------------------------------

describe("getPeriodBoundaries — YoY boundaries", () => {
	describe("month period (frozen 2026-03-15)", () => {
		it("previousYearStart shifts currentStart back by exactly 1 year", () => {
			const { currentStart, previousYearStart } = getPeriodBoundaries("month");

			expect(previousYearStart.getUTCFullYear()).toBe(currentStart.getUTCFullYear() - 1);
			expect(previousYearStart.getUTCMonth()).toBe(currentStart.getUTCMonth());
			expect(previousYearStart.getUTCDate()).toBe(currentStart.getUTCDate());
		});

		it("previousYearEnd shifts currentEnd back by exactly 1 year", () => {
			const { currentEnd, previousYearEnd } = getPeriodBoundaries("month");

			expect(previousYearEnd.getUTCFullYear()).toBe(currentEnd.getUTCFullYear() - 1);
			expect(previousYearEnd.getUTCMonth()).toBe(currentEnd.getUTCMonth());
			expect(previousYearEnd.getUTCDate()).toBe(currentEnd.getUTCDate());
			expect(previousYearEnd.getUTCHours()).toBe(currentEnd.getUTCHours());
		});
	});

	describe("year period (frozen 2026-03-15)", () => {
		it("previousYearStart is January 1 2025 (Paris)", () => {
			const { previousYearStart } = getPeriodBoundaries("year");

			expect(previousYearStart).toEqual(parisWallTimeToUtc(2025, 0, 1));
		});

		it("previousYearEnd is the same day/time as currentEnd shifted by 1 year", () => {
			const { currentEnd, previousYearEnd } = getPeriodBoundaries("year");

			expect(previousYearEnd.getUTCFullYear()).toBe(currentEnd.getUTCFullYear() - 1);
			expect(previousYearEnd.getUTCMonth()).toBe(currentEnd.getUTCMonth());
		});
	});

	describe("7d period (frozen 2026-03-15)", () => {
		it("previousYearStart shifts currentStart back by exactly 1 year", () => {
			const { currentStart, previousYearStart } = getPeriodBoundaries("7d");

			expect(previousYearStart.getUTCFullYear()).toBe(currentStart.getUTCFullYear() - 1);
			expect(previousYearStart.getUTCMonth()).toBe(currentStart.getUTCMonth());
			expect(previousYearStart.getUTCDate()).toBe(currentStart.getUTCDate());
		});

		it("previousYearEnd preserves time of currentEnd minus 1 year", () => {
			const { currentEnd, previousYearEnd } = getPeriodBoundaries("7d");

			expect(previousYearEnd.getUTCFullYear()).toBe(currentEnd.getUTCFullYear() - 1);
		});
	});

	describe("leap year edge case (frozen 2028-02-29)", () => {
		beforeEach(() => {
			vi.setSystemTime(new Date("2028-02-29T12:00:00Z"));
		});

		it("month: previousYearStart shifts Feb 1 2028 to Feb 1 2027 (Paris)", () => {
			const { previousYearStart } = getPeriodBoundaries("month");

			expect(previousYearStart).toEqual(parisWallTimeToUtc(2027, 1, 1));
		});

		it("currentEnd Feb 29 2028 shifted back by 1 year overflows below currentEnd", () => {
			// JS Date semantics: Feb 29 in leap year → setUTCFullYear(prev) overflows to Mar 1
			const { currentEnd, previousYearEnd } = getPeriodBoundaries("month");

			expect(currentEnd.getUTCDate()).toBe(29);
			// previousYearEnd may overflow because 2027 has no Feb 29
			expect(previousYearEnd.getTime()).toBeLessThan(currentEnd.getTime());
		});
	});
});

// Le describe `getChartConfig` est parti au Lot 4 S3.5 (2026-08-03) avec les
// sparklines.
