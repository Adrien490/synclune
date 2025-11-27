/**
 * Utilitaires pour la manipulation des prix
 */

/**
 * Convertit un prix en centimes vers des euros pour l'affichage
 *
 * @example
 * priceInCentsToEuros(2999) // 29.99
 * priceInCentsToEuros(1999) // 19.99
 * priceInCentsToEuros(10000) // 100.00
 */
export function priceInCentsToEuros(priceInCents: number): number {
	return priceInCents / 100;
}
