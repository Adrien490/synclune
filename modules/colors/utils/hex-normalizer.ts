/**
 * Utilitaire de normalisation des codes couleur hexadecimaux
 */

/**
 * Normalise un code hex en format #RRGGBB majuscules
 * Supporte les formats : #RGB, #RRGGBB, RGB, RRGGBB
 *
 * @example
 * normalizeHex("#f00")     // "#FF0000"
 * normalizeHex("abc")      // "#AABBCC"
 * normalizeHex("#FF5733")  // "#FF5733"
 */
export function normalizeHex(hex: string): string {
	// Retirer le # s'il existe
	let cleaned = hex.trim().replace(/^#/, "");

	// Convertir #RGB en #RRGGBB
	if (cleaned.length === 3) {
		cleaned = cleaned
			.split("")
			.map((char) => char + char)
			.join("");
	}

	// Ajouter le # et convertir en majuscules
	return `#${cleaned.toUpperCase()}`;
}
