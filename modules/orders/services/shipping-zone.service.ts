/**
 * Utilitaires pour la gestion des zones postales françaises
 *
 * Détermine la zone de livraison (métropole, Corse, DOM-TOM) à partir du code postal.
 */

import type { ShippingZone, ShippingZoneResult } from "../types/shipping-zone.types";

export type { ShippingZone, ShippingZoneResult };

// Départements métropolitains français
export const FRENCH_METROPOLITAN_DEPARTMENTS = [
	"01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
	"11", "12", "13", "14", "15", "16", "17", "18", "19", "21",
	"22", "23", "24", "25", "26", "27", "28", "29", "2A", "2B",
	"30", "31", "32", "33", "34", "35", "36", "37", "38", "39",
	"40", "41", "42", "43", "44", "45", "46", "47", "48", "49",
	"50", "51", "52", "53", "54", "55", "56", "57", "58", "59",
	"60", "61", "62", "63", "64", "65", "66", "67", "68", "69",
	"70", "71", "72", "73", "74", "75", "76", "77", "78", "79",
	"80", "81", "82", "83", "84", "85", "86", "87", "88", "89",
	"90", "91", "92", "93", "94", "95",
] as const;

/**
 * Détermine la zone de livraison à partir d'un code postal français
 *
 * @param postalCode - Code postal français (5 caractères)
 * @returns Zone de livraison et département
 *
 * @example
 * ```typescript
 * getShippingZoneFromPostalCode("75001"); // { zone: "METROPOLITAN", department: "75" }
 * getShippingZoneFromPostalCode("20000"); // { zone: "CORSE", department: "2A" }
 * getShippingZoneFromPostalCode("97100"); // { zone: "DOM", department: "971" }
 * ```
 */
export function getShippingZoneFromPostalCode(postalCode: string): ShippingZoneResult {
	const department = postalCode.substring(0, 2);

	if (department === "2A" || department === "2B") {
		return { zone: "CORSE", department };
	}

	// Corse: codes postaux commençant par 20
	if (department === "20") {
		const postalNum = parseInt(postalCode, 10);
		// 20000-20190 = 2A (Corse-du-Sud), 20200-20299 = 2B (Haute-Corse)
		if (postalNum < 20200) {
			return { zone: "CORSE", department: "2A" };
		}
		return { zone: "CORSE", department: "2B" };
	}

	if (department === "97") {
		return { zone: "DOM", department: postalCode.substring(0, 3) };
	}

	if (department === "98") {
		return { zone: "TOM", department: postalCode.substring(0, 3) };
	}

	if (FRENCH_METROPOLITAN_DEPARTMENTS.includes(department as typeof FRENCH_METROPOLITAN_DEPARTMENTS[number])) {
		return { zone: "METROPOLITAN", department };
	}

	return { zone: "UNKNOWN", department };
}
