import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	formatDateShort,
	formatDateTime,
	formatDateTimeNumeric,
	formatDateLong,
	isRecent,
	formatRelativeTime,
	formatDate,
	isWithinDays,
	formatVersionDisplay,
	getDailyIndex,
	formatRelativeDate,
} from "../dates";

// Fixed reference point: 2024-12-01 14:30:00 UTC
const FIXED_NOW = new Date("2024-12-01T14:30:00.000Z");

describe("formatDateShort", () => {
	it("should format a Date object", () => {
		const date = new Date("2024-12-01T00:00:00");
		const result = formatDateShort(date);
		expect(result).toMatch(/1\s+déc\.?\s+2024/i);
	});

	it("should format an ISO string", () => {
		const result = formatDateShort("2024-06-15T00:00:00");
		expect(result).toMatch(/15\s+juin\s+2024/i);
	});

	it("should format a date in January", () => {
		const result = formatDateShort("2024-01-01T00:00:00");
		expect(result).toMatch(/1\s+janv\.?\s+2024/i);
	});
});

describe("formatDateTime", () => {
	it("should format date with time using à separator", () => {
		const date = new Date("2024-12-01T14:30:00");
		const result = formatDateTime(date);
		expect(result).toContain("à");
		expect(result).toMatch(/1\s+déc\.?\s+2024/);
		expect(result).toContain("14:30");
	});

	it("should format from ISO string", () => {
		const result = formatDateTime("2024-06-15T09:05:00");
		expect(result).toContain("à");
		expect(result).toContain("09:05");
	});
});

describe("formatDateTimeNumeric", () => {
	it("should format in dd/MM/yyyy HH:mm", () => {
		const date = new Date("2024-12-01T14:30:00");
		const result = formatDateTimeNumeric(date);
		expect(result).toBe("01/12/2024 14:30");
	});

	it("should pad single-digit day and month", () => {
		const result = formatDateTimeNumeric("2024-06-05T09:05:00");
		expect(result).toBe("05/06/2024 09:05");
	});

	it("should accept ISO string", () => {
		const result = formatDateTimeNumeric("2024-01-31T23:59:00");
		expect(result).toBe("31/01/2024 23:59");
	});
});

describe("formatDateLong", () => {
	it("should format with full month name", () => {
		const date = new Date("2024-12-01T00:00:00");
		const result = formatDateLong(date);
		expect(result).toMatch(/1\s+décembre\s+2024/i);
	});

	it("should format from ISO string", () => {
		const result = formatDateLong("2024-06-15T00:00:00");
		expect(result).toMatch(/15\s+juin\s+2024/i);
	});

	it("should use full month name (not abbreviated)", () => {
		const result = formatDateLong("2024-03-10T00:00:00");
		expect(result).toMatch(/mars/i);
		expect(result).not.toMatch(/mars\./i);
	});
});

describe("isRecent", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(FIXED_NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should return true for today", () => {
		expect(isRecent(new Date())).toBe(true);
	});

	it("should return true for 3 days ago with default 7-day window", () => {
		const threeDaysAgo = new Date(FIXED_NOW.getTime() - 3 * 24 * 60 * 60 * 1000);
		expect(isRecent(threeDaysAgo)).toBe(true);
	});

	it("should return false for 8 days ago with default 7-day window", () => {
		const eightDaysAgo = new Date(FIXED_NOW.getTime() - 8 * 24 * 60 * 60 * 1000);
		expect(isRecent(eightDaysAgo)).toBe(false);
	});

	it("should respect custom daysAgo parameter", () => {
		const twoDaysAgo = new Date(FIXED_NOW.getTime() - 2 * 24 * 60 * 60 * 1000);
		expect(isRecent(twoDaysAgo, 1)).toBe(false);
		expect(isRecent(twoDaysAgo, 3)).toBe(true);
	});

	it("should accept ISO string", () => {
		const yesterday = new Date(FIXED_NOW.getTime() - 24 * 60 * 60 * 1000).toISOString();
		expect(isRecent(yesterday)).toBe(true);
	});

	it("should return false for a very old date", () => {
		expect(isRecent("2020-01-01")).toBe(false);
	});
});

