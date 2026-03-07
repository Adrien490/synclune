/**
 * Constantes des tarifs de livraison pour bijoux
 *
 * Configuration des zones et tarifs de livraison.
 * Les tarifs réels sont définis dans Stripe Dashboard (Shipping Rates).
 * Ces valeurs locales servent pour les calculs côté backend.
 *
 * @note La logique métier (getShippingRate, isShippingAvailable, etc.)
 *       est dans @/modules/orders/services/shipping.service.ts
 */

import { SHIPPING_COUNTRIES, type ShippingCountry } from "@/shared/constants/countries";
import type { ShippingCarrier, ShippingRate, AllowedShippingCountry } from "../types/order.types";

// Re-export pour compatibilité
export type { ShippingCarrier, ShippingRate, AllowedShippingCountry };

// ============================================================================
// CONSTANTS
// ============================================================================

export const SHIPPING_CARRIERS = {
	STANDARD: "standard",
} as const;

/**
 * Tarifs de livraison France/Monaco et Union Européenne
 *
 * Note : La Corse n'est pas livrée (détection via shipping-zone.service.ts)
 */
export const SHIPPING_RATES = {
	/** France Métropolitaine (hors Corse) */
	FR: {
		amount: 499, // 4.99€
		displayName: "Livraison France",
		estimatedDays: "2-4 jours ouvrés",
		carrier: SHIPPING_CARRIERS.STANDARD,
		countries: ["FR"] as const,
	},

	/** Union Européenne (dont Monaco) */
	EU: {
		amount: 950, // 9.50€
		displayName: "Livraison Europe",
		estimatedDays: "5-8 jours ouvrés",
		carrier: SHIPPING_CARRIERS.STANDARD,
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

// ============================================================================
// MIGRATION NOTICE
// ============================================================================
// Les fonctions getShippingRate, isShippingAvailable, formatShippingPrice
// ont été déplacées vers @/modules/orders/services/shipping.service.ts
//
// Mettre à jour les imports:
// - import { getShippingRate } from "@/modules/orders/services/shipping.service"
// - import { isShippingAvailable } from "@/modules/orders/services/shipping.service"
// - import { formatShippingPrice } from "@/modules/orders/services/shipping.service"
