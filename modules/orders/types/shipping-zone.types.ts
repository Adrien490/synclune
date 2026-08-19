/**
 * Zones de livraison supportées
 */
export type ShippingZone = "METROPOLITAN" | "CORSE" | "DOM" | "TOM" | "UNKNOWN";

/**
 * Résultat de la détection de zone postale
 */
export type ShippingZoneResult = {
	zone: ShippingZone;
	department: string;
};
