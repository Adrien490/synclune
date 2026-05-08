import { describe, it, expect } from "vitest";
import { URSSAF_ALERT_THRESHOLD_DAYS, getNextUrssafDeadline } from "../urssaf-deadline.service";

describe("getNextUrssafDeadline", () => {
	it("returns the 30 April deadline (T1) when called early March 2026", () => {
		const deadline = getNextUrssafDeadline(new Date("2026-03-01T12:00:00Z"));

		expect(deadline.quarterLabel).toBe("T1 2026");
		expect(deadline.date.getUTCMonth()).toBe(3);
		expect(deadline.date.getUTCDate()).toBe(30);
		expect(deadline.daysUntil).toBeGreaterThan(0);
	});

	it("returns the 31 July deadline (T2) when called mid-May", () => {
		const deadline = getNextUrssafDeadline(new Date("2026-05-15T00:00:00Z"));

		expect(deadline.quarterLabel).toBe("T2 2026");
		expect(deadline.date.getUTCMonth()).toBe(6);
		expect(deadline.date.getUTCDate()).toBe(31);
	});

	it("returns the 31 January deadline (T4 of previous year) when called mid-December", () => {
		const deadline = getNextUrssafDeadline(new Date("2026-12-15T00:00:00Z"));

		expect(deadline.quarterLabel).toBe("T4 2026");
		expect(deadline.date.getUTCFullYear()).toBe(2027);
		expect(deadline.date.getUTCMonth()).toBe(0);
		expect(deadline.date.getUTCDate()).toBe(31);
	});

	it("returns the same-day deadline when called on the deadline itself", () => {
		const deadline = getNextUrssafDeadline(new Date("2026-04-30T08:00:00Z"));

		expect(deadline.quarterLabel).toBe("T1 2026");
		expect(deadline.daysUntil).toBe(0);
	});

	it("rolls over to the next deadline the day after", () => {
		const deadline = getNextUrssafDeadline(new Date("2026-05-01T00:00:00Z"));

		expect(deadline.quarterLabel).toBe("T2 2026");
	});

	it("computes daysUntil as a non-negative integer", () => {
		const deadline = getNextUrssafDeadline(new Date("2026-04-15T12:00:00Z"));

		expect(Number.isInteger(deadline.daysUntil)).toBe(true);
		expect(deadline.daysUntil).toBeGreaterThanOrEqual(0);
	});

	it("exposes the 15-day alert threshold", () => {
		expect(URSSAF_ALERT_THRESHOLD_DAYS).toBe(15);
	});
});
