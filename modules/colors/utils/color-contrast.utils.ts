// ============================================================================
// COLOR CONTRAST UTILS
// Utilitaires pour le calcul de contraste et de luminance des couleurs
// ============================================================================

/**
 * Détermine si une couleur hex est claire ou foncée
 * Utile pour adapter le contraste du texte ou des icônes sur un fond coloré
 *
 * @param hex - Code couleur hexadécimal (avec ou sans #)
 * @param threshold - Seuil de luminance (defaut 0.5 pour contraste texte, 0.85 pour bordures)
 * @returns true si la couleur est claire (luminance > threshold)
 *
 * @example
 * isLightColor("#FFFFFF")       // true (blanc)
 * isLightColor("#000000")       // false (noir)
 * isLightColor("#FFD700")       // true (or)
 * isLightColor("#FFFACD", 0.85) // true (jaune pale, besoin bordure)
 */
export function isLightColor(hex: string, threshold = 0.5): boolean {
	// Retirer le # si présent
	const color = hex.replace("#", "");
	if (color.length !== 6) return false;

	// Convertir en RGB
	const r = parseInt(color.substring(0, 2), 16);
	const g = parseInt(color.substring(2, 4), 16);
	const b = parseInt(color.substring(4, 6), 16);

	// Calcul de luminance relative (formule ITU-R BT.601 / WCAG 2.0)
	// https://www.w3.org/TR/WCAG20/#relativeluminancedef
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

	return luminance > threshold;
}

/**
 * Retourne la couleur de texte optimale (noir ou blanc) pour un fond donné
 *
 * @param hex - Code couleur hexadécimal du fond
 * @returns "black" ou "white"
 *
 * @example
 * getContrastTextColor("#FFFFFF") // "black"
 * getContrastTextColor("#000000") // "white"
 */
export function getContrastTextColor(hex: string): "black" | "white" {
	return isLightColor(hex) ? "black" : "white";
}
