/**
 * Service de calcul et gestion des frais de port
 *
 * Contient toute la logique métier liée au shipping.
 * Les constantes (tarifs) sont dans @/modules/orders/constants/shipping-rates
 */

import {
	SHIPPING_RATES,
	type ShippingRate,
} from "@/modules/orders/constants/shipping-rates";
import { getShippingZoneFromPostalCode } from "@/modules/orders/utils/postal-zone.utils";
import { SHIPPING_COUNTRIES, type ShippingCountry } from "@/shared/constants/countries";
import type { AllowedShippingCountry } from "../types/order.types";

// ============================================================================
// RATE LOOKUP
// ============================================================================

/**
 * Détermine le tarif de livraison approprié selon le pays de destination
 *
 * @param country - Code pays ISO 3166-1 alpha-2 (ex: "FR", "BE")
 * @returns Tarif de livraison applicable
 *
 * @example
 * ```ts
 * const rate = getShippingRate("FR")
 * console.log(rate.amount) // 600 (6.00€)
 * ```
 */
export function getShippingRate(country: string): ShippingRate {
	if (country === "FR") {
		return SHIPPING_RATES.FR;
	}

	// Monaco + tous les autres pays de l'UE
	return SHIPPING_RATES.EU;
}

/**
 * Vérifie si un pays est éligible à la livraison
 *
 * @param country - Code pays ISO 3166-1 alpha-2
 * @returns true si le pays est couvert par nos tarifs de livraison
 */
export function isShippingAvailable(
	country: string
): country is AllowedShippingCountry {
	return SHIPPING_COUNTRIES.includes(country as ShippingCountry);
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Convertit un montant en centimes vers un format lisible en euros
 *
 * @param amountInCents - Montant en centimes
 * @returns Montant formaté (ex: "6,00 €")
 */
export function formatShippingPrice(amountInCents: number): string {
	return new Intl.NumberFormat("fr-FR", {
		style: "currency",
		currency: "EUR",
	}).format(amountInCents / 100);
}

// ============================================================================
// CALCULATIONS
// ============================================================================

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
