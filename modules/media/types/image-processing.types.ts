/**
 * Types pour les services de traitement d'images
 *
 * Regroupe les types pour:
 * - Téléchargement d'images (image-downloader.service)
 * - Génération de ThumbHash (generate-thumbhash)
 *
 * @module modules/media/types/image-processing.types
 */

// ============================================================================
// TYPES COMMUNS
// ============================================================================

/** Fonction de log pour les avertissements */
export type LogFn = (message: string, data?: Record<string, unknown>) => void;

// ============================================================================
// IMAGE DOWNLOADER
// ============================================================================

export interface DownloadImageOptions {
	/** Timeout pour le téléchargement (ms) */
	downloadTimeout?: number;
	/** Taille max de l'image (octets) */
	maxImageSize?: number;
	/** User-Agent personnalisé */
	userAgent?: string;
}

export interface RetryOptions {
	/** Nombre max de tentatives */
	maxRetries?: number;
	/** Délai de base pour backoff exponentiel (ms) */
	baseDelay?: number;
}

// ============================================================================
// THUMBHASH
// ============================================================================

export type ThumbHashLogFn = LogFn;

export interface GenerateThumbHashOptions {
	/** Timeout pour le téléchargement (ms) */
	downloadTimeout?: number;
	/** Taille max de l'image (octets) */
	maxImageSize?: number;
	/** Taille max pour le resize (pixels, max 100) */
	maxSize?: number;
	/** Valider que l'URL est un domaine UploadThing */
	validateDomain?: boolean;
	/** Fonction de log personnalisée (defaut: console.warn) */
	logWarning?: ThumbHashLogFn;
}

export interface ThumbHashResult {
	/** Hash binaire encodé en base64 (~25 bytes) */
	hash: string;
	/** Data URL compatible avec Next.js Image blurDataURL */
	dataUrl: string;
	/** Largeur de l'image analysée */
	width: number;
	/** Hauteur de l'image analysée */
	height: number;
}

