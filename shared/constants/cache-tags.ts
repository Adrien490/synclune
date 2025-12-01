/**
 * Tags de cache partagés entre modules
 *
 * Ce fichier centralise les tags de cache qui sont utilisés par plusieurs modules.
 * Cela évite le couplage direct entre modules (ex: orders dépendant de dashboard).
 *
 * Convention de nommage :
 * - Préfixe "admin-" pour les tags liés à l'interface d'administration
 * - Préfixe du module pour les tags spécifiques (ex: "products-", "orders-")
 */

// ============================================
// TAGS PARTAGÉS - ADMIN / DASHBOARD
// ============================================

/**
 * Tags de cache partagés pour l'interface admin
 *
 * Ces tags sont utilisés par plusieurs modules pour invalider :
 * - Les badges de la sidebar (compteurs de notifications)
 * - Les listes admin (commandes, clients, inventaire)
 */
export const SHARED_CACHE_TAGS = {
	/**
	 * Badges de la sidebar admin (compteurs de notifications)
	 *
	 * Utilisé par : orders, products, skus, discounts, collections,
	 * newsletter, stock-notifications, refunds, materials, colors, product-types
	 */
	ADMIN_BADGES: "admin-badges",

	/**
	 * Liste des commandes dans l'admin
	 *
	 * Utilisé par : orders, payments, refunds
	 */
	ADMIN_ORDERS_LIST: "admin-orders-list",

	/**
	 * Liste des clients dans l'admin
	 *
	 * Utilisé par : orders, users
	 */
	ADMIN_CUSTOMERS_LIST: "admin-customers-list",

	/**
	 * Liste de l'inventaire dans l'admin
	 *
	 * Utilisé par : products, skus, stock-notifications
	 */
	ADMIN_INVENTORY_LIST: "admin-inventory-list",
} as const;

// ============================================
// HELPERS D'INVALIDATION CENTRALISÉS
// ============================================

/**
 * Retourne le tag des badges admin
 * Utiliser pour invalider les compteurs de la sidebar
 */
export function getAdminBadgesTag(): string {
	return SHARED_CACHE_TAGS.ADMIN_BADGES;
}

/**
 * Retourne les tags pour l'invalidation de l'inventaire admin
 */
export function getAdminInventoryTags(): string[] {
	return [SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST, SHARED_CACHE_TAGS.ADMIN_BADGES];
}

/**
 * Retourne les tags pour l'invalidation des commandes admin
 */
export function getAdminOrdersTags(): string[] {
	return [SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST, SHARED_CACHE_TAGS.ADMIN_BADGES];
}

/**
 * Retourne les tags pour l'invalidation des clients admin
 */
export function getAdminCustomersTags(): string[] {
	return [SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST, SHARED_CACHE_TAGS.ADMIN_BADGES];
}

// ============================================
// TYPE EXPORTS
// ============================================

export type SharedCacheTagKey = keyof typeof SHARED_CACHE_TAGS;
export type SharedCacheTagValue = (typeof SHARED_CACHE_TAGS)[SharedCacheTagKey];