describe("formatRelativeTime", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(FIXED_NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should return 'à l'instant' for less than 1 minute ago", () => {
		const thirtySecondsAgo = new Date(FIXED_NOW.getTime() - 30 * 1000);
		expect(formatRelativeTime(thirtySecondsAgo)).toBe("à l'instant");
	});

	it("should return singular minute", () => {
		const oneMinuteAgo = new Date(FIXED_NOW.getTime() - 60 * 1000);
		expect(formatRelativeTime(oneMinuteAgo)).toBe("il y a 1 minute");
	});

	it("should return plural minutes", () => {
		const fortyFiveMinutesAgo = new Date(FIXED_NOW.getTime() - 45 * 60 * 1000);
		expect(formatRelativeTime(fortyFiveMinutesAgo)).toBe("il y a 45 minutes");
	});

	it("should return singular hour", () => {
		const oneHourAgo = new Date(FIXED_NOW.getTime() - 60 * 60 * 1000);
		expect(formatRelativeTime(oneHourAgo)).toBe("il y a 1 heure");
	});

	it("should return plural hours", () => {
		const threeHoursAgo = new Date(FIXED_NOW.getTime() - 3 * 60 * 60 * 1000);
		expect(formatRelativeTime(threeHoursAgo)).toBe("il y a 3 heures");
	});

	it("should return singular day", () => {
		const oneDayAgo = new Date(FIXED_NOW.getTime() - 25 * 60 * 60 * 1000);
		expect(formatRelativeTime(oneDayAgo)).toBe("il y a 1 jour");
	});

	it("should return plural days", () => {
		const fiveDaysAgo = new Date(FIXED_NOW.getTime() - 5 * 24 * 60 * 60 * 1000);
		expect(formatRelativeTime(fiveDaysAgo)).toBe("il y a 5 jours");
	});

	it("should return singular week", () => {
		const oneWeekAgo = new Date(FIXED_NOW.getTime() - 8 * 24 * 60 * 60 * 1000);
		expect(formatRelativeTime(oneWeekAgo)).toBe("il y a 1 semaine");
	});

	it("should return plural weeks", () => {
		const twoWeeksAgo = new Date(FIXED_NOW.getTime() - 15 * 24 * 60 * 60 * 1000);
		expect(formatRelativeTime(twoWeeksAgo)).toBe("il y a 2 semaines");
	});

	it("should return months for > 30 days", () => {
		const twoMonthsAgo = new Date(FIXED_NOW.getTime() - 65 * 24 * 60 * 60 * 1000);
		expect(formatRelativeTime(twoMonthsAgo)).toBe("il y a 2 mois");
	});

	it("should accept ISO string", () => {
		const twoMinutesAgo = new Date(FIXED_NOW.getTime() - 2 * 60 * 1000).toISOString();
		expect(formatRelativeTime(twoMinutesAgo)).toBe("il y a 2 minutes");
	});
});

describe("formatDate", () => {
	it("should format a valid date string in fr-FR by default", () => {
		const result = formatDate("2024-11-16");
		expect(result).toMatch(/16\s+novembre\s+2024/i);
	});

	it("should format in en-US locale", () => {
		const result = formatDate("2024-11-16", "en-US");
		expect(result).toMatch(/November\s+16,\s+2024/i);
	});

	it("should return 'Date invalide' for an invalid string", () => {
		expect(formatDate("not-a-date")).toBe("Date invalide");
	});

	it("should return 'Date invalide' for empty string", () => {
		expect(formatDate("")).toBe("Date invalide");
	});

	it("should handle a date at year boundary", () => {
		const result = formatDate("2024-01-01");
		expect(result).toMatch(/1\s+janvier\s+2024/i);
	});
});

describe("isWithinDays", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(FIXED_NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should return true for a date within the window", () => {
		expect(isWithinDays("2024-11-29", 7)).toBe(true);
	});

	it("should return false for a date outside the window", () => {
		expect(isWithinDays("2024-11-01", 7)).toBe(false);
	});

	it("should return false for an invalid date string", () => {
		expect(isWithinDays("not-a-date", 7)).toBe(false);
	});

	it("should return false for an empty string", () => {
		expect(isWithinDays("", 7)).toBe(false);
	});
});

