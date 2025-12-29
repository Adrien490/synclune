/**
 * Utilitaires pour le calcul des frais de port
 *
 * Source unique de verite : @/modules/orders/constants/shipping-rates
 */

import {
	getShippingRate,
	SHIPPING_RATES,
	type ShippingRate,
} from "@/modules/orders/constants/shipping-rates";
import { getShippingZoneFromPostalCode } from "@/modules/orders/utils/postal-zone.utils";
import { SHIPPING_COUNTRIES, type ShippingCountry } from "@/shared/constants/countries";

/**
 * Calcule les frais de port selon le pays et le code postal de destination
 *
 * @param countryCode - Code pays ISO 3166-1 alpha-2 (ex: "FR", "BE")
 * @param postalCode - Code postal optionnel pour détecter la Corse
 * @returns Montant des frais de port en centimes, ou 0 si pays non supporte
 *
 * @example
 * ```typescript
 * calculateShipping();              // 600 (France metro par defaut)
 * calculateShipping("FR");          // 600 (France metro)
 * calculateShipping("FR", "20000"); // 1000 (Corse - 2A)
 * calculateShipping("FR", "20200"); // 1000 (Corse - 2B)
 * calculateShipping("BE");          // 1500 (UE)
 * ```
 */
export function calculateShipping(
	countryCode: ShippingCountry = "FR",
	postalCode?: string
): number {
	try {
		// Détection Corse pour les commandes FR avec code postal
		if (countryCode === "FR" && postalCode) {
			const { zone } = getShippingZoneFromPostalCode(postalCode);
			if (zone === "CORSE") {
				return SHIPPING_RATES.CORSE.amount;
			}
		}

		const rate = getShippingRate(countryCode);
		return rate.amount;
	} catch {
		// Pays non supporte - retourner 0 pour eviter les erreurs
		return 0;
	}
}

/**
 * Retourne les informations completes du tarif de livraison
 *
 * @param countryCode - Code pays ISO 3166-1 alpha-2
 * @param postalCode - Code postal optionnel pour détecter la Corse
 * @returns Informations completes du tarif de livraison
 *
 * @example
 * ```typescript
 * const info = getShippingInfo("FR");
 * console.log(info.amount); // 600
 * console.log(info.displayName); // "Livraison France (2-3 jours)"
 *
 * const corsica = getShippingInfo("FR", "20000");
 * console.log(corsica.amount); // 1000
 * console.log(corsica.displayName); // "Livraison Corse (4-7 jours)"
 * ```
 */
export function getShippingInfo(
	countryCode: ShippingCountry = "FR",
	postalCode?: string
): ShippingRate {
	// Détection Corse pour les commandes FR avec code postal
	if (countryCode === "FR" && postalCode) {
		const { zone } = getShippingZoneFromPostalCode(postalCode);
		if (zone === "CORSE") {
			return SHIPPING_RATES.CORSE;
		}
	}

	return getShippingRate(countryCode);
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
