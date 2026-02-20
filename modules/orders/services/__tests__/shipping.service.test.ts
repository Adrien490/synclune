import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({}));

vi.mock("@/shared/constants/countries", () => ({
	SHIPPING_COUNTRIES: [
		"FR", "DE", "BE", "LU", "NL", "IT", "ES", "PT", "AT", "IE",
		"MC", "CH",
	],
}));

vi.mock("@/modules/orders/constants/shipping-rates", () => ({
	SHIPPING_RATES: {
		FR: {
			amount: 600,
			displayName: "Livraison France (2-3 jours)",
			carrier: "standard",
			minDays: 2,
			maxDays: 3,
			countries: ["FR"],
		},
		CORSE: {
			amount: 1000,
			displayName: "Livraison Corse (4-7 jours)",
			carrier: "standard",
			minDays: 4,
			maxDays: 7,
			countries: ["FR"],
		},
		EU: {
			amount: 1500,
			displayName: "Livraison Europe (4-7 jours)",
			carrier: "standard",
			minDays: 4,
			maxDays: 7,
			countries: ["DE", "BE", "LU", "NL", "IT", "ES", "PT", "AT", "IE", "MC", "CH"],
		},
	},
}));

vi.mock("@/modules/orders/services/shipping-zone.service", () => ({
	getShippingZoneFromPostalCode: (postalCode: string) => {
		if (postalCode.startsWith("20")) {
			return { zone: "CORSE" };
		}
		return { zone: "METROPOLE" };
	},
}));

import {
	getShippingRate,
	isShippingAvailable,
	formatShippingPrice,
	calculateShipping,
	getShippingInfo,
	isCountrySupported,
} from "../shipping.service";

// ============================================================================
// getShippingRate
// ============================================================================

describe("getShippingRate", () => {
	it("should return FR rate for France", () => {
		const rate = getShippingRate("FR");
		expect(rate.amount).toBe(600);
	});

	it("should return EU rate for Germany", () => {
		const rate = getShippingRate("DE");
		expect(rate.amount).toBe(1500);
	});

	it("should return EU rate for Monaco", () => {
		const rate = getShippingRate("MC");
		expect(rate.amount).toBe(1500);
	});

	it("should return EU rate for any non-FR country", () => {
		const rate = getShippingRate("BE");
		expect(rate.amount).toBe(1500);
	});
});

// ============================================================================
// isShippingAvailable
// ============================================================================

describe("isShippingAvailable", () => {
	it("should return true for France", () => {
		expect(isShippingAvailable("FR")).toBe(true);
	});

	it("should return true for Germany", () => {
		expect(isShippingAvailable("DE")).toBe(true);
	});

	it("should return false for US", () => {
		expect(isShippingAvailable("US")).toBe(false);
	});

	it("should return false for Japan", () => {
		expect(isShippingAvailable("JP")).toBe(false);
	});
});

// ============================================================================
// formatShippingPrice
// ============================================================================

describe("formatShippingPrice", () => {
	it("should format 600 cents as currency", () => {
		const formatted = formatShippingPrice(600);
		// Intl format may vary, just check it contains 6
		expect(formatted).toContain("6");
		expect(formatted).toContain("€");
	});

	it("should format 1500 cents as currency", () => {
		const formatted = formatShippingPrice(1500);
		expect(formatted).toContain("15");
		expect(formatted).toContain("€");
	});

	it("should handle 0", () => {
		const formatted = formatShippingPrice(0);
		expect(formatted).toContain("0");
		expect(formatted).toContain("€");
	});
});

// ============================================================================
// calculateShipping
// ============================================================================

describe("calculateShipping", () => {
	it("should return FR rate by default", () => {
		expect(calculateShipping()).toBe(600);
	});

	it("should return FR rate for mainland France", () => {
		expect(calculateShipping("FR")).toBe(600);
	});

	it("should return Corse rate for Corsican postal code", () => {
		expect(calculateShipping("FR", "20000")).toBe(1000);
	});

	it("should return Corse rate for 20200 postal code", () => {
		expect(calculateShipping("FR", "20200")).toBe(1000);
	});

	it("should return FR rate for non-Corsican postal code", () => {
		expect(calculateShipping("FR", "75001")).toBe(600);
	});

	it("should return EU rate for Belgium", () => {
		expect(calculateShipping("BE")).toBe(1500);
	});

	it("should return EU rate for Italy", () => {
		expect(calculateShipping("IT")).toBe(1500);
	});
});

// ============================================================================
// getShippingInfo
// ============================================================================

describe("getShippingInfo", () => {
	it("should return FR rate info by default", () => {
		const info = getShippingInfo();
		expect(info.amount).toBe(600);
		expect(info.displayName).toContain("France");
	});

	it("should return Corse rate info for Corsican postal code", () => {
		const info = getShippingInfo("FR", "20000");
		expect(info.amount).toBe(1000);
		expect(info.displayName).toContain("Corse");
	});

	it("should return EU rate info for Belgium", () => {
		const info = getShippingInfo("BE");
		expect(info.amount).toBe(1500);
		expect(info.displayName).toContain("Europe");
	});
});

// ============================================================================
// isCountrySupported
// ============================================================================

describe("isCountrySupported", () => {
	it("should return true for France", () => {
		expect(isCountrySupported("FR")).toBe(true);
	});

	it("should return true for supported EU countries", () => {
		expect(isCountrySupported("DE")).toBe(true);
		expect(isCountrySupported("BE")).toBe(true);
	});

	it("should return false for unsupported countries", () => {
		expect(isCountrySupported("US")).toBe(false);
		expect(isCountrySupported("CN")).toBe(false);
	});
});
