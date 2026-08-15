/**
 * Tarifs et délais de livraison — SSOT du tarif FACTURÉ.
 *
 * Ces constantes sont envoyées telles quelles à Stripe en `shipping_rate_data`
 * inline (`createCheckoutSession`) : il n'existe AUCUN tarif côté Stripe
 * Dashboard, changer un montant ici change ce que la cliente paie. Elles
 * alimentent aussi toutes les surfaces d'affichage (PDP, panier, footer, CGV,
 * JSON-LD).
 *
 * @note La logique métier (getShippingRate, getShippingInfo, etc.) est dans
 *       @/modules/orders/services/shipping.service.ts
 */

import { SHIPPING_COUNTRIES, type ShippingCountry } from "@/shared/constants/countries";
import type { ShippingRate } from "../types/order.types";

// Re-export pour compatibilité
export type { ShippingRate };

// ============================================================================
// CONSTANTS
// ============================================================================

const SHIPPING_CARRIERS = {
	STANDARD: "standard",
} as const;

/**
 * Délai de préparation atelier, en jours ouvrés — SSOT `[min, max]`.
 *
 * S'ajoute au délai de transport (`estimatedDays` ci-dessous) pour former la
 * promesse de livraison affichée au client.
 *
 * **Pourquoi une constante.** Le délai vivait en trois exemplaires
 * désynchronisés : la FAQ promettait « 1 à 3 jours ouvrés »,
 * `DeliveryEstimator` codait `[2, 4]` en dur, et
 * `PRODUCT_TEXTS.SHIPPING.PREPARATION` — la seule valeur qui se présentait comme
 * la source — n'était référencée que dans un commentaire, jamais rendue. La
 * boutique annonçait donc 4-8 jours ouvrés sur la fiche produit et 3-7 dans la
 * FAQ. Valeur retenue : `[2, 4]`, la plus prudente et déjà la plus visible.
 */
export const PREPARATION_BUSINESS_DAYS = [2, 4] as const;

/** Libellé dérivé de `PREPARATION_BUSINESS_DAYS` — les deux ne peuvent pas divorcer. */
export const PREPARATION_DELAY_LABEL = `${PREPARATION_BUSINESS_DAYS[0]} à ${PREPARATION_BUSINESS_DAYS[1]} jours ouvrés`;

/**
 * Tarifs de livraison France/Monaco et Union Européenne
 *
 * Note : la Corse et les DOM-TOM ne sont pas livrés — le périmètre exclu est
 * porté par `UNSHIPPABLE_ZONES` (shipping.service.ts), consommé par
 * `getShippingInfo` et `isUnshippableFrenchAddress`.
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
