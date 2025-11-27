/**
 * Configuration pour le système de changelog MDX
 */
export const CHANGELOG_CONFIG = {
	/** Chemin relatif vers le dossier contenant les fichiers MDX */
	CONTENT_PATH: "app/admin/_components/changelog-dialog/_content",

	/** Messages d'erreur */
	ERRORS: {
		NO_CONTENT_DIRECTORY: "Changelog content directory not found:",
		INVALID_METADATA: "Invalid metadata structure",
		MISSING_REQUIRED_FIELD: "Missing required metadata field",
	},

	/** Configuration UI du Dialog */
	UI: {
		/** Hauteur maximale du dialog (responsive viewport) */
		MAX_HEIGHT: "80vh",
		/** Hauteur minimale du dialog */
		MIN_HEIGHT: "400px",
		/** Largeur maximale du dialog */
		MAX_WIDTH: "2xl",
	},
} as const;

/**
 * Définition des champs de metadata
 */
export const METADATA_FIELDS = {
	/** Champs obligatoires pour chaque changelog */
	REQUIRED: ["version", "date", "description"] as const,

	/** Champs optionnels */
	OPTIONAL: [] as const,
} as const;

/**
 * Nombre de jours pour considérer une release comme récente
 */
export const RECENT_RELEASE_DAYS = 7;
