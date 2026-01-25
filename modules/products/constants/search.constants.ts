// ============================================================================
// FUZZY SEARCH CONFIGURATION
// ============================================================================

/**
 * Seuil de similarité trigram (0.0 - 1.0)
 * Plus bas = plus tolérant aux fautes, plus haut = plus strict
 * 0.3 est un bon équilibre pour la tolérance aux fautes de frappe
 */
export const FUZZY_SIMILARITY_THRESHOLD = 0.3;

/**
 * Longueur minimale pour activer la recherche fuzzy
 * Les trigrams nécessitent au moins 3 caractères pour être efficaces
 * En dessous, on utilise la recherche exacte
 */
export const FUZZY_MIN_LENGTH = 3;

/**
 * Longueur maximale du terme de recherche
 * pg_trgm doit calculer les trigrammes pour chaque caractère
 * Protège contre les attaques DoS avec des termes très longs
 */
export const MAX_SEARCH_LENGTH = 100;

/**
 * Limite de résultats pour la recherche fuzzy
 * Correspond à GET_PRODUCTS_MAX_RESULTS_PER_PAGE
 */
export const FUZZY_MAX_RESULTS = 200;

/**
 * Timeout pour les requêtes fuzzy (ms)
 * Évite les requêtes longues sur gros catalogues
 */
export const FUZZY_TIMEOUT_MS = 2000;

/**
 * Timeout pour les suggestions orthographiques (ms)
 * Moins critique que la recherche principale
 */
export const SPELL_SUGGESTION_TIMEOUT_MS = 1500;

/**
 * Poids de pertinence par type de correspondance
 * Utilisés pour trier les résultats par pertinence
 */
export const RELEVANCE_WEIGHTS = {
	/** Match exact (substring) dans le titre - priorité maximale */
	exactTitle: 10,
	/** Match fuzzy (trigram) dans le titre */
	fuzzyTitle: 5,
	/** Match exact (substring) dans la description */
	exactDescription: 3,
	/** Match fuzzy (trigram) dans la description */
	fuzzyDescription: 2,
} as const;

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Limites de requêtes pour la recherche
 * Protège contre le scraping et les abus
 */
export const SEARCH_RATE_LIMITS = {
	/** Limite pour utilisateurs authentifiés */
	authenticated: { limit: 30, windowMs: 60_000 },
	/** Limite pour visiteurs non authentifiés */
	guest: { limit: 15, windowMs: 60_000 },
} as const;
