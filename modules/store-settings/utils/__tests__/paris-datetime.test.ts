import { describe, it, expect } from "vitest";

import {
	formatParisDateForInput,
	formatParisDateTime,
	parseParisDateTimeLocal,
} from "../paris-datetime";

// ============================================================================
// parseParisDateTimeLocal — saisie datetime-local interprétée en Europe/Paris
// ============================================================================

describe("parseParisDateTimeLocal", () => {
	it("returns null for empty string", () => {
		expect(parseParisDateTimeLocal("")).toBeNull();
		expect(parseParisDateTimeLocal("   ")).toBeNull();
	});

	it("interprets a bare datetime-local as Europe/Paris in summer (CEST, UTC+2)", () => {
		// 10:00 heure de Paris l'été = 08:00 UTC.
		const result = parseParisDateTimeLocal("2026-07-01T10:00");
		expect(result?.toISOString()).toBe("2026-07-01T08:00:00.000Z");
	});

	it("interprets a bare datetime-local as Europe/Paris in winter (CET, UTC+1)", () => {
		// 10:00 heure de Paris l'hiver = 09:00 UTC.
		const result = parseParisDateTimeLocal("2026-12-01T10:00");
		expect(result?.toISOString()).toBe("2026-12-01T09:00:00.000Z");
	});

	it("respects an explicit UTC designator (Z) without re-interpreting", () => {
		const result = parseParisDateTimeLocal("2026-07-01T10:00:00Z");
		expect(result?.toISOString()).toBe("2026-07-01T10:00:00.000Z");
	});

	it("respects an explicit numeric offset", () => {
		const result = parseParisDateTimeLocal("2026-07-01T10:00:00+02:00");
		expect(result?.toISOString()).toBe("2026-07-01T08:00:00.000Z");
	});

	it("returns an invalid Date for unparseable non-empty input (rejected downstream)", () => {
		const result = parseParisDateTimeLocal("not-a-date");
		expect(result).toBeInstanceOf(Date);
		expect(Number.isNaN(result?.getTime() ?? NaN)).toBe(true);
	});
});

// ============================================================================
// formatParisDateForInput — instant UTC → heure murale Paris (prefill input)
// ============================================================================

describe("formatParisDateForInput", () => {
	it("formats a UTC instant as Paris wall-clock in summer", () => {
		expect(formatParisDateForInput(new Date("2026-07-01T08:00:00Z"))).toBe("2026-07-01T10:00");
	});

	it("formats a UTC instant as Paris wall-clock in winter", () => {
		expect(formatParisDateForInput(new Date("2026-12-01T09:00:00Z"))).toBe("2026-12-01T10:00");
	});

	it("returns empty string for null/undefined", () => {
		expect(formatParisDateForInput(null)).toBe("");
		expect(formatParisDateForInput(undefined)).toBe("");
	});

	it("returns empty string for an invalid date string", () => {
		expect(formatParisDateForInput("not-a-date")).toBe("");
	});

	it("round-trips parse → format for both DST seasons", () => {
		for (const wall of ["2026-07-01T10:00", "2026-12-01T10:00", "2026-03-15T23:30"]) {
			const utc = parseParisDateTimeLocal(wall);
			expect(formatParisDateForInput(utc)).toBe(wall);
		}
	});
});

// ============================================================================
// formatParisDateTime — affichage long FR ancré Paris
// ============================================================================

describe("formatParisDateTime", () => {
	it("renders the Paris wall-clock time, not UTC", () => {
		// 08:00 UTC = 10:00 Paris l'été.
		const result = formatParisDateTime(new Date("2026-07-01T08:00:00Z"));
		expect(result).toMatch(/juillet 2026/);
		expect(result).toMatch(/10:00/);
		expect(result).not.toMatch(/08:00/);
	});

	it("returns empty string for null", () => {
		expect(formatParisDateTime(null)).toBe("");
	});
});
