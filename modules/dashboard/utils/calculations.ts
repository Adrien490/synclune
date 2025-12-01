/**
 * Utilitaires de calcul pour le dashboard
 */

/**
 * Calcule le pourcentage d'évolution entre deux valeurs
 * @param current Valeur actuelle
 * @param previous Valeur précédente
 * @returns Pourcentage d'évolution (positif = hausse, négatif = baisse)
 */
export function calculateEvolutionRate(
	current: number,
	previous: number
): number {
	if (previous === 0) {
		return current > 0 ? 100 : 0;
	}
	return ((current - previous) / previous) * 100;
}

/**
 * Calcule un pourcentage
 * @param value Valeur partielle
 * @param total Valeur totale
 * @returns Pourcentage (0-100)
 */
export function calculatePercentage(value: number, total: number): number {
	if (total === 0) return 0;
	return (value / total) * 100;
}

/**
 * Calcule un taux (rate)
 * @param numerator Numérateur
 * @param denominator Dénominateur
 * @returns Taux (0-100)
 */
export function calculateRate(numerator: number, denominator: number): number {
	if (denominator === 0) return 0;
	return (numerator / denominator) * 100;
}

/**
 * Arrondit un nombre à N décimales
 * @param value Valeur à arrondir
 * @param decimals Nombre de décimales (défaut: 2)
 * @returns Valeur arrondie
 */
export function roundToDecimals(value: number, decimals: number = 2): number {
	const factor = Math.pow(10, decimals);
	return Math.round(value * factor) / factor;
}

/**
 * Formate un montant en euros
 * @param amount Montant en euros
 * @param decimals Nombre de décimales (défaut: 2)
 * @returns Montant formaté avec le symbole €
 */
export function formatCurrency(amount: number, decimals: number = 2): string {
	return `${amount.toFixed(decimals)} €`;
}

/**
 * Formate un pourcentage
 * @param percentage Pourcentage (0-100)
 * @param decimals Nombre de décimales (défaut: 1)
 * @returns Pourcentage formaté avec le symbole %
 */
export function formatPercentage(
	percentage: number,
	decimals: number = 1
): string {
	return `${percentage.toFixed(decimals)}%`;
}
