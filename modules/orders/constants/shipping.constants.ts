/**
 * Constantes pour la gestion des frais de port
 *
 * Les fonctions de calcul sont dans @/modules/orders/utils/shipping.utils.ts
 */

import {
	SHIPPING_RATES,
	ALLOWED_SHIPPING_COUNTRIES,
	type ShippingRate,
	type AllowedShippingCountry,
} from "@/modules/orders/constants/colissimo-rates";

/**
 * @deprecated Utiliser SHIPPING_RATES.FR.amount de colissimo-rates a la place
 * Conserve pour retrocompatibilite
 * Frais de port forfaitaires pour la France en centimes
 * @example 600 = 6,00 €
 */
export const SHIPPING_COST = SHIPPING_RATES.FR.amount; // 6,00 €

/**
 * TVA NON APPLICABLE - Micro-entreprise (art. 293 B du CGI)
 * @constant 0.20 = 20% (pour reference uniquement)
 *
 * IMPORTANT : Cette constante n'est PLUS utilisee car en regime micro-entreprise
 * vous etes exonere de TVA tant que votre CA < 91 900€/an (seuil 2025)
 *
 * Si passage en regime reel TVA (depassement seuil ou option volontaire) :
 * - Reactiver Stripe Tax dans create-checkout-session.ts
 * - Cette constante deviendra alors pertinente
 */
export const TAX_RATE = 0.2;

// Re-exporter les types et constantes de colissimo-rates pour faciliter les imports
export { SHIPPING_RATES, ALLOWED_SHIPPING_COUNTRIES, type ShippingRate } from "@/modules/orders/constants/colissimo-rates";
export type { AllowedShippingCountry } from "@/modules/orders/constants/colissimo-rates";
