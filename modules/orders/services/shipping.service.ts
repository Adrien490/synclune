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
 * Vrai si l'adresse est hors périmètre de livraison (CGV §5.1).
 *
 * Garde UNIQUE du périmètre — deux fonctions dupliquaient la même détection et
 * ne testaient que `CORSE`, si bien qu'un CP `97400` (La Réunion) obtenait le
 * tarif métropole (4,99 €) pour un envoi outre-mer. Toute évolution du
 * périmètre passe par `UNSHIPPABLE_ZONES` seul.
 *
 * Sans code postal (checkout hébergé : le CP n'est connu qu'APRÈS la création
 * de session) la zone est indéterminable : on autorise, et c'est CE prédicat,
 * appelé sur l'adresse écrite au webhook, qui signale ensuite à l'admin les
 * commandes Corse/DOM-TOM à arbitrer (limite assumée de la migration lean).
 * Signature élargie à `string | null` : `Order.shippingCountry` et
 * `Order.shippingZip` sont nullables en base.
 */
export function isUnshippableFrenchAddress(
	countryCode: string | null | undefined,
	postalCode: string | null | undefined,
): boolean {
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
 * Retourne les informations completes du tarif de livraison
 *
 * @param countryCode - Code pays ISO 3166-1 alpha-2
 * @param postalCode - Code postal optionnel pour détecter la Corse
 * @returns Informations completes du tarif de livraison, ou `null` si la
 *          destination est hors périmètre (Corse, DOM-TOM, zone indéterminée)
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
	if (isUnshippableFrenchAddress(countryCode, postalCode)) {
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
	return (SHIPPING_COUNTRIES as readonly string[]).includes(countryCode);
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

/**
 * Comme `estimateDeliveryDate`, mais rend `null` une fois la date passée :
 * « livraison estimée le 20 août » au passé est une promesse échue — la page de
 * suivi ne doit plus l'afficher, seul le lien transporteur aide encore.
 *
 * L'horloge est lue ICI et pas dans la page : `react-hooks/purity` interdit
 * `Date.now()` dans le rendu d'un composant, et /suivi-commande est de toute
 * façon dynamique et sans cache (donnée nominative) — la lecture au temps de
 * requête est le comportement voulu. L'email d'expédition, lui, reste sur
 * `estimateDeliveryDate` : envoyé au moment de l'expédition, sa date est
 * toujours future.
 */
export function estimateUpcomingDeliveryDate(shippedAt: Date, countryCode: string): Date | null {
	const estimated = estimateDeliveryDate(shippedAt, countryCode);
	return estimated.getTime() >= Date.now() ? estimated : null;
}
