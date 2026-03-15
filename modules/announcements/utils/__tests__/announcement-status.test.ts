import { describe, expect, it } from "vitest";
import { ANNOUNCEMENT_STATUS_LABELS, ANNOUNCEMENT_STATUS_COLORS } from "../announcement-status";

describe("ANNOUNCEMENT_STATUS_LABELS", () => {
	it("has labels for all 4 statuses", () => {
		expect(Object.keys(ANNOUNCEMENT_STATUS_LABELS)).toHaveLength(4);
		expect(ANNOUNCEMENT_STATUS_LABELS.active).toBe("Active");
		expect(ANNOUNCEMENT_STATUS_LABELS.scheduled).toBe("Programmée");
		expect(ANNOUNCEMENT_STATUS_LABELS.expired).toBe("Expirée");
		expect(ANNOUNCEMENT_STATUS_LABELS.inactive).toBe("Inactive");
	});
});

describe("ANNOUNCEMENT_STATUS_COLORS", () => {
	it("has color classes for all 4 statuses", () => {
		expect(Object.keys(ANNOUNCEMENT_STATUS_COLORS)).toHaveLength(4);
	});

	it("returns valid Tailwind class strings", () => {
		for (const color of Object.values(ANNOUNCEMENT_STATUS_COLORS)) {
			expect(color).toMatch(/^bg-\w+/);
			expect(color).toContain("text-");
		}
	});

	it("maps correct colors per status", () => {
		expect(ANNOUNCEMENT_STATUS_COLORS.active).toContain("green");
		expect(ANNOUNCEMENT_STATUS_COLORS.scheduled).toContain("blue");
		expect(ANNOUNCEMENT_STATUS_COLORS.expired).toContain("gray");
		expect(ANNOUNCEMENT_STATUS_COLORS.inactive).toContain("amber");
	});
});
