/**
 * Service de détection automatique du transporteur
 * basé sur le format du numéro de suivi
 */

import { ShippingCarrier } from "@/app/generated/prisma/client";
import type { Carrier, DetectionResult } from "../types/carrier.types";
import { CARRIER_TRACKING_URLS, CARRIER_PATTERNS } from "../constants/carrier-urls";

// ============================================================================
// CARRIER DETECTION SERVICE
// Pure business logic for carrier detection and tracking URLs
// ============================================================================

/**
 * Génère l'URL de suivi pour un transporteur donné
 *
 * @param carrier - Type de transporteur
 * @param trackingNumber - Numéro de suivi
 * @returns URL de suivi ou null si non disponible
 */
export function getTrackingUrl(carrier: Carrier, trackingNumber: string): string | null {
	const cleanNumber = trackingNumber.trim();

	switch (carrier) {
		case "colissimo":
		case "lettre_suivie":
			return CARRIER_TRACKING_URLS.LAPOSTE(cleanNumber);
		case "chronopost":
			return CARRIER_TRACKING_URLS.CHRONOPOST(cleanNumber);
		case "mondial_relay":
			return CARRIER_TRACKING_URLS.MONDIAL_RELAY(cleanNumber);
		case "dpd":
			return CARRIER_TRACKING_URLS.DPD(cleanNumber);
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
 * - COLISSIMO : 13 caractères, préfixes 5K, 5W, 6A, 6C, 6G, 6H, 6M, 6Q, 6R, 6W, 7Q, 7R, 8N, 8P, 8Q, 8R, 8V, 9L, 9V, 9W
 * - LETTRE SUIVIE : 13 caractères, préfixes 1H, 1K, 1L, 2L, 3C
 * - MONDIAL RELAY : 8 à 12 chiffres uniquement
 * - DPD : 14 chiffres
 *
 * @param trackingNumber - Numéro de suivi à analyser
 * @returns Résultat de détection avec transporteur, label et URL
 */
export function detectCarrierAndUrl(trackingNumber: string): DetectionResult {
	// Nettoyage : on enlève les espaces, tirets et points copiés par erreur
	const cleanNumber = trackingNumber.trim().replace(/[\s\-\.]/g, '').toUpperCase();

	// Vérification que le numéro n'est pas vide
	if (!cleanNumber) {
		return {
			carrier: "autre",
			label: "Autre transporteur",
			url: null,
		};
	}

	// 1. CHRONOPOST (Format standard: 2 lettres + 9 chiffres + 2 lettres, ex: XY123456789FR)
	if (CARRIER_PATTERNS.CHRONOPOST.test(cleanNumber)) {
		return {
			carrier: "chronopost",
			label: "Chronopost",
			url: CARRIER_TRACKING_URLS.CHRONOPOST(cleanNumber),
		};
	}

	// 2. COLISSIMO (13 caractères, commence souvent par 8N, 9V, 6A, 6M...)
	if (CARRIER_PATTERNS.COLISSIMO.test(cleanNumber)) {
		return {
			carrier: "colissimo",
			label: "Colissimo",
			url: CARRIER_TRACKING_URLS.LAPOSTE(cleanNumber),
		};
	}

	// 3. LETTRE SUIVIE (13 caractères, commence souvent par 1L, 1H, 2L...)
	if (CARRIER_PATTERNS.LETTRE_SUIVIE.test(cleanNumber)) {
		return {
			carrier: "lettre_suivie",
			label: "Lettre Suivie",
			url: CARRIER_TRACKING_URLS.LAPOSTE(cleanNumber),
		};
	}

	// 4. MONDIAL RELAY (8, 10 ou 12 chiffres uniquement)
	if (CARRIER_PATTERNS.MONDIAL_RELAY.test(cleanNumber)) {
		return {
			carrier: "mondial_relay",
			label: "Mondial Relay",
			url: CARRIER_TRACKING_URLS.MONDIAL_RELAY(cleanNumber),
		};
	}

	// 5. DPD (14 chiffres)
	if (CARRIER_PATTERNS.DPD.test(cleanNumber)) {
		return {
			carrier: "dpd",
			label: "DPD",
			url: CARRIER_TRACKING_URLS.DPD(cleanNumber),
		};
	}

	// 6. PAR DÉFAUT (Format inconnu)
	return {
		carrier: "autre",
		label: "Autre transporteur",
		url: null,
	};
}

/**
 * Convertit un Carrier (string local) vers l'enum Prisma ShippingCarrier
 *
 * @param carrier - Type de transporteur local
 * @returns Valeur enum Prisma ou null
 */
export function toShippingCarrierEnum(
	carrier: Carrier | string | undefined | null
): ShippingCarrier | null {
	if (!carrier) return null;

	const mapping: Record<string, ShippingCarrier> = {
		colissimo: "COLISSIMO",
		lettre_suivie: "COLISSIMO", // Lettre suivie est géré par La Poste comme Colissimo
		chronopost: "CHRONOPOST",
		mondial_relay: "MONDIAL_RELAY",
		dpd: "DPD",
		autre: "OTHER",
		// Support des valeurs déjà en majuscules
		COLISSIMO: "COLISSIMO",
		CHRONOPOST: "CHRONOPOST",
		MONDIAL_RELAY: "MONDIAL_RELAY",
		DPD: "DPD",
		OTHER: "OTHER",
	};

	return mapping[carrier.toLowerCase()] || mapping[carrier] || "OTHER";
}
