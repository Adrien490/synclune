import { describe, it, expect } from "vitest";

import { getStockVariant, getStockAriaLabel, getStockStatusLabel } from "../stock-variant";
import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";

describe("getStockVariant", () => {
	it("returns 'destructive' for zero stock", () => {
		expect(getStockVariant(0)).toBe("destructive");
	});

	it("returns 'warning' at the LOW threshold inclusive", () => {
		expect(getStockVariant(STOCK_THRESHOLDS.LOW)).toBe("warning");
	});

	it("returns 'warning' for any value at or below LOW (1..LOW)", () => {
		for (let i = 1; i <= STOCK_THRESHOLDS.LOW; i++) {
			expect(getStockVariant(i)).toBe("warning");
		}
	});

	it("returns 'success' just above the LOW threshold", () => {
		expect(getStockVariant(STOCK_THRESHOLDS.LOW + 1)).toBe("success");
	});

	it("returns 'success' for healthy stock", () => {
		expect(getStockVariant(50)).toBe("success");
		expect(getStockVariant(9999)).toBe("success");
	});

	it("treats negative stock like 'warning' (≤ LOW) — code does not special-case it", () => {
		// Documenting current behaviour: negative numbers are ≤ LOW, so 'warning'.
		// Negative stock is a data bug; the variant doesn't currently distinguish it.
		expect(getStockVariant(-5)).toBe("warning");
	});
});

describe("getStockAriaLabel", () => {
	it("announces 'Stock épuisé' when stock is zero", () => {
		expect(getStockAriaLabel(0)).toBe("Stock épuisé");
	});

	it("announces 'Stock faible' with the count when at or below LOW", () => {
		expect(getStockAriaLabel(1)).toBe("Stock faible : 1 disponible(s)");
		expect(getStockAriaLabel(STOCK_THRESHOLDS.LOW)).toBe(
			`Stock faible : ${STOCK_THRESHOLDS.LOW} disponible(s)`,
		);
	});

	it("announces the raw count above LOW", () => {
		expect(getStockAriaLabel(10)).toBe("10 en stock");
		expect(getStockAriaLabel(150)).toBe("150 en stock");
	});
});

describe("getStockStatusLabel", () => {
	it("returns 'Rupture' for zero stock", () => {
		expect(getStockStatusLabel(0)).toBe("Rupture");
	});

	it("returns 'Faible' at or below the LOW threshold", () => {
		expect(getStockStatusLabel(1)).toBe("Faible");
		expect(getStockStatusLabel(STOCK_THRESHOLDS.LOW)).toBe("Faible");
	});

	it("returns 'OK' above the LOW threshold", () => {
		expect(getStockStatusLabel(STOCK_THRESHOLDS.LOW + 1)).toBe("OK");
		expect(getStockStatusLabel(100)).toBe("OK");
	});
});
