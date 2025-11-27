/**
 * Utilitaire de détection automatique du transporteur
 * basé sur le format du numéro de suivi
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

export const CARRIERS: CarrierInfo[] = [
	{ value: "colissimo", label: "Colissimo" },
	{ value: "lettre_suivie", label: "Lettre Suivie" },
	{ value: "mondial_relay", label: "Mondial Relay" },
	{ value: "chronopost", label: "Chronopost" },
	{ value: "autre", label: "Autre transporteur" },
];

export interface DetectionResult {
	carrier: Carrier;
	url: string | null;
	label: string;
}

/**
 * Génère l'URL de suivi pour un transporteur donné
 */
export function getTrackingUrl(carrier: Carrier, trackingNumber: string): string | null {
	const cleanNumber = trackingNumber.trim();

	switch (carrier) {
		case "colissimo":
		case "lettre_suivie":
			return `https://www.laposte.fr/outils/suivre-vos-envois?code=${cleanNumber}`;
		case "chronopost":
			return `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${cleanNumber}`;
		case "mondial_relay":
			// Note : Mondial Relay nécessite parfois le code postal, lien générique ici
			return `https://www.mondialrelay.fr/suivi-de-colis?numeroExpedition=${cleanNumber}`;
		case "autre":
		default:
			return null;
	}
}

/**
 * Détecte automatiquement le transporteur et génère l'URL de suivi
 * basé sur le format du numéro de suivi
 *
 * Formats reconnus :
 * - CHRONOPOST : 2 lettres + 9 chiffres + 2 lettres (ex: XY123456789FR)
 * - COLISSIMO : 13 caractères, préfixes 5K, 6A, 6C, 6H, 6M, 6Q, 6W, 7Q, 7R, 8N, 8P, 8Q, 8V, 9V, 9W
 * - LETTRE SUIVIE : 13 caractères, préfixes 1H, 1K, 1L, 2L, 3C
 * - MONDIAL RELAY : 8 à 12 chiffres uniquement
 */
export function detectCarrierAndUrl(trackingNumber: string): DetectionResult {
	// Nettoyage : on enlève les espaces vides copiés par erreur
	const cleanNumber = trackingNumber.trim().toUpperCase();

	// Vérification que le numéro n'est pas vide
	if (!cleanNumber) {
		return {
			carrier: "autre",
			label: "Autre transporteur",
			url: null,
		};
	}

	// 1. CHRONOPOST (Format standard: 2 lettres + 9 chiffres + 2 lettres, ex: XY123456789FR)
	if (/^[A-Z]{2}[0-9]{9}[A-Z]{2}$/.test(cleanNumber)) {
		return {
			carrier: "chronopost",
			label: "Chronopost",
			url: `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${cleanNumber}`,
		};
	}

	// 2. COLISSIMO (13 caractères, commence souvent par 8N, 9V, 6A, 6M...)
	// Regex : commence par un de ces préfixes + 11 caractères alphanumériques
	if (
		/^(5K|6A|6C|6H|6M|6Q|6W|7Q|7R|8N|8P|8Q|8V|9V|9W)[0-9A-Z]{11}$/.test(
			cleanNumber
		)
	) {
		return {
			carrier: "colissimo",
			label: "Colissimo",
			url: `https://www.laposte.fr/outils/suivre-vos-envois?code=${cleanNumber}`,
		};
	}

	// 3. LETTRE SUIVIE (13 caractères, commence souvent par 1L, 1H, 2L...)
	if (/^(1H|1K|1L|2L|3C)[0-9A-Z]{11}$/.test(cleanNumber)) {
		return {
			carrier: "lettre_suivie",
			label: "Lettre Suivie",
			url: `https://www.laposte.fr/outils/suivre-vos-envois?code=${cleanNumber}`,
		};
	}

	// 4. MONDIAL RELAY (8, 10 ou 12 chiffres uniquement)
	if (/^[0-9]{8,12}$/.test(cleanNumber)) {
		return {
			carrier: "mondial_relay",
			label: "Mondial Relay",
			url: `https://www.mondialrelay.fr/suivi-de-colis?numeroExpedition=${cleanNumber}`,
		};
	}

	// 5. PAR DÉFAUT (Format inconnu)
	return {
		carrier: "autre",
		label: "Autre transporteur",
		url: null,
	};
}

/**
 * Retourne le label d'un transporteur
 */
export function getCarrierLabel(carrier: Carrier): string {
	return CARRIERS.find((c) => c.value === carrier)?.label ?? "Autre transporteur";
}
