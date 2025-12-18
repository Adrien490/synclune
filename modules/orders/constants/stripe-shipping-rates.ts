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
 *
 * INSTRUCTIONS :
 * 1. Aller sur https://dashboard.stripe.com/shipping-rates
 * 2. Créer les tarifs suivants avec les pays autorisés appropriés
 * 3. Copier les IDs (shr_xxx) et les coller ci-dessous
 */

// ==============================================================================
// IDS DES TARIFS STRIPE (À CONFIGURER DANS LE DASHBOARD)
// ==============================================================================

/**
 * IDs des Shipping Rates créés dans le Dashboard Stripe
 *
 * IMPORTANT : Remplacer ces placeholders par les vrais IDs après création
 * dans le Dashboard Stripe.
 */
export const STRIPE_SHIPPING_RATE_IDS = {
	/**
	 * Livraison France Métropolitaine
	 * Prix : 6,00€ | Délai : 2-3 jours ouvrés
	 * Pays autorisés dans Stripe : FR
	 */
	FRANCE: process.env.STRIPE_SHIPPING_RATE_FRANCE!,
	/**
	 * Livraison Union Européenne
	 * Prix : 15,00€ | Délai : 4-7 jours ouvrés
	 * Pays autorisés dans Stripe : BE, DE, NL, LU, IT, ES, PT, AT, IE, FI, SE, DK, GR,
	 *                              BG, HR, CY, CZ, EE, HU, LV, LT, MT, PL, RO, SK, SI, MC
	 */
	EUROPE: process.env.STRIPE_SHIPPING_RATE_EUROPE!,
} as const;

// ==============================================================================
// HELPERS POUR LA CONSTRUCTION DES SHIPPING OPTIONS
// ==============================================================================

/**
 * Génère les shipping_options pour la session Stripe Checkout
 *
 * Stripe filtre automatiquement les options selon le pays du client.
 * Si le client est en Belgique, seule l'option Europe sera disponible.
 *
 * @returns Liste des shipping_options pour Stripe
 */
export function getStripeShippingOptions(): Array<{ shipping_rate: string }> {
	// Proposer tous les tarifs - Stripe affichera uniquement celui correspondant au pays
	return [
		{ shipping_rate: STRIPE_SHIPPING_RATE_IDS.FRANCE },
		{ shipping_rate: STRIPE_SHIPPING_RATE_IDS.EUROPE },
	];
}

// ==============================================================================
// MAPPING DES IDS VERS LES NOMS LISIBLES
// ==============================================================================

/**
 * Map les IDs de tarifs Stripe vers des noms lisibles
 * Utile pour afficher la méthode de livraison dans les emails/dashboard
 */
export const SHIPPING_RATE_NAMES: Record<string, string> = {
	[STRIPE_SHIPPING_RATE_IDS.FRANCE]: "Livraison France",
	[STRIPE_SHIPPING_RATE_IDS.EUROPE]: "Livraison Europe",
};

/**
 * Récupère le nom lisible d'un tarif de livraison
 *
 * @param shippingRateId - ID du shipping rate Stripe (shr_xxx)
 * @returns Nom lisible de la méthode de livraison
 */
export function getShippingRateName(shippingRateId: string): string {
	return SHIPPING_RATE_NAMES[shippingRateId] || "Livraison standard";
}

/**
 * Détermine la méthode de livraison (enum) à partir du shipping rate ID
 *
 * @param shippingRateId - ID du shipping rate Stripe (shr_xxx)
 * @returns La méthode de livraison (STANDARD ou EXPRESS)
 */
export function getShippingMethodFromRate(shippingRateId: string): "STANDARD" | "EXPRESS" {
	// Tous les tarifs sont STANDARD pour l'instant
	// Si ajout d'un tarif EXPRESS futur, mapper ici
	return "STANDARD";
}

/**
 * Détermine le transporteur à partir du shipping rate ID
 *
 * @param shippingRateId - ID du shipping rate Stripe (shr_xxx)
 * @returns Le transporteur (enum ShippingCarrier)
 */
export function getShippingCarrierFromRate(shippingRateId: string): "COLISSIMO" | "CHRONOPOST" | "MONDIAL_RELAY" | "DPD" | "OTHER" {
	// Par défaut, transporteur non spécifié
	// Mapper ici selon l'ID si nécessaire
	return "OTHER";
}
