/**
 * Constantes pour les services de requetes SQL avancees (bestsellers, popularite)
 */

// ============================================================================
// QUERY TIMEOUTS
// ============================================================================

/**
 * Timeouts pour les requetes SQL complexes
 * Evite les blocages en cas de DB lente
 */
export const QUERY_TIMEOUTS = {
	/** Timeout pour la requete bestsellers (ms) */
	BESTSELLER_MS: 5000,
	/** Timeout pour la requete popularite (ms) */
	POPULARITY_MS: 5000,
} as const

// ============================================================================
// BESTSELLER CONFIGURATION
// ============================================================================

/**
 * Configuration pour le calcul des meilleures ventes
 */
export const BESTSELLER_CONFIG = {
	/** Periode de calcul en jours */
	DAYS: 30,
	/** Limite par defaut */
	DEFAULT_LIMIT: 200,
	/** Limite maximale */
	MAX_LIMIT: 1000,
} as const

// ============================================================================
// POPULARITY CONFIGURATION
// ============================================================================

/**
 * Configuration pour le calcul de la popularite
 */
export const POPULARITY_CONFIG = {
	/** Periode de calcul en jours */
	DAYS: 30,
	/** Poids des ventes dans le score */
	SALES_WEIGHT: 3,
	/** Poids des avis dans le score */
	REVIEWS_WEIGHT: 2,
	/** Limite par defaut */
	DEFAULT_LIMIT: 200,
	/** Limite maximale */
	MAX_LIMIT: 1000,
} as const
