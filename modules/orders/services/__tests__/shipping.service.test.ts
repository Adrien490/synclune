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
			expect(calculateShipping("FR", postalCode)).toBeNull();
		});
	});

	// Un CP hors département connu n'a pas de tarif applicable : le refuser évite
	// que `getShippingRate` retombe silencieusement sur le barème métropole.
	describe.each([["96000"], ["99000"], ["00000"]])("zone indéterminée %s", (postalCode) => {
		it("is refused", () => {
			expect(calculateShipping("FR", postalCode)).toBeNull();
		});
	});

	it("ignores the postal code for non-FR countries (foreign formats)", () => {
		// Un CP belge "9700" ne doit pas être lu comme un département français.
		expect(calculateShipping("BE", "9700")).toBe(950);
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

	it("should return null for DOM-TOM postal codes", () => {
		expect(getShippingInfo("FR", "97400")).toBeNull();
		expect(getShippingInfo("FR", "98800")).toBeNull();
	});
});

// ============================================================================
// Parité calculateShipping ↔ getShippingInfo
// ============================================================================

/**
 * Les deux fonctions dupliquaient la même détection de zone, chacune avec sa
 * propre copie du test `zone === "CORSE"` — une divergence ne coûtait qu'un
 * oubli de synchronisation. Elles partagent désormais `isUnshippableDestination`,
 * et ce test verrouille le fait qu'elles répondent toujours sur le même
 * périmètre : l'une ne peut pas accepter ce que l'autre refuse.
 */
describe("calculateShipping / getShippingInfo parity", () => {
	const POSTAL_CODES = [
		"75001", // métropole
		"13001", // métropole
		"20000", // Corse 2A
		"20200", // Corse 2B
		"2A000", // Corse (forme département)
		"2B000", // Corse (forme département)
		"97100", // DOM
		"97400", // DOM
		"98800", // TOM
		"96000", // indéterminé
		"99000", // indéterminé
	];

	it.each(POSTAL_CODES)("agrees on availability for %s", (postalCode) => {
		const amount = calculateShipping("FR", postalCode);
		const info = getShippingInfo("FR", postalCode);

		expect(amount === null).toBe(info === null);
		if (info !== null) {
			expect(amount).toBe(info.amount);
		}
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
