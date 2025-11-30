/**
 * Constantes centralisées pour la gestion des médias (images et vidéos)
 */

// ============================================================================
// EXTENSIONS SUPPORTÉES
// ============================================================================

/** Extensions vidéo supportées */
export const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".avi"] as const;

/** Extensions image supportées */
export const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"] as const;

// ============================================================================
// MIME TYPES
// ============================================================================

/** Types MIME vidéo */
export const VIDEO_MIME_TYPES = [
	"video/mp4",
	"video/webm",
	"video/quicktime",
	"video/x-msvideo",
] as const;

/** Types MIME image */
export const IMAGE_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"image/avif",
] as const;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Vérifie si une URL pointe vers une vidéo basée sur son extension
 */
export function isVideoUrl(url: string): boolean {
	const lowercaseUrl = url.toLowerCase();
	return VIDEO_EXTENSIONS.some((ext) => lowercaseUrl.endsWith(ext));
}

/**
 * Vérifie si une URL pointe vers une image basée sur son extension
 */
export function isImageUrl(url: string): boolean {
	const lowercaseUrl = url.toLowerCase();
	return IMAGE_EXTENSIONS.some((ext) => lowercaseUrl.endsWith(ext));
}

/**
 * Détecte le type de média (IMAGE ou VIDEO) basé sur l'URL
 */
export function detectMediaType(url: string): "IMAGE" | "VIDEO" {
	return isVideoUrl(url) ? "VIDEO" : "IMAGE";
}

/**
 * Obtient l'extension d'un fichier depuis son URL
 */
export function getFileExtension(url: string): string | null {
	const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
	return match ? `.${match[1].toLowerCase()}` : null;
}

// ============================================================================
// CONFIGURATION THUMBNAILS
// ============================================================================

/** Configuration pour la génération de miniatures vidéo */
export const THUMBNAIL_CONFIG = {
	/** Petite taille pour miniatures galerie (80px * 2 pour Retina) */
	SMALL: {
		width: 160,
		height: 160,
		quality: 0.8,
		format: "webp" as const,
	},
	/** Taille moyenne pour poster vidéo (~500px affichage) */
	MEDIUM: {
		width: 480,
		height: 480,
		quality: 0.85,
		format: "webp" as const,
	},
	/** Position de capture: 10% de la durée vidéo */
	capturePosition: 0.1,
	/** Position max en secondes (évite frames noires de fin) */
	maxCaptureTime: 1,
	/** Timeout pour le chargement vidéo (ms) */
	loadTimeout: 30000,
	/** Nombre de tentatives avant échec */
	maxRetries: 3,
	/** Délai de base pour backoff exponentiel (ms) */
	retryBaseDelay: 1000,
} as const;

/** Type pour les tailles de thumbnails */
export type ThumbnailSize = "SMALL" | "MEDIUM";
