/**
 * Configuration des tarifs de livraison Stripe
 *
 * Ces IDs correspondent aux "Shipping Rates" créés dans le Dashboard Stripe :
 * Stripe Dashboard > Produits > Tarifs d'expédition
 *
 * Avantages de cette approche :
 * - Stripe filtre automatiquement les tarifs selon le pays du client
 * - Gestion centralisée des prix dans le Dashboard
 * - Pas de recréation de tarif à chaque checkout
 */

import { getShippingZoneFromPostalCode } from "@/modules/orders/services/shipping-zone.service";
import { type ShippingCountry } from "@/shared/constants/countries";

// ==============================================================================
// IDS DES TARIFS STRIPE
// ==============================================================================

export const STRIPE_SHIPPING_RATE_IDS = {
	/** Livraison France Métropolitaine (hors Corse) — 4,99€, 2-3 jours ouvrés */
	FRANCE: "shr_1SYOf8KjFZ5SF8XKdI4fL8wL",
	/** Livraison Union Européenne — 9,50€, 4-7 jours ouvrés */
	EUROPE: "shr_1SYOgiKjFZ5SF8XKfg5lytq7",
	// Corse (référence future) : shr_1SYOfyKjFZ5SF8XKMD1lNXvK
} as const;

// ==============================================================================
// HELPERS POUR LA CONSTRUCTION DES SHIPPING OPTIONS
// ==============================================================================

/**
 * Détermine le shipping_option approprié selon l'adresse de livraison
 *
 * Stripe ne filtre pas par code postal, donc on ne passe qu'un seul tarif
 * pour éviter que le client puisse choisir un tarif incorrect.
 *
 * @param country - Code pays ISO (ex: "FR", "BE")
 * @param postalCode - Code postal (ex: "75001", "20000")
 * @returns Le shipping_option unique correspondant à l'adresse
 */
export function getShippingOptionsForAddress(
	country: ShippingCountry,
	postalCode: string,
): Array<{ shipping_rate: string }> {
	if (country === "FR") {
		const { zone } = getShippingZoneFromPostalCode(postalCode);
		if (zone === "CORSE") {
			throw new Error("La livraison en Corse n'est pas disponible");
		}
		return [{ shipping_rate: STRIPE_SHIPPING_RATE_IDS.FRANCE }];
	}
	return [{ shipping_rate: STRIPE_SHIPPING_RATE_IDS.EUROPE }];
}

// ==============================================================================
// MAPPING DES IDS VERS LES NOMS LISIBLES
// ==============================================================================

/**
 * Récupère le nom lisible d'un tarif de livraison
 *
 * @param shippingRateId - ID du shipping rate Stripe (shr_xxx)
 * @returns Nom lisible de la méthode de livraison
 */
export function getShippingRateName(shippingRateId: string): string {
	const names: Record<string, string> = {
		[STRIPE_SHIPPING_RATE_IDS.FRANCE]: "Livraison France",
		[STRIPE_SHIPPING_RATE_IDS.EUROPE]: "Livraison Europe",
	};
	return names[shippingRateId] ?? "Livraison standard";
}

/**
 * Détermine la méthode de livraison (enum) à partir du shipping rate ID
 *
 * @param shippingRateId - ID du shipping rate Stripe (shr_xxx)
 * @returns La méthode de livraison (toujours STANDARD)
 */
export function getShippingMethodFromRate(_shippingRateId: string): string {
	return "STANDARD";
}

/**
 * Détermine le transporteur à partir du shipping rate ID
 *
 * @param _shippingRateId - ID du shipping rate Stripe (shr_xxx)
 * @returns Le transporteur (lowercase string matching Carrier type)
 */
export function getShippingCarrierFromRate(_shippingRateId: string): string {
	return "colissimo";
}
