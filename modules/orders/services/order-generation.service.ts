/**
 * Service de génération de commandes
 *
 * Ce module contient les fonctions pures pour :
 * - Générer des numéros de commande uniques
 */

import { randomBytes } from "node:crypto";

// ============================================================================
// ORDER GENERATION SERVICE
// Pure functions for generating order identifiers
// ============================================================================

/**
 * Génère un numéro de commande unique.
 *
 * Format : `CMD-{timestamp}-{12 hex CSPRNG}`
 * Exemple : `CMD-1704067200000-A1B2C3D4E5F6`
 *
 * Sécurité (EINV-SEC-006) : suffix généré via `crypto.randomBytes(6)` (CSPRNG)
 * → entropie 48 bits (~2.8 × 10¹⁴), résistant à l'énumération combinée avec
 * `Date.now()` connu. L'ancien `Math.random().slice(2,6)` n'offrait que ~21 bits.
 */
export function generateOrderNumber(): string {
	const timestamp = Date.now();
	const randomSuffix = randomBytes(6).toString("hex").toUpperCase();

	return `CMD-${timestamp}-${randomSuffix}`;
}
