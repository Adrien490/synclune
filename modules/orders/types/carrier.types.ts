/**
 * Types pour la détection et gestion des transporteurs
 */

export type Carrier =
	| "colissimo"
	| "lettre_suivie"
	| "mondial_relay"
	| "chronopost"
	| "autre";

export interface CarrierInfo {
	value: Carrier;
	label: string;
}

export interface DetectionResult {
	carrier: Carrier;
	url: string | null;
	label: string;
}
