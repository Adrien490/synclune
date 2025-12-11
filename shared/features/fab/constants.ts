/**
 * Clés des FABs (Floating Action Buttons)
 * Type-safe pour éviter les erreurs de typo
 */
export const FAB_KEYS = {
	CONTACT_ADRIEN: "contact-adrien",
	ADMIN_SPEED_DIAL: "admin-speed-dial",
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
