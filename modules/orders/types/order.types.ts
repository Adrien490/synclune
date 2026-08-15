/**
 * Types du module orders — réduit au socle expédition (migration lean, lot 2).
 * Les types de commande (admin, suivi) sont réécrits au lot 4.
 */
import type { ShippingCountry } from "@/shared/constants/countries";

/** Transporteur de livraison */
type ShippingCarrier = "standard";

/** Tarif de livraison */
export interface ShippingRate {
	/** Montant en centimes (ex: 600 = 6.00€) */
	amount: number;
	/** Nom affiché au client */
	displayName: string;
	/** Délai de livraison estimé (ex: "2-4 jours ouvrés") */
	estimatedDays: string;
	/** Code du transporteur */
	carrier: ShippingCarrier;
	/** Pays couverts par ce tarif */
	countries: readonly string[];
}

/** Pays où la livraison est possible */
export type AllowedShippingCountry = ShippingCountry;
