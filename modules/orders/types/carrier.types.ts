/**
 * Types pour la détection et gestion des transporteurs.
 *
 * L'union `Carrier` couvre exactement ce que `detectCarrierAndUrl` sait
 * produire — les transporteurs sans pattern de détection (GLS, DHL, UPS,
 * FedEx, Relais Colis) tombent dans `autre` et ont quitté l'union avec
 * `getTrackingUrl` (export mort, retiré le 2026-08-15).
 */

type Carrier = "colissimo" | "lettre_suivie" | "mondial_relay" | "chronopost" | "dpd" | "autre";

export interface DetectionResult {
	carrier: Carrier;
	url: string | null;
	label: string;
}
