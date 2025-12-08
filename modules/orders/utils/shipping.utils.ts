/**
 * Utilitaires pour le calcul des frais de port
 *
 * Source unique de verite : @/modules/orders/constants/colissimo-rates
 */

import {
	getShippingRate,
	ALLOWED_SHIPPING_COUNTRIES,
	type ShippingRate,
	type AllowedShippingCountry,
} from "@/modules/orders/constants/colissimo-rates";
import { TAX_RATE, FREE_SHIPPING_THRESHOLD } from "@/modules/orders/constants/shipping.constants";

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
	countryCode: AllowedShippingCountry = "FR"
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
 * console.log(info.displayName); // "Colissimo France (2-3 jours)"
 * console.log(info.minDays); // 2
 * console.log(info.maxDays); // 3
 * ```
 */
export function getShippingInfo(countryCode: AllowedShippingCountry = "FR"): ShippingRate {
	return getShippingRate(countryCode);
}

/**
 * NON UTILISE - Calcule le montant HT a partir du TTC
 *
 * Micro-entreprise : Cette fonction n'est PLUS utilisee car exoneree de TVA
 * En regime micro-entreprise, il n'y a pas de distinction HT/TTC
 * Les prix sont des prix FINAUX sans TVA
 *
 * Conservee pour compatibilite et future migration en regime reel si necessaire
 *
 * @param priceInclTax - Prix TTC en centimes
 * @param taxRate - Taux de TVA (optionnel, par defaut 20% France)
 * @returns Prix HT en centimes (arrondi)
 *
 * @example
 * ```typescript
 * calculatePriceExclTax(1200); // 1000 (1200 / 1.20)
 * calculatePriceExclTax(1200, 0.19); // 1008 (1200 / 1.19) - Allemagne
 * ```
 */
export function calculatePriceExclTax(
	priceInclTax: number,
	taxRate: number = TAX_RATE
): number {
	return Math.round(priceInclTax / (1 + taxRate));
}

/**
 * NON UTILISE - Calcule le montant de la TVA
 *
 * Micro-entreprise : Cette fonction n'est PLUS utilisee car exoneree de TVA
 * En regime micro-entreprise : TVA = 0€ (art. 293 B du CGI)
 *
 * Conservee pour compatibilite et future migration en regime reel si necessaire
 *
 * @param priceInclTax - Prix TTC en centimes
 * @param taxRate - Taux de TVA (optionnel, par defaut 20% France)
 * @returns Montant de la TVA en centimes
 *
 * @example
 * ```typescript
 * calculateTaxAmount(1200); // 200 (TVA 20%)
 * calculateTaxAmount(1200, 0.19); // 192 (TVA 19% - Allemagne)
 * ```
 */
export function calculateTaxAmount(
	priceInclTax: number,
	taxRate: number = TAX_RATE
): number {
	const priceExclTax = calculatePriceExclTax(priceInclTax, taxRate);
	return priceInclTax - priceExclTax;
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
	countryCode: AllowedShippingCountry = "FR"
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
 * Verifie si la livraison gratuite s'applique
 *
 * Livraison gratuite a partir de 50€
 * Prepare pour offres futures :
 * - Codes promo livraison offerte
 * - Zones avec livraison gratuite
 *
 * @param subtotal - Sous-total de la commande en centimes
 * @param _countryCode - Code pays (non utilise pour l'instant)
 * @returns true si livraison gratuite
 */
export function isFreeShipping(
	subtotal: number,
	_countryCode: AllowedShippingCountry = "FR"
): boolean {
	// Livraison gratuite a partir de 50€
	return subtotal >= FREE_SHIPPING_THRESHOLD;
}

/**
 * Recupere le cout de livraison en appliquant les regles de gratuite
 *
 * @param subtotal - Sous-total en centimes
 * @param countryCode - Code pays
 * @returns Frais de port finaux en centimes
 *
 * @example
 * ```typescript
 * getFinalShippingCost(3000, "FR"); // 600 (< 50€)
 * getFinalShippingCost(6000, "FR"); // 0 (>= 50€ - livraison offerte)
 * ```
 */
export function getFinalShippingCost(
	subtotal: number,
	countryCode: AllowedShippingCountry = "FR"
): number {
	if (isFreeShipping(subtotal, countryCode)) {
		return 0;
	}

	return calculateShipping(countryCode);
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
export function getAllowedCountries(): AllowedShippingCountry[] {
	return [...ALLOWED_SHIPPING_COUNTRIES];
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
	return ALLOWED_SHIPPING_COUNTRIES.includes(countryCode as AllowedShippingCountry);
}
