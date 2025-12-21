/**
 * Utilitaires pour la manipulation des couleurs
 */

/**
 * Detecte si une couleur hex est tres claire (besoin de bordure pour contraste)
 * Utilise la luminance relative (formule ITU-R BT.601)
 *
 * @param hex - Couleur hexadecimale (avec ou sans #)
 * @param threshold - Seuil de luminance (defaut 0.85)
 * @returns true si la couleur est consideree comme claire
 *
 * @example
 * isLightColor("#FFFFFF") // true (blanc)
 * isLightColor("#FFFACD") // true (jaune pale)
 * isLightColor("#000000") // false (noir)
 * isLightColor("#D4A5A5") // false (rose)
 */
export function isLightColor(hex: string, threshold = 0.85): boolean {
	// Nettoyer le hex (enlever # si present)
	const cleanHex = hex.replace("#", "");
	if (cleanHex.length !== 6) return false;

	const rgb = parseInt(cleanHex, 16);
	const r = (rgb >> 16) & 0xff;
	const g = (rgb >> 8) & 0xff;
	const b = rgb & 0xff;

	// Luminance relative (0-1)
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > threshold;
}
