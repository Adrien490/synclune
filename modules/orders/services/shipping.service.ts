/**
 * Service de calcul et gestion des frais de port
 *
 * Contient toute la logique métier liée au shipping.
 * Les constantes (tarifs) sont dans @/modules/orders/constants/shipping-rates
 */

import { SHIPPING_RATES, type ShippingRate } from "@/modules/orders/constants/shipping-rates";
import { getShippingZoneFromPostalCode } from "@/modules/orders/services/shipping-zone.service";
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
 * console.log(rate.amount) // 499 (4.99€)
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
export function isShippingAvailable(country: string): country is AllowedShippingCountry {
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
 * @returns Montant des frais de port en centimes, or null if shipping unavailable (Corsica, unsupported country)
 *
 * @example
 * ```typescript
 * calculateShipping();              // 499 (France metro par defaut)
 * calculateShipping("FR");          // 499 (France metro)
 * calculateShipping("FR", "20000"); // null (Corse - non disponible)
 * calculateShipping("BE");          // 950 (UE)
 * ```
 */
export function calculateShipping(
	countryCode: ShippingCountry = "FR",
	postalCode?: string,
): number | null {
	try {
		// Détection Corse — livraison non disponible
		if (countryCode === "FR" && postalCode) {
			const { zone } = getShippingZoneFromPostalCode(postalCode);
			if (zone === "CORSE") {
				return null;
			}
		}

		const rate = getShippingRate(countryCode);
		return rate.amount;
	} catch {
		// Pays non supporte
		return null;
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
 * console.log(info.amount); // 499
 * console.log(info.displayName); // "Livraison France (2-3 jours)"
 *
 * const corsica = getShippingInfo("FR", "20000");
 * // Returns null — shipping not available for Corsica
 * ```
 */
export function getShippingInfo(
	countryCode: ShippingCountry = "FR",
	postalCode?: string,
): ShippingRate | null {
	// Détection Corse — livraison non disponible
	if (countryCode === "FR" && postalCode) {
		const { zone } = getShippingZoneFromPostalCode(postalCode);
		if (zone === "CORSE") {
			return null;
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
