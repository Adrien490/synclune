/**
 * Utilitaires pour la gestion des zones postales françaises
 */

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

export type ShippingZone = "METROPOLITAN" | "CORSE" | "DOM" | "TOM" | "UNKNOWN";

export type ShippingZoneResult = {
	zone: ShippingZone;
	department: string;
};

/**
 * Détermine la zone de livraison à partir d'un code postal français
 */
export function getShippingZoneFromPostalCode(postalCode: string): ShippingZoneResult {
	const department = postalCode.substring(0, 2);

	if (department === "2A" || department === "2B") {
		return { zone: "CORSE", department };
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
