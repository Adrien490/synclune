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
	/** Nombre de tentatives avant échec */
	maxRetries: 3,
	/** Délai de base pour backoff exponentiel (ms) */
	retryBaseDelay: 1000,

	// Timeouts pour le traitement synchrone (service)
	/** Timeout pour le téléchargement vidéo (ms) */
	downloadTimeout: 60_000,
	/** Timeout pour les commandes FFmpeg (ms) */
	ffmpegTimeout: 30_000,
	/** Timeout pour FFprobe (ms) */
	ffprobeTimeout: 10_000,
	/** Timeout pour génération blur placeholder (ms) */
	blurTimeout: 5_000,

	// Limites pour le traitement synchrone (upload temps réel)
	/** Taille max vidéo pour traitement synchrone (50 MB) */
	maxSyncVideoSize: 50 * 1024 * 1024,
	/** Durée fallback si FFprobe échoue (secondes) */
	fallbackDuration: 10,
} as const;

// ============================================================================
// CONFIGURATION SCRIPT MIGRATION THUMBNAILS
// ============================================================================

/** Domaines UploadThing autorises pour le telechargement */
export const ALLOWED_UPLOADTHING_DOMAINS = [
	"utfs.io",
	"uploadthing.com",
	"ufs.sh",
] as const;

/** Configuration pour le script de migration generate-video-thumbnails.ts */
export const VIDEO_MIGRATION_CONFIG = {
	/** Timeout pour le téléchargement de vidéo (ms) */
	downloadTimeout: 60000,
	/** Timeout pour les commandes FFmpeg (ms) */
	ffmpegTimeout: 30000,
	/** Taille max des vidéos en octets (512 MB - aligné sur UploadThing) */
	maxVideoSize: 512 * 1024 * 1024,
	/** Durée max recommandée pour vidéos produit (secondes) */
	maxVideoDuration: 120,
	/** Domaines UploadThing autorisés pour le téléchargement */
	allowedDomains: ALLOWED_UPLOADTHING_DOMAINS,
} as const;

/** Type pour les tailles de thumbnails */
export type ThumbnailSize = "SMALL" | "MEDIUM";

// ============================================================================
// CONFIGURATION BLUR PLACEHOLDERS
// ============================================================================

/** Configuration pour la génération de blur placeholders (images) */
export const BLUR_PLACEHOLDER_CONFIG = {
	/** Timeout pour le téléchargement d'image (ms) */
	downloadTimeout: 30000,
	/** Taille max des images en octets (20 MB) */
	maxImageSize: 20 * 1024 * 1024,
	/** Taille du placeholder blur (en pixels, plaiceholder size) */
	plaiceholderSize: 10,
	/** Nombre de tentatives avant échec */
	maxRetries: 3,
	/** Délai de base pour backoff exponentiel (ms) */
	retryBaseDelay: 1000,
	/** Pause entre batches (ms) */
	batchDelay: 500,
	/** Domaines autorisés pour le téléchargement */
	allowedDomains: ALLOWED_UPLOADTHING_DOMAINS,
} as const;
