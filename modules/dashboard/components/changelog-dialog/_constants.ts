/**
 * Configuration UI pour le Dialog Changelog
 *
 * Note: Les constantes de configuration data (CHANGELOG_CONFIG, METADATA_FIELDS)
 * sont définies dans get-changelogs.ts pour éviter la duplication.
 */

/**
 * Configuration UI du Dialog
 */
export const CHANGELOG_UI_CONFIG = {
	/** Hauteur maximale viewport (responsive) */
	MAX_HEIGHT_VH: "80vh",
	/** Hauteur maximale absolue en pixels */
	MAX_HEIGHT_PX: "800px",
	/** Hauteur minimale du dialog */
	MIN_HEIGHT: "400px",
	/** Largeur maximale du dialog (Tailwind class) */
	MAX_WIDTH: "2xl",
} as const;

/**
 * Nombre de jours pour considérer une release comme récente
 */
export const RECENT_RELEASE_DAYS = 7;
