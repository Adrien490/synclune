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
	 * refunds, materials, colors, product-types
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
	 * Utilisé par : products, skus
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
	 * Menu de navigation (navbar)
	 *
	 * Utilisé par : collections, product-types
	 */
	NAVBAR_MENU: "navbar-menu",

	/**
	 * Images du sitemap
	 *
	 * Utilisé par : products, sitemap-images
	 */
	SITEMAP_IMAGES: "sitemap-images",
} as const;

// ============================================
// TAGS PAGES STATIQUES (contenu en dur, profil `reference`)
// ============================================

/**
 * Tags des pages/composants à contenu statique (aucun mutateur DB).
 * Jamais invalidés aujourd'hui — expirent par TTL `reference` (7j).
 * Centralisés ici pour rester visibles du scan cache-scoping et permettre
 * une invalidation ciblée si ces contenus deviennent éditables.
 */
export const STATIC_PAGES_CACHE_TAGS = {
	FOOTER: "footer",
	ATELIER_SECTION: "atelier-section",
	LEGAL_TERMS: "legal-terms",
	LEGAL_PRIVACY: "legal-privacy",
	LEGAL_NOTICE: "legal-notice",
	LEGAL_RETRACTATION: "legal-retractation",
	LEGAL_COOKIES: "legal-cookies",
	LEGAL_HUB: "legal-hub",
	ACCESSIBILITY: "accessibility-page",
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
// SESSION CACHE TAGS (évite cycle auth ↔ users)
// ============================================

/**
 * Tags de cache pour les sessions utilisateur
 *
 * Centralisé ici pour éviter le cycle de dépendances auth ↔ users.
 * Utilisé par users (page détail admin) et invalidé par les mutations
 * de sessions (invalidation admin, suppression de compte, changement
 * de mot de passe avec révocation).
 */
export const SESSION_CACHE_TAGS = {
	/** Sessions actives d'un utilisateur */
	SESSIONS: (userId: string) => `sessions-user-${userId}`,
} as const;
