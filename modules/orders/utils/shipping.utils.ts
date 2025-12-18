/**
 * Utilitaires pour le calcul des frais de port
 *
 * Source unique de verite : @/modules/orders/constants/shipping-rates
 */

import {
	getShippingRate,
	type ShippingRate,
} from "@/modules/orders/constants/shipping-rates";
import { SHIPPING_COUNTRIES, type ShippingCountry } from "@/shared/constants/countries";

/**
 * Calcule les frais de port selon le pays de destination
 *
 * @param countryCode - Code pays ISO 3166-1 alpha-2 (ex: "FR", "BE", "CH")
 * @returns Montant des frais de port en centimes, ou 0 si pays non supporte
 *
 * @example
 * ```typescript
 * calculateShipping(); // 600 (France par defaut)
 * calculateShipping("FR"); // 600
 * calculateShipping("BE"); // 1500 (UE)
 * ```
 */
export function calculateShipping(
	countryCode: ShippingCountry = "FR"
): number {
	try {
		const rate = getShippingRate(countryCode);
		return rate.amount;
	} catch {
		// Pays non supporte - retourner 0 pour eviter les erreurs
		return 0;
	}
}

/**
 * Calcule les frais de port et retourne les informations completes de la zone
 *
 * @param countryCode - Code pays ISO 3166-1 alpha-2
 * @returns Informations completes du tarif de livraison
 *
 * @example
 * ```typescript
 * const info = getShippingInfo("FR");
 * console.log(info.amount); // 600
 * console.log(info.displayName); // "Livraison France (2-3 jours)"
 * console.log(info.minDays); // 2
 * console.log(info.maxDays); // 3
 * ```
 */
export function getShippingInfo(countryCode: ShippingCountry = "FR"): ShippingRate {
	return getShippingRate(countryCode);
}

/**
 * Formatte les delais de livraison en texte lisible
 *
 * @param countryCode - Code pays
 * @returns Texte formatte du delai de livraison
 *
 * @example
 * ```typescript
 * formatDeliveryTime("FR"); // "2 a 3 jours ouvres"
 * formatDeliveryTime("BE"); // "4 a 7 jours ouvres"
 * ```
 */
export function formatDeliveryTime(
	countryCode: ShippingCountry = "FR"
): string {
	try {
		const rate = getShippingRate(countryCode);
		const { minDays, maxDays } = rate;

		if (minDays === maxDays) {
			return `${minDays} jour${minDays > 1 ? "s" : ""} ouvre${minDays > 1 ? "s" : ""}`;
		}

		return `${minDays} a ${maxDays} jours ouvres`;
	} catch {
		return "Non disponible";
	}
}

/**
 * Retourne la liste des codes pays actuellement supportes
 *
 * @returns Tableau de codes pays ISO 3166-1 alpha-2
 *
 * @example
 * ```typescript
 * const countries = getAllowedCountries();
 * console.log(countries); // ["FR", "BE", "DE", "ES", ...]
 * ```
 */
export function getAllowedCountries(): ShippingCountry[] {
	return [...SHIPPING_COUNTRIES];
}

/**
 * Verifie si un pays est supporte pour la livraison
 *
 * @param countryCode - Code pays ISO 3166-1 alpha-2
 * @returns true si le pays est supporte
 *
 * @example
 * ```typescript
 * isCountrySupported("FR"); // true
 * isCountrySupported("BE"); // true
 * isCountrySupported("US"); // false
 * ```
 */
export function isCountrySupported(countryCode: string): boolean {
	return SHIPPING_COUNTRIES.includes(countryCode as ShippingCountry);
}
