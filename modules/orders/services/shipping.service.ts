/**
 * Service de calcul et gestion des frais de port
 *
 * Contient toute la logique métier liée au shipping.
 * Les constantes (tarifs) sont dans @/modules/orders/constants/shipping-rates
 */

import { addBusinessDays } from "date-fns";
import { SHIPPING_RATES, type ShippingRate } from "@/modules/orders/constants/shipping-rates";
import { getShippingZoneFromPostalCode } from "@/modules/orders/services/shipping-zone.service";
import { SHIPPING_COUNTRIES, type ShippingCountry } from "@/shared/constants/countries";
import { formatEuro } from "@/shared/utils/format-euro";
import type { AllowedShippingCountry } from "../types/order.types";
import type { ShippingZone } from "../types/shipping-zone.types";

// ============================================================================
// ZONE ELIGIBILITY
// ============================================================================

/**
 * Zones françaises hors périmètre de livraison.
 *
 * `CORSE` et les DOM-TOM sont exclus par les CGV §5.1 (« France métropolitaine
 * (hors Corse et hors DOM-TOM/DROM-COM) et Union Européenne » —
 * app/(legal)/cgv/page.tsx). `UNKNOWN` est refusé par
 * prudence : un code postal ne correspondant à aucun département connu n'a pas
 * de tarif applicable, et `getShippingRate` retomberait silencieusement sur le
 * barème métropole.
 */
const UNSHIPPABLE_ZONES = [
	"CORSE",
	"DOM",
	"TOM",
	"UNKNOWN",
] as const satisfies readonly ShippingZone[];

/**
 * Vrai si la destination est hors périmètre de livraison.
 *
 * Garde UNIQUE consommée par `calculateShipping` ET `getShippingInfo` — les deux
 * dupliquaient la même détection et ne testaient que `CORSE`, si bien qu'un CP
 * `97400` (La Réunion) obtenait le tarif métropole (4,99 €) pour un envoi
 * outre-mer, avec un délai estimé au barème métropole par-dessus. Toute
 * évolution du périmètre passe désormais par `UNSHIPPABLE_ZONES` seul.
 *
 * Sans code postal (`calculateShipping("FR")`, montant provisoire du
 * PaymentIntent avant saisie de l'adresse) la zone est indéterminable : on
 * autorise, le refus intervient au recalcul une fois l'adresse connue.
 */
function isUnshippableDestination(countryCode: ShippingCountry, postalCode?: string): boolean {
	if (countryCode !== "FR" || !postalCode) {
		return false;
	}

	const { zone } = getShippingZoneFromPostalCode(postalCode);
	return (UNSHIPPABLE_ZONES as readonly string[]).includes(zone);
}

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
 * Type predicate — true when `country` is a supported shipping country.
 * Internal helper widening SHIPPING_COUNTRIES to `readonly string[]` so the
 * predicate can be expressed without an unsafe `as` cast.
 */
function isShippingCountry(country: string): country is ShippingCountry {
	return (SHIPPING_COUNTRIES as readonly string[]).includes(country);
}

/**
 * Vérifie si un pays est éligible à la livraison
 *
 * @param country - Code pays ISO 3166-1 alpha-2
 * @returns true si le pays est couvert par nos tarifs de livraison
 */
export function isShippingAvailable(country: string): country is AllowedShippingCountry {
	return isShippingCountry(country);
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
	return formatEuro(amountInCents);
}

// ============================================================================
// CALCULATIONS
// ============================================================================

/**
 * Calcule les frais de port selon le pays et le code postal de destination
 *
 * @param countryCode - Code pays ISO 3166-1 alpha-2 (ex: "FR", "BE")
 * @param postalCode - Code postal optionnel, requis pour écarter les zones non livrées
 * @returns Montant des frais de port en centimes, ou `null` si la destination est
 *          hors périmètre (Corse, DOM-TOM, zone indéterminée, pays non supporté)
 *
 * @example
 * ```typescript
 * calculateShipping();              // 499 (France metro par defaut)
 * calculateShipping("FR");          // 499 (France metro)
 * calculateShipping("FR", "20000"); // null (Corse - non disponible)
 * calculateShipping("FR", "97400"); // null (DOM - non disponible)
 * calculateShipping("FR", "98800"); // null (TOM - non disponible)
 * calculateShipping("BE");          // 950 (UE)
 * ```
 */
export function calculateShipping(
	countryCode: ShippingCountry = "FR",
	postalCode?: string,
): number | null {
	try {
		// Corse + DOM-TOM + zone indéterminée — livraison non disponible
		if (isUnshippableDestination(countryCode, postalCode)) {
			return null;
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
 * console.log(info.displayName); // "Livraison France"
 *
 * const corsica = getShippingInfo("FR", "20000");
 * // Returns null — shipping not available for Corsica
 * ```
 */
export function getShippingInfo(
	countryCode: ShippingCountry = "FR",
	postalCode?: string,
): ShippingRate | null {
	// Corse + DOM-TOM + zone indéterminée — livraison non disponible
	if (isUnshippableDestination(countryCode, postalCode)) {
		return null;
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
export function isCountrySupported(countryCode: string): countryCode is ShippingCountry {
	return isShippingCountry(countryCode);
}

// ============================================================================
// DELIVERY ESTIMATION
// ============================================================================

/**
 * Parse une chaîne de délai "X-Y jours ouvrés" (ou "X à Y") en tuple [min, max].
 *
 * @param estimatedDays - Délai au format SHIPPING_RATES (ex: "2-4 jours ouvrés")
 * @returns Tuple [minDays, maxDays] ; fallback [3, 5] si le format est inattendu
 */
export function parseEstimatedDays(estimatedDays: string): [number, number] {
	const match = estimatedDays.match(/(\d+)\s*[-àa]\s*(\d+)/);
	if (!match) return [3, 5];
	return [Number(match[1]), Number(match[2])];
}

/**
 * Calcule la date estimée de livraison à partir de la date d'expédition,
 * en ajoutant la borne haute du délai transport (jours ouvrés, week-ends exclus).
 *
 * @param shippedAt - Date d'expédition réelle
 * @param countryCode - Code pays de destination (détermine le tarif/délai)
 * @returns Date estimée de livraison
 *
 * @example
 * ```typescript
 * estimateDeliveryDate(new Date("2026-06-01"), "FR"); // shippedAt + 4 jours ouvrés
 * ```
 */
export function estimateDeliveryDate(shippedAt: Date, countryCode: string): Date {
	const [, maxDays] = parseEstimatedDays(getShippingRate(countryCode).estimatedDays);
	return addBusinessDays(shippedAt, maxDays);
}
