/**
 * Constantes centralisées pour la gestion des médias (images et vidéos)
 */

// ============================================================================
// LIMITES DE MÉDIAS PAR ITEM
// ============================================================================

/** Nombre maximum de médias par produit/SKU (total) */
export const MAX_MEDIA_PER_ITEM = 6;

/** Nombre maximum de médias dans la galerie SKU (hors image primaire) */
export const MAX_GALLERY_MEDIA = 5;

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
	/** Taille pour poster vidéo (~500px affichage) */
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
	downloadTimeout: 60_000,
	/** Timeout pour les commandes FFmpeg (ms) */
	ffmpegTimeout: 30_000,
	/** Taille max des vidéos en octets (512 MB - aligné sur UploadThing) */
	maxVideoSize: 512 * 1024 * 1024,
	/** Durée max recommandée pour vidéos produit (secondes) */
	maxVideoDuration: 120,
	/** Domaines UploadThing autorisés pour le téléchargement */
	allowedDomains: ALLOWED_UPLOADTHING_DOMAINS,
	/** Timeout pour validation format vidéo avec FFmpeg (ms) */
	validationTimeout: 10_000,
	/** Timeout pour extraction infos vidéo / durée (ms) */
	infoTimeout: 10_000,
	/** Timeout pour génération blur placeholder (ms) */
	blurTimeout: 5_000,
} as const;

// ============================================================================
// CONFIGURATION TRAITEMENT AUDIO
// ============================================================================

/** Configuration pour la suppression audio des vidéos */
export const VIDEO_AUDIO_CONFIG = {
	/** Supprimer automatiquement l'audio lors de l'upload */
	stripAudioOnUpload: true,
	/** Timeout FFmpeg pour suppression audio (ms) - plus long car potentiel re-encoding */
	stripAudioTimeout: 120_000,
} as const;

/** Type pour les tailles de thumbnails */
export type ThumbnailSize = "MEDIUM";

// ============================================================================
// CONFIGURATION THUMBNAILS CLIENT-SIDE (Canvas API)
// ============================================================================

/**
 * Configuration pour la generation de thumbnails cote client
 * Utilise l'API Canvas HTML5, compatible avec Vercel serverless
 */
export const CLIENT_THUMBNAIL_CONFIG = {
	/** Largeur du thumbnail en pixels */
	width: 480,
	/** Qualite JPEG (0-1) */
	quality: 0.8,
	/** Position de capture en ratio de la duree (0.1 = 10%) */
	capturePosition: 0.1,
	/** Temps max de capture en secondes */
	maxCaptureTime: 1,
	/** Format de sortie */
	format: "image/jpeg" as const,
	/** Taille du blur placeholder en pixels */
	blurSize: 8,
} as const;

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

// ============================================================================
// CONFIGURATION PLACEHOLDERS COULEUR OPTIMISES (RECOMMANDE)
// ============================================================================

/**
 * Configuration pour la génération de placeholders couleur optimisés
 *
 * Avantages vs blur base64:
 * - Taille: ~50 bytes (SVG) vs ~200-300 bytes (base64 JPEG)
 * - Performance: analyse sur 8x8px vs 10x10px avec encoding
 * - Qualité visuelle: gradient subtil au lieu de blur pixelisé
 */
export const COLOR_PLACEHOLDER_CONFIG = {
	/** Timeout pour le téléchargement d'image (ms) */
	downloadTimeout: 30000,
	/** Taille max des images en octets (20 MB) */
	maxImageSize: 20 * 1024 * 1024,
	/** Taille de resize pour l'analyse couleur (pixels) - 8x8 suffit pour la dominante */
	analysisSize: 8,
	/** Pourcentage d'assombrissement pour le gradient (0.15 = 15% plus sombre) */
	darkenPercent: 0.15,
	/** Nombre de tentatives avant échec */
	maxRetries: 3,
	/** Délai de base pour backoff exponentiel (ms) */
	retryBaseDelay: 1000,
	/** Pause entre batches (ms) */
	batchDelay: 500,
	/** Domaines autorisés pour le téléchargement */
	allowedDomains: ALLOWED_UPLOADTHING_DOMAINS,
} as const;

// ============================================================================
// CONFIGURATION THUMBHASH (STANDARD 2025 - RECOMMANDE)
// ============================================================================

/**
 * Configuration pour la génération de ThumbHash placeholders
 *
 * ThumbHash est le standard 2025, créé par l'auteur d'esbuild:
 * - Ultra-compact: ~25 bytes (vs ~200-300 bytes pour plaiceholder)
 * - Support transparence (alpha channel)
 * - Encode l'aspect ratio automatiquement
 * - Meilleure fidélité des couleurs que BlurHash
 *
 * @see https://evanw.github.io/thumbhash/
 */
