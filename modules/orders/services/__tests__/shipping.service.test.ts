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

// `shipping-zone.service` n'est VOLONTAIREMENT pas mocké : c'est une fonction
// pure sans dépendance, et le stub qui la remplaçait ne savait retourner que
// `CORSE` — d'où l'impossibilité de voir que DOM/TOM/UNKNOWN étaient facturés au
// tarif métropole. Le mock était la cause de l'angle mort, pas un détail.

import {
	getShippingRate,
	formatShippingPrice,
	getShippingInfo,
	isCountrySupported,
	isUnshippableFrenchAddress,
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
// getShippingInfo
// ============================================================================

describe("getShippingInfo", () => {
	it("should return FR rate info by default", () => {
		const info = getShippingInfo();
		expect(info).not.toBeNull();
		expect(info!.amount).toBe(499);
		expect(info!.displayName).toContain("France");
	});

	it("should return FR rate info for non-Corsican postal code", () => {
		const info = getShippingInfo("FR", "75001");
		expect(info).not.toBeNull();
		expect(info!.amount).toBe(499);
	});

	it("should return null for Corsican postal codes (not available)", () => {
		expect(getShippingInfo("FR", "20000")).toBeNull();
		expect(getShippingInfo("FR", "20200")).toBeNull();
	});

	it("should return EU rate info for Belgium", () => {
		const info = getShippingInfo("BE");
		expect(info).not.toBeNull();
		expect(info!.amount).toBe(950);
		expect(info!.displayName).toContain("Europe");
	});

	// Les CGV §5.1 excluent les DOM-TOM. Avant correction, seule `CORSE` était
	// testée : un CP `97400` créait une commande à 4,99 € pour un envoi outre-mer.
	describe.each([
		["97100", "Guadeloupe (DOM)"],
		["97200", "Martinique (DOM)"],
		["97400", "La Réunion (DOM)"],
		["98800", "Nouvelle-Calédonie (TOM)"],
		["98700", "Polynésie française (TOM)"],
	])("DOM-TOM %s — %s", (postalCode) => {
		it("is refused, not billed at the metropolitan rate", () => {
			expect(getShippingInfo("FR", postalCode)).toBeNull();
		});
	});

	// Un CP hors département connu n'a pas de tarif applicable : le refuser évite
	// que `getShippingRate` retombe silencieusement sur le barème métropole.
	describe.each([["96000"], ["99000"], ["00000"]])("zone indéterminée %s", (postalCode) => {
		it("is refused", () => {
			expect(getShippingInfo("FR", postalCode)).toBeNull();
		});
	});

	it("ignores the postal code for non-FR countries (foreign formats)", () => {
		// Un CP belge "9700" ne doit pas être lu comme un département français.
		expect(getShippingInfo("BE", "9700")).not.toBeNull();
	});
});

// ============================================================================
// isUnshippableFrenchAddress — garde UNIQUE du périmètre CGV §5.1
// ============================================================================

/**
 * C'est le prédicat que consomme `getShippingInfo` ET l'alerte admin « adresse
 * hors zone » : les deux répondent mécaniquement sur le même périmètre — la
 * parité qui était auparavant testée entre deux fonctions dupliquées.
 */
describe("isUnshippableFrenchAddress", () => {
	it.each([
		["75001", false], // métropole
		["13001", false], // métropole
		["20000", true], // Corse 2A
		["20200", true], // Corse 2B
		["2A000", true], // Corse (forme département)
		["2B000", true], // Corse (forme département)
		["97100", true], // DOM
		["97400", true], // DOM
		["98800", true], // TOM
		["96000", true], // indéterminé
		["99000", true], // indéterminé
	])("FR %s → unshippable: %s", (postalCode, expected) => {
		expect(isUnshippableFrenchAddress("FR", postalCode)).toBe(expected);
	});

	it("never flags a non-FR address, whatever its postal format", () => {
		expect(isUnshippableFrenchAddress("BE", "9700")).toBe(false);
		expect(isUnshippableFrenchAddress("MC", "98000")).toBe(false);
	});

	it("stays false when the address is incomplete (nullable DB columns)", () => {
		expect(isUnshippableFrenchAddress("FR", null)).toBe(false);
		expect(isUnshippableFrenchAddress("FR", undefined)).toBe(false);
		expect(isUnshippableFrenchAddress(null, "20000")).toBe(false);
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
