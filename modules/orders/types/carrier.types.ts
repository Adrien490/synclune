/**
 * Types pour la détection et gestion des transporteurs
 */

export type Carrier =
	| "colissimo"
	| "lettre_suivie"
	| "mondial_relay"
	| "chronopost"
	| "dpd"
	| "gls"
	| "dhl"
	| "ups"
	| "fedex"
	| "relais_colis"
	| "autre";

export interface DetectionResult {
	carrier: Carrier;
	url: string | null;
	label: string;
}
