/**
 * Carrier tracking URLs - Centralized carrier tracking URL builders
 * Used for generating tracking links for different shipping carriers
 */

// ============================================================================
// CARRIER TRACKING URL BUILDERS
// ============================================================================

/**
 * URL builders for carrier tracking pages
 * Each function takes a tracking number and returns the full tracking URL
 */
export const CARRIER_TRACKING_URLS = {
	/**
	 * La Poste tracking (Colissimo, Lettre Suivie)
	 * Format: https://www.laposte.fr/outils/suivre-vos-envois?code=XXX
	 */
	LAPOSTE: (trackingNumber: string) =>
		`https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(trackingNumber)}`,

	/**
	 * Chronopost tracking
	 * Format: https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=XXX
	 */
	CHRONOPOST: (trackingNumber: string) =>
		`https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${encodeURIComponent(trackingNumber)}`,

	/**
	 * Mondial Relay tracking
	 * Note: May require postal code for some shipments
	 * Format: https://www.mondialrelay.fr/suivi-de-colis?numeroExpedition=XXX
	 */
	MONDIAL_RELAY: (trackingNumber: string) =>
		`https://www.mondialrelay.fr/suivi-de-colis?numeroExpedition=${encodeURIComponent(trackingNumber)}`,

	/**
	 * DPD tracking (France)
	 * Format: https://trace.dpd.fr/fr/trace/XXX
	 */
	DPD: (trackingNumber: string) =>
		`https://trace.dpd.fr/fr/trace/${encodeURIComponent(trackingNumber)}`,

} as const;

// ============================================================================
// CARRIER DETECTION PATTERNS
// ============================================================================

/**
 * Regex patterns for automatic carrier detection based on tracking number format
 */
export const CARRIER_PATTERNS = {
	/**
	 * Chronopost: 2 letters + 9 digits + 2 letters (e.g., XY123456789FR)
	 */
	CHRONOPOST: /^[A-Z]{2}[0-9]{9}[A-Z]{2}$/,

	/**
	 * Colissimo: 13 chars starting with specific prefixes
	 * Prefixes: 5K, 5W, 6A, 6C, 6G, 6H, 6M, 6Q, 6R, 6W, 7Q, 7R, 8N, 8P, 8Q, 8R, 8V, 9L, 9V, 9W
	 */
	COLISSIMO: /^(5K|5W|6A|6C|6G|6H|6M|6Q|6R|6W|7Q|7R|8N|8P|8Q|8R|8V|9L|9V|9W)[0-9A-Z]{11}$/,

	/**
	 * Lettre Suivie: 13 chars starting with specific prefixes
	 * Prefixes: 1H, 1K, 1L, 2L, 3C
	 */
	LETTRE_SUIVIE: /^(1H|1K|1L|2L|3C)[0-9A-Z]{11}$/,

	/**
	 * Mondial Relay: 8 to 12 digits only
	 */
	MONDIAL_RELAY: /^[0-9]{8,12}$/,

	/**
	 * DPD: 14 digits (France format)
	 */
	DPD: /^[0-9]{14}$/,
} as const;
