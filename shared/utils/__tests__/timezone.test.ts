import { describe, it, expect } from "vitest";

import { APP_TIME_ZONE, getParisDateParts, parisDateKey, parisWallTimeToUtc } from "../timezone";

describe("timezone helpers (Europe/Paris)", () => {
	it("uses Europe/Paris as the app time zone", () => {
		expect(APP_TIME_ZONE).toBe("Europe/Paris");
	});

	describe("parisWallTimeToUtc", () => {
		it("maps a winter (UTC+1) wall time to the correct UTC instant", () => {
			// 1er mars 2026 00:00 Paris = 2026-02-28T23:00:00Z (heure d'hiver).
			expect(parisWallTimeToUtc(2026, 2, 1).toISOString()).toBe("2026-02-28T23:00:00.000Z");
		});

		it("maps a summer (UTC+2) wall time to the correct UTC instant", () => {
			// 1er juillet 2026 00:00 Paris = 2026-06-30T22:00:00Z (heure d'été).
			expect(parisWallTimeToUtc(2026, 6, 1).toISOString()).toBe("2026-06-30T22:00:00.000Z");
		});

		it("maps the start of the year to the previous-day UTC instant (winter)", () => {
			// 1er janvier 2026 00:00 Paris = 2025-12-31T23:00:00Z.
			expect(parisWallTimeToUtc(2026, 0, 1).toISOString()).toBe("2025-12-31T23:00:00.000Z");
		});

		it("preserves sub-day components (end-of-month boundary)", () => {
			// 31 janvier 2026 23:59:59.999 Paris = 2026-01-31T22:59:59.999Z.
			expect(parisWallTimeToUtc(2026, 1, 0, 23, 59, 59, 999).toISOString()).toBe(
				"2026-01-31T22:59:59.999Z",
			);
		});

		it("normalizes negative day offsets across month boundaries", () => {
			// 8 jours avant le 1er mars 2026 (Paris) = 21 février 2026 00:00 Paris.
			expect(parisWallTimeToUtc(2026, 2, 1 - 8).toISOString()).toBe(
				parisWallTimeToUtc(2026, 1, 21).toISOString(),
			);
		});
	});

	describe("getParisDateParts", () => {
		it("returns Paris calendar parts (month is 0-indexed)", () => {
			// 2026-12-31T23:30:00Z = 1er janvier 2027 00:30 à Paris (hiver +1).
			const parts = getParisDateParts(new Date("2026-12-31T23:30:00Z"));
			expect(parts).toEqual({ year: 2027, month: 0, day: 1 });
		});

		it("returns the same calendar day at noon UTC", () => {
			const parts = getParisDateParts(new Date("2026-03-15T12:00:00Z"));
			expect(parts).toEqual({ year: 2026, month: 2, day: 15 });
		});
	});

	describe("parisDateKey", () => {
		it("rolls to the next day when the instant is past midnight Paris (summer)", () => {
			// 2026-05-31T22:30:00Z = 1er juin 2026 00:30 Paris (été +2).
			expect(parisDateKey(new Date("2026-05-31T22:30:00Z"))).toBe("2026-06-01");
		});

		it("stays on the same day before midnight Paris", () => {
			// 2026-05-31T21:30:00Z = 31 mai 2026 23:30 Paris.
			expect(parisDateKey(new Date("2026-05-31T21:30:00Z"))).toBe("2026-05-31");
		});

		it("round-trips with parisWallTimeToUtc at day start", () => {
			expect(parisDateKey(parisWallTimeToUtc(2026, 6, 1))).toBe("2026-07-01");
			expect(parisDateKey(parisWallTimeToUtc(2026, 0, 1))).toBe("2026-01-01");
		});
	});
});