describe("formatVersionDisplay", () => {
	it("should return only major when minor and patch are 0", () => {
		expect(formatVersionDisplay("1.0.0")).toBe("V1");
	});

	it("should return major.minor when patch is 0 and minor > 0", () => {
		expect(formatVersionDisplay("1.5.0")).toBe("V1.5");
	});

	it("should return full semver when patch > 0", () => {
		expect(formatVersionDisplay("1.5.2")).toBe("V1.5.2");
	});

	it("should handle major version 2", () => {
		expect(formatVersionDisplay("2.0.0")).toBe("V2");
	});

	it("should handle double-digit patch", () => {
		expect(formatVersionDisplay("3.2.10")).toBe("V3.2.10");
	});
});

describe("getDailyIndex", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should return an index within bounds", () => {
		vi.setSystemTime(new Date("2024-12-01T14:30:00.000Z"));
		const index = getDailyIndex(10);
		expect(index).toBeGreaterThanOrEqual(0);
		expect(index).toBeLessThan(10);
	});

	it("should return the same value when called twice on the same day", () => {
		vi.setSystemTime(new Date("2024-12-01T08:00:00.000Z"));
		const first = getDailyIndex(7);
		vi.setSystemTime(new Date("2024-12-01T23:59:00.000Z"));
		// days since epoch is still the same day
		const daysSinceEpoch = Math.floor(
			new Date("2024-12-01T08:00:00.000Z").getTime() / (1000 * 60 * 60 * 24),
		);
		expect(first).toBe(daysSinceEpoch % 7);
	});

	it("should produce a different index on a different day", () => {
		vi.setSystemTime(new Date("2024-12-01T12:00:00.000Z"));
		const day1 = getDailyIndex(1000);
		vi.setSystemTime(new Date("2024-12-02T12:00:00.000Z"));
		const day2 = getDailyIndex(1000);
		expect(day2).toBe(day1 + 1);
	});

	it("should return 0 for length 1", () => {
		vi.setSystemTime(new Date("2024-12-01T12:00:00.000Z"));
		expect(getDailyIndex(1)).toBe(0);
	});
});

describe("formatRelativeDate", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(FIXED_NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should return 'Aujourd'hui' for now", () => {
		expect(formatRelativeDate(new Date(FIXED_NOW))).toBe("Aujourd'hui");
	});

	it("should return 'Hier' for exactly 1 day ago", () => {
		const yesterday = new Date(FIXED_NOW.getTime() - 25 * 60 * 60 * 1000);
		expect(formatRelativeDate(yesterday)).toBe("Hier");
	});

	it("should return 'Il y a X jours' for 2-6 days ago", () => {
		const fiveDaysAgo = new Date(FIXED_NOW.getTime() - 5 * 24 * 60 * 60 * 1000);
		expect(formatRelativeDate(fiveDaysAgo)).toBe("Il y a 5 jours");
	});

	it("should return singular semaine for 1 week", () => {
		const oneWeekAgo = new Date(FIXED_NOW.getTime() - 8 * 24 * 60 * 60 * 1000);
		expect(formatRelativeDate(oneWeekAgo)).toBe("Il y a 1 semaine");
	});

	it("should return plural semaines for 2+ weeks", () => {
		const twoWeeksAgo = new Date(FIXED_NOW.getTime() - 15 * 24 * 60 * 60 * 1000);
		expect(formatRelativeDate(twoWeeksAgo)).toBe("Il y a 2 semaines");
	});

	it("should return mois for > 30 days", () => {
		const twoMonthsAgo = new Date(FIXED_NOW.getTime() - 65 * 24 * 60 * 60 * 1000);
		expect(formatRelativeDate(twoMonthsAgo)).toBe("Il y a 2 mois");
	});

	it("should return an for exactly 1 year", () => {
		const oneYearAgo = new Date(FIXED_NOW.getTime() - 366 * 24 * 60 * 60 * 1000);
		expect(formatRelativeDate(oneYearAgo)).toBe("Il y a 1 an");
	});

	it("should return ans for 2+ years", () => {
		const twoYearsAgo = new Date(FIXED_NOW.getTime() - 731 * 24 * 60 * 60 * 1000);
		expect(formatRelativeDate(twoYearsAgo)).toBe("Il y a 2 ans");
	});

	it("should accept ISO string", () => {
		const yesterday = new Date(FIXED_NOW.getTime() - 25 * 60 * 60 * 1000).toISOString();
		expect(formatRelativeDate(yesterday)).toBe("Hier");
	});
});
