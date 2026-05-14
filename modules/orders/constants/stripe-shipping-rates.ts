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

/**
 * IDs des shipping rates Stripe disponibles pour `shipping_options` dans
 * `stripe.checkout.sessions.create`. Stripe filtre automatiquement les rates
 * en fonction du pays sélectionné par le client dans l'iframe Checkout.
 */
export const STRIPE_SHIPPING_OPTIONS = [
	{ shipping_rate: STRIPE_SHIPPING_RATE_IDS.FRANCE },
	{ shipping_rate: STRIPE_SHIPPING_RATE_IDS.EUROPE },
] as const;

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
