/**
 * Clés des FABs (Floating Action Buttons)
 * Type-safe pour éviter les erreurs de typo
 */
export const FAB_KEYS = {
	/** FAB de contact Adrien dans le tableau de bord admin */
	CONTACT_ADRIEN: "contact-adrien",
	/** Speed dial admin (actions rapides) - TODO: à implémenter */
	ADMIN_SPEED_DIAL: "admin-speed-dial",
	/** FAB pour la boutique (site public) - TODO: à implémenter */
	STOREFRONT: "storefront",
	/** FAB pour acceder au tableau de bord admin depuis le site public - TODO: à implémenter */
	ADMIN_DASHBOARD: "admin-dashboard",
} as const;

export type FabKey = (typeof FAB_KEYS)[keyof typeof FAB_KEYS];

/** Préfixe pour les cookies de visibilité FAB */
export const FAB_COOKIE_PREFIX = "fab-hidden-";

/** Durée de vie du cookie (1 an) */
export const FAB_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Génère le nom du cookie pour une clé FAB donnée
 */
export function getFabCookieName(key: FabKey): string {
	return `${FAB_COOKIE_PREFIX}${key}`;
}
