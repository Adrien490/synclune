import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({}));

vi.mock("@/shared/constants/countries", () => ({
	SHIPPING_COUNTRIES: ["FR", "DE", "BE", "LU", "NL", "IT", "ES", "PT", "AT", "IE", "MC", "CH"],
}));

vi.mock("@/modules/orders/constants/shipping-rates", () => ({
	SHIPPING_RATES: {
		FR: {
			amount: 499,
			displayName: "Livraison France",
			carrier: "standard",
			countries: ["FR"],
		},
		EU: {
			amount: 950,
			displayName: "Livraison Europe",
			carrier: "standard",
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
		expect(rate.amount).toBe(499);
	});

	it("should return EU rate for Germany", () => {
		const rate = getShippingRate("DE");
		expect(rate.amount).toBe(950);
	});

	it("should return EU rate for Monaco", () => {
		const rate = getShippingRate("MC");
		expect(rate.amount).toBe(950);
	});

	it("should return EU rate for any non-FR country", () => {
		const rate = getShippingRate("BE");
		expect(rate.amount).toBe(950);
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
	it("should format 499 cents as currency", () => {
		const formatted = formatShippingPrice(499);
		expect(formatted).toContain("4,99");
		expect(formatted).toContain("€");
	});

	it("should format 950 cents as currency", () => {
		const formatted = formatShippingPrice(950);
		expect(formatted).toContain("9,50");
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
		expect(calculateShipping()).toBe(499);
	});

	it("should return FR rate for mainland France", () => {
		expect(calculateShipping("FR")).toBe(499);
	});

	it("should return null for Corsican postal code (not available)", () => {
		expect(calculateShipping("FR", "20000")).toBeNull();
	});

	it("should return null for 20200 postal code (Corse not available)", () => {
		expect(calculateShipping("FR", "20200")).toBeNull();
	});

	it("should return FR rate for non-Corsican postal code", () => {
		expect(calculateShipping("FR", "75001")).toBe(499);
	});

	it("should return EU rate for Belgium", () => {
		expect(calculateShipping("BE")).toBe(950);
	});

	it("should return EU rate for Italy", () => {
		expect(calculateShipping("IT")).toBe(950);
	});
});

// ============================================================================
// getShippingInfo
// ============================================================================

describe("getShippingInfo", () => {
	it("should return FR rate info by default", () => {
		const info = getShippingInfo();
		expect(info).not.toBeNull();
		expect(info!.amount).toBe(499);
		expect(info!.displayName).toContain("France");
	});

	it("should return null for Corsican postal code (not available)", () => {
		const info = getShippingInfo("FR", "20000");
		expect(info).toBeNull();
	});

	it("should return EU rate info for Belgium", () => {
		const info = getShippingInfo("BE");
		expect(info).not.toBeNull();
		expect(info!.amount).toBe(950);
		expect(info!.displayName).toContain("Europe");
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
