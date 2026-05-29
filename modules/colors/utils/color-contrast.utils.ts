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
	// Retirer le # si présent et normaliser 3-char hex en 6-char
	let color = hex.replace("#", "");
	if (color.length === 3) {
		color =
			color.charAt(0) +
			color.charAt(0) +
			color.charAt(1) +
			color.charAt(1) +
			color.charAt(2) +
			color.charAt(2);
	}
	if (color.length !== 6) return false;

	// Convertir en RGB
	const r = parseInt(color.substring(0, 2), 16);
	const g = parseInt(color.substring(2, 4), 16);
	const b = parseInt(color.substring(4, 6), 16);

	// Luminance perceptuelle ITU-R BT.601 (proxy "fond clair vs sombre" pour
	// décider d'un ring de contraste). Ce n'est PAS la formule WCAG 2.x (qui
	// applique d'abord une correction gamma sRGB) — ne pas réutiliser pour
	// calculer un ratio de contraste AA 4.5:1.
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

// ============================================================================
// WCAG 2.x — ratio de contraste réel
// Contrairement à `isLightColor` (proxy BT.601 pour décider d'un ring), ces
// fonctions appliquent la correction gamma sRGB officielle et calculent un
// ratio conforme WCAG 2.x — utilisables pour juger la lisibilité AA/AAA.
// ============================================================================

/** Parse un hex 3 ou 6 chiffres (avec ou sans #) en [r, g, b] 0-255, ou null. */
function parseHexToRgb(hex: string): [number, number, number] | null {
	let color = hex.replace("#", "");
	if (color.length === 3) {
		color = color
			.split("")
			.map((c) => c + c)
			.join("");
	}
	if (!/^[0-9a-fA-F]{6}$/.test(color)) return null;
	return [
		parseInt(color.substring(0, 2), 16),
		parseInt(color.substring(2, 4), 16),
		parseInt(color.substring(4, 6), 16),
	];
}

/**
 * Luminance relative WCAG 2.x (correction gamma sRGB).
 *
 * @param hex - Code couleur hexadécimal
 * @returns Luminance 0-1, ou null si le hex est invalide
 */
export function getRelativeLuminance(hex: string): number | null {
	const rgb = parseHexToRgb(hex);
	if (!rgb) return null;
	const toLinear = (channel: number) => {
		const s = channel / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	};
	const [r, g, b] = rgb;
	return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Ratio de contraste WCAG 2.x entre deux couleurs (1 → 21).
 *
 * @returns Ratio, ou null si l'un des hex est invalide
 *
 * @example
 * getContrastRatio("#000000", "#FFFFFF") // 21
 */
export function getContrastRatio(hexA: string, hexB: string): number | null {
	const lumA = getRelativeLuminance(hexA);
	const lumB = getRelativeLuminance(hexB);
	if (lumA === null || lumB === null) return null;
	const lighter = Math.max(lumA, lumB);
	const darker = Math.min(lumA, lumB);
	return (lighter + 0.05) / (darker + 0.05);
}

export type WcagRating = "AAA" | "AA" | "AA-large" | "faible";

/**
 * Évalue la lisibilité d'une pastille couleur sur fond blanc (boutique). Donne
 * une indication rapide à la créatrice : une couleur très claire obtiendra
 * « faible » → c'est ce qui déclenche la bordure de contraste storefront.
 *
 * @param hex - Hex de la pastille
 * @param background - Fond de référence (défaut blanc storefront)
 * @returns { ratio, rating } ou null si hex invalide
 */
export function getSwatchContrast(
	hex: string,
	background = "#FFFFFF",
): { ratio: number; rating: WcagRating } | null {
	const ratio = getContrastRatio(hex, background);
	if (ratio === null) return null;
	const rating: WcagRating =
		ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA-large" : "faible";
	return { ratio, rating };
}
