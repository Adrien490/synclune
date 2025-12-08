/**
 * Tags de cache pour le module Stock Notifications
 *
 * Fonctions: voir utils/cache.utils.ts
 */

// ============================================
// CACHE TAGS
// ============================================

export const STOCK_NOTIFICATIONS_CACHE_TAGS = {
	/** Liste des demandes de notification en attente */
	PENDING_LIST: "stock-notifications-pending-list",

	/** Demandes de notification pour un SKU spécifique */
	BY_SKU: (skuId: string) => `stock-notifications-sku-${skuId}`,

	/** Demandes de notification pour un utilisateur */
	BY_USER: (userId: string) => `stock-notifications-user-${userId}`,

	/** Demandes de notification par email */
	BY_EMAIL: (email: string) => `stock-notifications-email-${email}`,

	/** Demande de notification par token */
	BY_TOKEN: (token: string) => `stock-notifications-token-${token}`,
} as const;

// Re-exports pour retrocompatibilite
export {
	cacheStockNotificationsList,
	cacheStockNotificationsBySku,
	getStockNotificationInvalidationTags,
	getNotifyStockInvalidationTags,
} from "../utils/cache.utils";