export const THUMBHASH_CONFIG = {
	/** Timeout pour le téléchargement d'image (ms) */
	downloadTimeout: 30000,
	/** Taille max des images en octets (20 MB) */
	maxImageSize: 20 * 1024 * 1024,
	/** Taille max pour le resize (pixels) - ThumbHash limite à 100x100 */
	maxSize: 100,
	/** Nombre de tentatives avant échec */
	maxRetries: 3,
	/** Délai de base pour backoff exponentiel (ms) */
	retryBaseDelay: 1000,
	/** Pause entre batches (ms) */
	batchDelay: 500,
	/** Domaines autorisés pour le téléchargement */
	allowedDomains: ALLOWED_UPLOADTHING_DOMAINS,
} as const;

// ============================================================================
// UI INTERACTION DELAYS
// ============================================================================

/**
 * Délais d'interaction UI pour les composants média
 * Utilisés dans media-upload-grid, lightbox, etc.
 */
export const UI_DELAYS = {
	/** Durée d'affichage du hint "long press" (ms) */
	HINT_DISAPPEAR_MS: 4000,
	/** Délai d'activation du long press mobile (ms) */
	LONG_PRESS_ACTIVATION_MS: 250,
	/** Tolérance de mouvement pendant long press (px) */
	LONG_PRESS_TOLERANCE_PX: 5,
	/** Distance minimale pour activer le drag (px) */
	DRAG_ACTIVATION_DISTANCE_PX: 8,
	/** Délai double-tap pour zoom (ms) */
	DOUBLE_TAP_DELAY_MS: 300,
	/** Délai double-click pour zoom (ms) */
	DOUBLE_CLICK_DELAY_MS: 300,
	/** Durée animation fade lightbox (ms) */
	ANIMATION_FADE_MS: 350,
	/** Durée animation swipe lightbox (ms) */
	ANIMATION_SWIPE_MS: 300,
	/** Délai avant stabilisation frame vidéo (ms) */
	VIDEO_FRAME_STABILIZATION_MS: 50,
} as const;

// ============================================================================
// LIGHTBOX CONFIGURATION
// ============================================================================

/**
 * Configuration du composant lightbox (yet-another-react-lightbox)
 */
export const LIGHTBOX_CONFIG = {
	/** Ratio de zoom maximum (3x) */
	MAX_ZOOM_PIXEL_RATIO: 3,
	/** Multiplicateur de zoom (2x par action) */
	ZOOM_IN_MULTIPLIER: 2,
	/** Nombre max de stops pour double-click zoom */
	DOUBLE_CLICK_MAX_STOPS: 2,
	/** Distance de déplacement au clavier (px) */
	KEYBOARD_MOVE_DISTANCE: 50,
	/** Facteur distance scroll wheel pour zoom */
	WHEEL_ZOOM_DISTANCE_FACTOR: 100,
	/** Facteur distance pinch pour zoom */
	PINCH_ZOOM_DISTANCE_FACTOR: 100,
	/** Nombre d'images à précharger dans le carousel */
	CAROUSEL_PRELOAD: 2,
	/** Position du compteur (offset du bas en px) */
	COUNTER_BOTTOM_OFFSET: 16,
	/** Opacité du fond (rgba) */
	BACKDROP_OPACITY: 0.95,
	/** Intensité du blur du fond (px) */
	BACKDROP_BLUR: 20,
} as const;

// ============================================================================
// VIDEO FRAME VALIDATION
// ============================================================================

/**
 * Configuration pour la validation des frames vidéo
 * Utilisée pour détecter les frames noires/blanches à éviter
 */
export const FRAME_VALIDATION = {
	/** Seuil RGB pour considérer un pixel comme noir */
	BLACK_THRESHOLD: 15,
	/** Seuil RGB pour considérer un pixel comme blanc */
	WHITE_THRESHOLD: 240,
	/** Ratio max de pixels noirs/blancs pour frame valide (95%) */
	INVALID_PIXEL_RATIO: 0.95,
	/** Facteur d'échantillonnage des pixels (1 sur N) - 16 = 1 pixel sur 4 */
	SAMPLE_FACTOR: 16,
	/** Taille max de l'échantillon pour validation (px) */
	MAX_SAMPLE_SIZE: 50,
} as const;

// ============================================================================
// VIDEO EVENT TIMEOUTS
// ============================================================================

/**
 * Timeouts pour les événements vidéo HTML5
 * Utilisés dans use-video-thumbnail.ts
 */
export const VIDEO_EVENT_TIMEOUTS = {
	/** Timeout par défaut pour les événements vidéo (ms) */
	DEFAULT_MS: 5000,
	/** Timeout pour l'événement loadedmetadata (ms) */
	LOADED_METADATA_MS: 10000,
	/** Timeout pour l'événement seeked (ms) */
	SEEKED_MS: 5000,
} as const;
