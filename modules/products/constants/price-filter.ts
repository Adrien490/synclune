/**
 * Constantes et fonctions pour le filtre de prix avec echelle non-lineaire.
 *
 * Utilise une transformation quadratique pour donner plus de precision
 * dans les gammes de prix courantes (0-100€) tout en permettant d'atteindre
 * les prix eleves.
 *
 * Exemple avec maxPrice = 400€ :
 * - Position 25% → 25€ (au lieu de 100€ en lineaire)
 * - Position 50% → 100€ (au lieu de 200€)
 * - Position 75% → 225€ (au lieu de 300€)
 * - Position 100% → 400€
 */

/** Exposant pour la transformation (2 = quadratique) */
const SCALE_EXPONENT = 2;

/** Maximum de la position interne du slider (0-100) */
export const SLIDER_MAX = 100;

/**
 * Convertit une position du slider (0-100) en prix (€)
 * Formule: price = (position / 100)^2 × maxPrice
 */
export function sliderToPrice(position: number, maxPrice: number): number {
	if (position <= 0) return 0;
	if (position >= SLIDER_MAX) return maxPrice;

	const normalized = position / SLIDER_MAX;
	return Math.round(Math.pow(normalized, SCALE_EXPONENT) * maxPrice);
}

/**
 * Convertit un prix (€) en position du slider (0-100)
 * Formule: position = √(price / maxPrice) × 100
 */
export function priceToSlider(price: number, maxPrice: number): number {
	if (price <= 0) return 0;
	if (price >= maxPrice) return SLIDER_MAX;

	return Math.round(Math.pow(price / maxPrice, 1 / SCALE_EXPONENT) * SLIDER_MAX);
}
