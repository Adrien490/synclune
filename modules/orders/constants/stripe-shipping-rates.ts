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
	/** Livraison France Métropolitaine (hors Corse) — voir SHIPPING_RATES.FR */
	FRANCE: "shr_1SYOf8KjFZ5SF8XKdI4fL8wL",
	/** Livraison Union Européenne — voir SHIPPING_RATES.EU */
	EUROPE: "shr_1SYOgiKjFZ5SF8XKfg5lytq7",
	// Corse (référence future) : shr_1SYOfyKjFZ5SF8XKMD1lNXvK
} as const;

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
