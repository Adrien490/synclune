/**
 * Utilitaires pour les transporteurs
 * Constantes et helpers simples - la logique métier est dans services/
 */

import type { Carrier, CarrierInfo } from "../types/carrier.types";

// Re-export des types pour compatibilité
export type { Carrier, CarrierInfo, DetectionResult } from "../types/carrier.types";

// Re-export des fonctions de logique métier depuis services/
export {
	getTrackingUrl,
	detectCarrierAndUrl,
} from "../services/carrier-detection.service";

/**
 * Liste des transporteurs disponibles
 */
export const CARRIERS: CarrierInfo[] = [
	{ value: "colissimo", label: "Colissimo" },
	{ value: "lettre_suivie", label: "Lettre Suivie" },
	{ value: "mondial_relay", label: "Mondial Relay" },
	{ value: "chronopost", label: "Chronopost" },
	{ value: "dpd", label: "DPD" },
	{ value: "gls", label: "GLS" },
	{ value: "dhl", label: "DHL" },
	{ value: "ups", label: "UPS" },
	{ value: "fedex", label: "FedEx" },
	{ value: "relais_colis", label: "Relais Colis" },
	{ value: "autre", label: "Autre transporteur" },
];

/**
 * Retourne le label d'un transporteur
 */
export function getCarrierLabel(carrier: Carrier): string {
	return CARRIERS.find((c) => c.value === carrier)?.label ?? "Autre transporteur";
}
