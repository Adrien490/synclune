/**
 * Types pour les hooks du module media
 *
 * @module modules/media/types/hooks.types
 */

// ============================================================================
// MEDIA UPLOAD TYPES
// ============================================================================

export interface UseMediaUploadOptions {
	/** Taille max pour les images en bytes (defaut: 16MB) */
	maxSizeImage?: number;
	/** Taille max pour les videos en bytes (defaut: 512MB) */
	maxSizeVideo?: number;
	/** Nombre max de fichiers (defaut: 10) */
	maxFiles?: number;
	/** Concurrence max pour les uploads de videos (defaut: 2) */
	videoConcurrency?: number;
	/** Callback appele apres un upload reussi */
	onSuccess?: (results: MediaUploadResult[]) => void;
	/** Callback appele en cas d'erreur */
	onError?: (error: Error) => void;
	/** Callback appele avec la progression */
	onProgress?: (progress: UploadProgress) => void;
}

export interface MediaUploadResult {
	/** URL du fichier uploade */
	url: string;
	/** Type de media */
	mediaType: "IMAGE" | "VIDEO";
	/** Nom original du fichier */
	fileName: string;
	/** Blur placeholder en base64 (images et videos) */
	blurDataUrl?: string;
	/** URL du thumbnail (videos uniquement) */
	thumbnailUrl?: string;
}

export interface UploadProgress {
	/** Nombre total de fichiers */
	total: number;
	/** Nombre de fichiers uploades */
	completed: number;
	/** Fichier en cours d'upload */
	current?: string;
	/** Phase actuelle */
	phase: "validating" | "generating-thumbnails" | "uploading" | "done";
}

export interface UseMediaUploadReturn {
	/** Upload plusieurs fichiers avec validation */
	upload: (files: File[]) => Promise<MediaUploadResult[]>;
	/** Upload un seul fichier */
	uploadSingle: (file: File) => Promise<MediaUploadResult | null>;
	/** Valider des fichiers sans les uploader */
	validateFiles: (files: File[]) => File[];
	/** Annuler l'upload en cours */
	cancel: () => void;
	/** Indique si un upload est en cours */
	isUploading: boolean;
	/** Progression actuelle */
	progress: UploadProgress | null;
	/** Utilitaire pour determiner le type de media */
	getMediaType: (file: File) => "IMAGE" | "VIDEO";
	/** Utilitaire pour verifier si un fichier est trop gros */
	isOversized: (file: File) => boolean;
}

// ============================================================================
// VIDEO THUMBNAIL TYPES
// ============================================================================

export interface VideoThumbnailOptions {
	/** Largeur du thumbnail en pixels (defaut: 480) */
	width?: number;
	/** Qualite JPEG 0-1 (defaut: 0.8) */
	quality?: number;
	/** Positions de capture en ratio de la duree (defaut: [0.1, 0.25, 0.5]) */
	capturePositions?: number[];
	/** Temps max de capture en secondes (defaut: 1) */
	maxCaptureTime?: number;
	/** Signal pour annuler l'operation */
	signal?: AbortSignal;
}

export interface VideoThumbnailResult {
	/** Thumbnail sous forme de File pret pour upload */
	thumbnailFile: File;
	/** URL de preview temporaire (doit etre revoquee) */
	previewUrl: string;
	/** Blur placeholder en base64 data URL */
	blurDataUrl: string;
	/** Position de capture utilisee (ratio) */
	capturedAt: number;
}
