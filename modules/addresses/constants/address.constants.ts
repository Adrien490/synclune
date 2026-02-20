/**
 * Constantes du domaine Address
 * Re-exporte les constantes partagees
 *
 * Note: Les cache tags sont definis dans constants/cache.ts
 */

// Re-export des constantes partagees (validation, messages d'erreur)
export { ADDRESS_CONSTANTS, ADDRESS_ERROR_MESSAGES } from "@/shared/constants/address.constants";

// Limits
export const MAX_ADDRESSES_PER_USER = 10;
export const ADDRESS_LIMIT_ERROR = `Vous ne pouvez pas enregistrer plus de ${MAX_ADDRESSES_PER_USER} adresses`;
