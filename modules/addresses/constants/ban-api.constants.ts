/**
 * Constantes pour l'API d'autocomplétion BAN (Base Adresse Nationale)
 * API: https://data.geopf.fr/geocodage/completion
 */

/**
 * URL de base de l'API d'autocomplétion de l'IGN
 */
export const BAN_API_BASE_URL = "https://data.geopf.fr/geocodage/completion";

/**
 * Limite par défaut de résultats (selon Swagger: default 10)
 */
export const SEARCH_ADDRESS_DEFAULT_LIMIT = 10;

/**
 * Limite maximale de résultats autorisée par l'API d'autocomplétion
 * L'API limite entre 1 et 15
 */
export const SEARCH_ADDRESS_MAX_LIMIT = 15;

/**
 * Type de localisant par défaut
 */
export const SEARCH_ADDRESS_DEFAULT_TYPE = "PositionOfInterest,StreetAddress" as const;
