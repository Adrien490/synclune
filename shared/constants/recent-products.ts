/**
 * Configuration des produits recemment vus
 */

/** Nom du cookie pour stocker les produits vus */
export const RECENT_PRODUCTS_COOKIE_NAME = "recent-products"

/** Nombre maximum de produits a conserver dans le cookie */
export const RECENT_PRODUCTS_MAX_ITEMS = 10

/** Nombre de produits a afficher dans la section */
export const RECENT_PRODUCTS_DISPLAY_LIMIT = 8

/** Duree de vie du cookie (30 jours) */
export const RECENT_PRODUCTS_COOKIE_MAX_AGE = 60 * 60 * 24 * 30
