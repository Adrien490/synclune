/**
 * Constantes du domaine Address
 * Re-exporte les constantes partagees et ajoute les constantes specifiques au module
 */

// Re-export des constantes partagees (validation, messages d'erreur)
export { ADDRESS_CONSTANTS, ADDRESS_ERROR_MESSAGES } from "@/shared/constants/address.constants";

// Constantes specifiques au module (cache)
export const CACHE_TAGS = {
	USER_ADDRESSES: (userId: string) => `addresses:user:${userId}`,
	DEFAULT_ADDRESS: (userId: string) => `address:default:${userId}`,
} as const;
