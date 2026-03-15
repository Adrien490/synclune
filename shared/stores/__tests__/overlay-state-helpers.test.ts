import { describe, it, expect } from "vitest";
import {
	openEntry,
	closeEntry,
	toggleEntry,
	clearEntry,
	isEntryOpen,
	getEntryData,
} from "../overlay-state-helpers";

describe("overlay-state-helpers", () => {
	// ============================================================================
	// openEntry
	// ============================================================================

	describe("openEntry", () => {
		it("creates entry with isOpen:true without data", () => {
			const result = openEntry({}, "dialog-1");
			expect(result["dialog-1"]).toEqual({ isOpen: true, data: undefined });
		});

		it("creates entry with isOpen:true and data", () => {
			const result = openEntry({}, "dialog-1", { name: "test" });
			expect(result["dialog-1"]).toEqual({ isOpen: true, data: { name: "test" } });
		});

		it("overwrites existing entry", () => {
			const entries = { "dialog-1": { isOpen: false, data: { name: "old" } } };
			const result = openEntry(entries, "dialog-1", { name: "new" });
			expect(result["dialog-1"]).toEqual({ isOpen: true, data: { name: "new" } });
		});
	});

	// ============================================================================
	// closeEntry
	// ============================================================================

	describe("closeEntry", () => {
		it("sets isOpen:false and preserves data", () => {
			const entries = { "dialog-1": { isOpen: true, data: { kept: true } } };
			const result = closeEntry(entries, "dialog-1");
			expect(result["dialog-1"]).toEqual({ isOpen: false, data: { kept: true } });
		});

		it("handles non-existent entry gracefully", () => {
			const result = closeEntry({}, "missing");
			expect(result["missing"]).toEqual({ isOpen: false });
		});
	});

	// ============================================================================
	// toggleEntry
	// ============================================================================

	describe("toggleEntry", () => {
		it("toggles true to false", () => {
			const entries = { d: { isOpen: true, data: "x" } };
			const result = toggleEntry(entries, "d");
			expect(result["d"]).toEqual({ isOpen: false, data: "x" });
		});

		it("toggles false to true", () => {
			const entries = { d: { isOpen: false, data: "x" } };
			const result = toggleEntry(entries, "d");
			expect(result["d"]).toEqual({ isOpen: true, data: "x" });
		});

		it("handles non-existent entry (undefined → true)", () => {
			const result = toggleEntry({}, "new");
			expect(result["new"]).toEqual({ isOpen: true, data: undefined });
		});
	});

	// ============================================================================
	// clearEntry
	// ============================================================================

	describe("clearEntry", () => {
		it("resets isOpen to false and data to undefined", () => {
			const entries = { d: { isOpen: true, data: { some: "data" } } };
			const result = clearEntry(entries, "d");
			expect(result["d"]).toEqual({ isOpen: false, data: undefined });
		});
	});

	// ============================================================================
	// isEntryOpen
	// ============================================================================

	describe("isEntryOpen", () => {
		it("returns true when entry is open", () => {
			expect(isEntryOpen({ d: { isOpen: true } }, "d")).toBe(true);
		});

		it("returns false when entry is closed", () => {
			expect(isEntryOpen({ d: { isOpen: false } }, "d")).toBe(false);
		});

		it("returns false for non-existent entry", () => {
			expect(isEntryOpen({}, "missing")).toBe(false);
		});
	});

	// ============================================================================
	// getEntryData
	// ============================================================================

	describe("getEntryData", () => {
		it("returns data when present", () => {
			const entries = { d: { isOpen: true, data: { id: 42 } } };
			expect(getEntryData(entries, "d")).toEqual({ id: 42 });
		});

		it("returns undefined when data is not set", () => {
			const entries = { d: { isOpen: true } };
			expect(getEntryData(entries, "d")).toBeUndefined();
		});

		it("returns undefined for non-existent entry", () => {
			expect(getEntryData({}, "missing")).toBeUndefined();
		});
	});
});
