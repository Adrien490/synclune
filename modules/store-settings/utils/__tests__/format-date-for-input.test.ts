import { describe, it, expect } from "vitest";

import { formatDateForInput } from "../format-date-for-input";

describe("formatDateForInput", () => {
	it("formats a Date in YYYY-MM-DDTHH:mm local format", () => {
		const date = new Date(2026, 5, 15, 14, 30, 0); // 15 juin 2026 14:30 local
		expect(formatDateForInput(date)).toBe("2026-06-15T14:30");
	});

	it("pads single-digit month, day, hours, minutes with zero", () => {
		const date = new Date(2026, 0, 3, 7, 5, 0); // 3 jan 2026 07:05 local
		expect(formatDateForInput(date)).toBe("2026-01-03T07:05");
	});

	it("accepts an ISO string and returns local format", () => {
		const result = formatDateForInput("2026-06-15T14:30:00.000Z");
		expect(result).toMatch(/^2026-06-1[45]T\d{2}:\d{2}$/);
	});

	it("returns empty string for null", () => {
		expect(formatDateForInput(null)).toBe("");
	});

	it("returns empty string for undefined", () => {
		expect(formatDateForInput(undefined)).toBe("");
	});

	it("returns empty string for invalid date string", () => {
		expect(formatDateForInput("not-a-date")).toBe("");
	});
});
