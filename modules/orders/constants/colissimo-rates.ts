/**
 * Tarifs de livraison Colissimo pour bijoux
 *
 * ⚠️ IMPORTANT : Mondial Relay INTERDIT l'expédition de bijoux selon leurs CGV
 * Alternatives conformes : Colissimo, Chronopost, UPS, DHL
 *
 * Colissimo accepte les bijoux avec assurance jusqu'à 5 000€
 */

import {
	SHIPPING_COUNTRIES,
	type ShippingCountry,
} from "@/shared/constants/countries";

export const SHIPPING_CARRIERS = {
	COLISSIMO: "colissimo",
	CHRONOPOST: "chronopost",
} as const;

export type ShippingCarrier =
	(typeof SHIPPING_CARRIERS)[keyof typeof SHIPPING_CARRIERS];

export interface ShippingRate {
	/** Montant en centimes (ex: 600 = 6.00€) */
	amount: number;
	/** Nom affiché au client */
	displayName: string;
	/** Code du transporteur */
	carrier: ShippingCarrier;
	/** Délai minimum en jours ouvrés */
	minDays: number;
	/** Délai maximum en jours ouvrés */
	maxDays: number;
	/** Pays couverts par ce tarif */
	countries: readonly string[];
}

/**
 * Tarifs Colissimo France et Union Européenne
 *
 * Sources des tarifs :
 * - France : https://www.laposte.fr/colissimo
 * - International : https://www.laposte.fr/colissimo-international
 */
export const SHIPPING_RATES = {
	/** Colissimo France - Livraison en 2-3 jours ouvrés */
	FR: {
		amount: 600, // 6.00€
		displayName: "Colissimo France (2-3 jours)",
		carrier: SHIPPING_CARRIERS.COLISSIMO,
		minDays: 2,
		maxDays: 3,
		countries: ["FR"] as const,
	},

	/** Colissimo Union Européenne - Livraison en 4-7 jours ouvrés */
	EU: {
		amount: 1500, // 15.00€
		displayName: "Colissimo Union Européenne (4-7 jours)",
		carrier: SHIPPING_CARRIERS.COLISSIMO,
		minDays: 4,
		maxDays: 7,
		// Tous les pays UE sauf France (+ Monaco traité comme UE pour les tarifs)
		countries: SHIPPING_COUNTRIES.filter((c) => c !== "FR") as readonly Exclude<
			ShippingCountry,
			"FR"
		>[],
	},
} as const satisfies Record<string, ShippingRate>;

/**
 * Liste de tous les pays où la livraison est possible
 * Utilise la source de vérité centralisée depuis @/shared/constants/countries
 */
export const ALLOWED_SHIPPING_COUNTRIES = SHIPPING_COUNTRIES;

export type AllowedShippingCountry = ShippingCountry;

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

	// Tous les autres pays de l'UE
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
