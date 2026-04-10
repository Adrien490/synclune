import { describe, it, expect } from "vitest";
import { formatStatusFilter } from "../format-status-filter";

describe("formatStatusFilter", () => {
	it("returns active label for 'true' value", () => {
		expect(formatStatusFilter("true")).toEqual({
			label: "Statut",
			displayValue: "Actifs",
		});
	});

	it("returns inactive label for 'false' value", () => {
		expect(formatStatusFilter("false")).toEqual({
			label: "Statut",
			displayValue: "Inactifs",
		});
	});

	it("returns inactive label for any non-'true' value", () => {
		expect(formatStatusFilter("other")).toEqual({
			label: "Statut",
			displayValue: "Inactifs",
		});
	});

	it("uses custom active label", () => {
		expect(formatStatusFilter("true", "Publiés")).toEqual({
			label: "Statut",
			displayValue: "Publiés",
		});
	});

	it("uses custom inactive label", () => {
		expect(formatStatusFilter("false", "Actifs", "Archivés")).toEqual({
			label: "Statut",
			displayValue: "Archivés",
		});
	});

	it("uses both custom labels", () => {
		expect(formatStatusFilter("true", "En ligne", "Hors ligne")).toEqual({
			label: "Statut",
			displayValue: "En ligne",
		});
	});

	it("returns inactive label for empty string value", () => {
		expect(formatStatusFilter("")).toEqual({
			label: "Statut",
			displayValue: "Inactifs",
		});
	});

	it("returns inactive label for '1' (not 'true')", () => {
		expect(formatStatusFilter("1")).toEqual({
			label: "Statut",
			displayValue: "Inactifs",
		});
	});

	it("always returns fixed 'Statut' label regardless of value", () => {
		expect(formatStatusFilter("true").label).toBe("Statut");
		expect(formatStatusFilter("false").label).toBe("Statut");
		expect(formatStatusFilter("anything").label).toBe("Statut");
	});

	it("custom active label only — inactive label uses default", () => {
		expect(formatStatusFilter("false", "Publiés")).toEqual({
			label: "Statut",
			displayValue: "Inactifs",
		});
	});
});
