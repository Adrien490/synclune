/**
 * Utilitaires TVA pour la France
 * TVA bijoux = 20% (hardcodé pour v1 artisanale française)
 */

export const VAT_RATE_FRANCE = 0.20; // 20%

/**
 * Calcule le prix HT à partir du prix TTC
 * @param priceInclTax - Prix TTC en centimes
 * @returns Prix HT en centimes (arrondi)
 */
export function calculatePriceExclTax(priceInclTax: number): number {
	return Math.round(priceInclTax / (1 + VAT_RATE_FRANCE));
}

/**
 * Calcule le montant de la TVA
 * @param priceInclTax - Prix TTC en centimes
 * @returns Montant de la TVA en centimes
 */
export function calculateVatAmount(priceInclTax: number): number {
	const priceExclTax = calculatePriceExclTax(priceInclTax);
	return priceInclTax - priceExclTax;
}

/**
 * Calcule le prix TTC à partir du prix HT
 * @param priceExclTax - Prix HT en centimes
 * @returns Prix TTC en centimes (arrondi)
 */
export function calculatePriceInclTax(priceExclTax: number): number {
	return Math.round(priceExclTax * (1 + VAT_RATE_FRANCE));
}
