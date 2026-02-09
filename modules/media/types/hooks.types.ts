/**
 * Types for the media module hooks
 *
 * @module modules/media/types/hooks.types
 */

// ============================================================================
// MEDIA UPLOAD TYPES
// ============================================================================

export interface UseMediaUploadOptions {
	/** Max size for images in bytes (default: 16MB) */
	maxSizeImage?: number;
	/** Max size for videos in bytes (default: 512MB) */
	maxSizeVideo?: number;
	/** Max number of files (default: 10) */
	maxFiles?: number;
	/** Max concurrency for video uploads (default: 2) */
	videoConcurrency?: number;
	/** Callback called after a successful upload */
	onSuccess?: (results: MediaUploadResult[]) => void;
	/** Callback called on error */
	onError?: (error: Error) => void;
	/** Callback called with progress updates */
	onProgress?: (progress: UploadProgress) => void;
}

export interface MediaUploadResult {
	/** Uploaded file URL */
	url: string;
	/** Media type */
	mediaType: "IMAGE" | "VIDEO";
	/** Original file name */
	fileName: string;
	/** Blur placeholder in base64 (images and videos) */
	blurDataUrl?: string;
	/** Thumbnail URL (videos only) */
	thumbnailUrl?: string;
}

export interface UploadProgress {
	/** Total number of files */
	total: number;
	/** Number of uploaded files */
	completed: number;
	/** Currently uploading file */
	current?: string;
	/** Current phase */
	phase: "validating" | "generating-thumbnails" | "uploading" | "done";
}

export interface UseMediaUploadReturn {
	/** Upload multiple files with validation */
	upload: (files: File[]) => Promise<MediaUploadResult[]>;
	/** Upload a single file */
	uploadSingle: (file: File) => Promise<MediaUploadResult | null>;
	/** Validate files without uploading them */
	validateFiles: (files: File[]) => File[];
	/** Cancel the current upload */
	cancel: () => void;
	/** Whether an upload is in progress */
	isUploading: boolean;
	/** Current progress */
	progress: UploadProgress | null;
	/** Utility to determine the media type */
	getMediaType: (file: File) => "IMAGE" | "VIDEO";
	/** Utility to check if a file is too large */
	isOversized: (file: File) => boolean;
}

// ============================================================================
// VIDEO THUMBNAIL TYPES
// ============================================================================

export interface VideoThumbnailOptions {
	/** Thumbnail width in pixels (default: 480) */
	width?: number;
	/** JPEG quality 0-1 (default: 0.8) */
	quality?: number;
	/** Capture positions as ratio of duration (default: [0.1, 0.25, 0.5]) */
	capturePositions?: number[];
	/** Max capture time in seconds (default: 1) */
	maxCaptureTime?: number;
	/** Signal to cancel the operation */
	signal?: AbortSignal;
}

export interface VideoThumbnailResult {
	/** Thumbnail as a File ready for upload */
	thumbnailFile: File;
	/** Temporary preview URL (must be revoked) */
	previewUrl: string;
	/** Blur placeholder as base64 data URL */
	blurDataUrl: string;
	/** Capture position used (ratio) */
	capturedAt: number;
}
