/**
 * Zones de livraison supportees
 */
export type ShippingZone = "METROPOLITAN" | "CORSE" | "DOM" | "TOM" | "UNKNOWN";

/**
 * Resultat de la detection de zone postale
 */
export type ShippingZoneResult = {
	zone: ShippingZone;
	department: string;
};
