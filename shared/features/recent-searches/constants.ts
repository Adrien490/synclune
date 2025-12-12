/**
 * Configuration des recherches recentes
 */

/** Nom du cookie pour stocker les recherches */
export const RECENT_SEARCHES_COOKIE_NAME = "recent-searches"

/** Nombre maximum de recherches a conserver */
export const RECENT_SEARCHES_MAX_ITEMS = 5

/** Duree de vie du cookie (30 jours) */
export const RECENT_SEARCHES_COOKIE_MAX_AGE = 60 * 60 * 24 * 30

/** Longueur minimum d'une recherche pour etre stockee */
export const RECENT_SEARCHES_MIN_LENGTH = 2
