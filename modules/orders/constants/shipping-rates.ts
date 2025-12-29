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

import {
	SHIPPING_COUNTRIES,
	type ShippingCountry,
} from "@/shared/constants/countries";
import type { ShippingCarrier, ShippingRate, AllowedShippingCountry } from "../types/order.types";

// Re-export pour compatibilité
export type { ShippingCarrier, ShippingRate, AllowedShippingCountry };

// ============================================================================
// CONSTANTS
// ============================================================================

export const SHIPPING_CARRIERS = {
	STANDARD: "standard",
	EXPRESS: "express",
} as const;

/**
 * Tarifs de livraison France/Monaco et Union Européenne
 */
export const SHIPPING_RATES = {
	/** France Métropolitaine - Livraison en 2-3 jours ouvrés */
	FR: {
		amount: 600, // 6.00€
		displayName: "Livraison France (2-3 jours)",
		carrier: SHIPPING_CARRIERS.STANDARD,
		minDays: 2,
		maxDays: 3,
		countries: ["FR"] as const,
	},

	/** Corse - Livraison en 4-7 jours ouvrés */
	CORSE: {
		amount: 1000, // 10.00€
		displayName: "Livraison Corse (4-7 jours)",
		carrier: SHIPPING_CARRIERS.STANDARD,
		minDays: 4,
		maxDays: 7,
		countries: ["FR"] as const, // Techniquement FR (codes postaux 2A/2B)
	},

	/** Union Européenne (dont Monaco) - Livraison en 4-7 jours ouvrés */
	EU: {
		amount: 1500, // 15.00€
		displayName: "Livraison Europe (4-7 jours)",
		carrier: SHIPPING_CARRIERS.STANDARD,
		minDays: 4,
		maxDays: 7,
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
