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

	/**
	 * Liste des produits (cross-module)
	 *
	 * Utilisé par : products, collections, skus
	 * Ce tag est partagé pour éviter les cycles de dépendances entre modules
	 */
	PRODUCTS_LIST: "products-list",

	/**
	 * Liste des SKUs (cross-module)
	 *
	 * Utilisé par : skus, dashboard
	 */
	SKUS_LIST: "skus-list",
} as const;

// ============================================
// STOCK THRESHOLDS (cross-module)
// ============================================

/**
 * Seuils de stock centralisés.
 * Ces valeurs sont utilisées pour :
 * - Filtrage dans l'inventaire admin (critical, low, normal, high)
 * - Affichage d'alertes sur la boutique
 * - Alertes stock dans le dashboard admin
 *
 * Partagé entre modules pour éviter les cycles skus ↔ dashboard
 */
export const STOCK_THRESHOLDS = {
	/** Stock critique : <= CRITICAL (alertes urgentes, 1 seul item) */
	CRITICAL: 1,
	/** Stock bas : <= LOW (alertes préventives, 1-3 items) */
	LOW: 3,
	/** Stock normal max : <= NORMAL_MAX */
	NORMAL_MAX: 50,
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

// ============================================
// SESSION CACHE TAGS (évite cycle auth ↔ users)
// ============================================

/**
 * Tags de cache pour les sessions utilisateur
 *
 * Centralisé ici pour éviter le cycle de dépendances auth ↔ users.
 * Ces tags sont utilisés par :
 * - auth: pour invalider la session lors du logout
 * - users: pour invalider les sessions lors de modifications
 */
export const SESSION_CACHE_TAGS = {
	/** Session de l'utilisateur courant */
	SESSION: (userId: string) => `session-${userId}`,
	/** Sessions actives d'un utilisateur */
	SESSIONS: (userId: string) => `sessions-user-${userId}`,
} as const;

/**
 * Tags à invalider lors de la modification de la session de l'utilisateur
 * (connexion, déconnexion, rafraîchissement de session)
 */
export function getSessionInvalidationTags(userId: string): string[] {
	return [SESSION_CACHE_TAGS.SESSION(userId)];
}
