/**
 * Constantes et fonctions pour la gestion des frais de port
 *
 * ✅ Source unique de vérité : @/lib/shipping/colissimo-rates
 * ✅ Cohérence garantie entre frontend et backend
 */

import {
	getShippingRate,
	SHIPPING_RATES,
	ALLOWED_SHIPPING_COUNTRIES,
	type ShippingRate,
	type AllowedShippingCountry,
} from "@/modules/orders/constants/colissimo-rates";

/**
 * @deprecated Utiliser SHIPPING_RATES.FR.amount de colissimo-rates à la place
 * Conservé pour rétrocompatibilité
 * Frais de port forfaitaires pour la France en centimes
 * @example 600 = 6,00 €
 */
export const SHIPPING_COST = SHIPPING_RATES.FR.amount; // 6,00 €

/**
 * ❌ TVA NON APPLICABLE - Micro-entreprise (art. 293 B du CGI)
 * @constant 0.20 = 20% (pour référence uniquement)
 *
 * ⚠️ IMPORTANT : Cette constante n'est PLUS utilisée car en régime micro-entreprise
 * vous êtes exonéré de TVA tant que votre CA < 91 900€/an (seuil 2025)
 *
 * Si passage en régime réel TVA (dépassement seuil ou option volontaire) :
 * - Réactiver Stripe Tax dans create-checkout-session.ts
 * - Cette constante deviendra alors pertinente
 *
 * 🔄 Pour info : La TVA varie selon les pays européens
 * - France, Belgique : 20%
 * - Luxembourg : 17%
 * - Suisse : 7.7%
 * - Allemagne : 19%
 */
export const TAX_RATE = 0.2; // ❌ Non utilisé en micro-entreprise

/**
 * Calcule les frais de port selon le pays de destination
 *
 * @param countryCode - Code pays ISO 3166-1 alpha-2 (ex: "FR", "BE", "CH")
 * @returns Montant des frais de port en centimes, ou 0 si pays non supporté
 *
 * @example
 * ```typescript
 * calculateShipping(); // 600 (France par défaut)
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
	} catch (error) {
		// Pays non supporté - retourner 0 pour éviter les erreurs
		return 0;
	}
}

/**
 * Calcule les frais de port et retourne les informations complètes de la zone
 *
 * @param countryCode - Code pays ISO 3166-1 alpha-2
 * @returns Informations complètes du tarif de livraison
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
 * ❌ NON UTILISÉ - Calcule le montant HT à partir du TTC
 *
 * ⚠️ Micro-entreprise : Cette fonction n'est PLUS utilisée car exonérée de TVA
 * En régime micro-entreprise, il n'y a pas de distinction HT/TTC
 * Les prix sont des prix FINAUX sans TVA
 *
 * Conservée pour compatibilité et future migration en régime réel si nécessaire
 *
 * @param priceInclTax - Prix TTC en centimes
 * @param taxRate - Taux de TVA (optionnel, par défaut 20% France)
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
 * ❌ NON UTILISÉ - Calcule le montant de la TVA
 *
 * ⚠️ Micro-entreprise : Cette fonction n'est PLUS utilisée car exonérée de TVA
 * En régime micro-entreprise : TVA = 0€ (art. 293 B du CGI)
 *
 * Conservée pour compatibilité et future migration en régime réel si nécessaire
 *
 * @param priceInclTax - Prix TTC en centimes
 * @param taxRate - Taux de TVA (optionnel, par défaut 20% France)
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
 * Formatte les délais de livraison en texte lisible
 *
 * @param countryCode - Code pays
 * @returns Texte formatté du délai de livraison
 *
 * @example
 * ```typescript
 * formatDeliveryTime("FR"); // "2 à 3 jours ouvrés"
 * formatDeliveryTime("BE"); // "4 à 7 jours ouvrés"
 * ```
 */
export function formatDeliveryTime(
	countryCode: AllowedShippingCountry = "FR"
): string {
	try {
		const rate = getShippingRate(countryCode);
		const { minDays, maxDays } = rate;

		if (minDays === maxDays) {
			return `${minDays} jour${minDays > 1 ? "s" : ""} ouvré${minDays > 1 ? "s" : ""}`;
		}

		return `${minDays} à ${maxDays} jours ouvrés`;
	} catch (error) {
		return "Non disponible";
	}
}

/**
 * Seuil pour la livraison gratuite en centimes
 * @constant 5000 = 50,00 €
 */
export const FREE_SHIPPING_THRESHOLD = 5000; // 50€

/**
 * Vérifie si la livraison gratuite s'applique
 *
 * ✅ Livraison gratuite à partir de 50€
 * 🔄 Préparé pour offres futures :
 * - Codes promo livraison offerte
 * - Zones avec livraison gratuite
 *
 * @param subtotal - Sous-total de la commande en centimes
 * @param countryCode - Code pays
 * @returns true si livraison gratuite
 */
export function isFreeShipping(
	subtotal: number,
	countryCode: AllowedShippingCountry = "FR"
): boolean {
	// Livraison gratuite à partir de 50€
	return subtotal >= FREE_SHIPPING_THRESHOLD;
}

/**
 * Récupère le coût de livraison en appliquant les règles de gratuité
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
 * Retourne la liste des codes pays actuellement supportés
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
 * Vérifie si un pays est supporté pour la livraison
 *
 * @param countryCode - Code pays ISO 3166-1 alpha-2
 * @returns true si le pays est supporté
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

// Ré-exporter les types et constantes de colissimo-rates pour faciliter les imports
export { SHIPPING_RATES, ALLOWED_SHIPPING_COUNTRIES, type ShippingRate } from "@/modules/orders/constants/colissimo-rates";
export type { AllowedShippingCountry } from "@/modules/orders/constants/colissimo-rates";
