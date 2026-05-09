/**
 * Types for the media module hooks
 *
 * @module modules/media/types/hooks.types
 */

// ============================================================================
// MEDIA GRID TYPES
// ============================================================================

export interface MediaItem {
	url: string;
	altText: string | undefined;
	mediaType: "IMAGE" | "VIDEO";
	thumbnailUrl: string | undefined;
	blurDataUrl: string | undefined;
}

// ============================================================================
// MEDIA UPLOAD TYPES
// ============================================================================

export interface UseMediaUploadOptions {
	/** UploadThing file route endpoint (default: "catalogMedia") */
	endpoint?: "catalogMedia" | "reviewMedia";
	/** Max size for images in bytes (default: 16MB) */
	maxSizeImage?: number;
	/** Max size for videos in bytes (default: 512MB) */
	maxSizeVideo?: number;
	/** Max number of files (default: 6) */
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

export type FileProgressState =
	| "queued"
	| "validating"
	| "compressing"
	| "uploading"
	| "done"
	| "failed";

export interface FileProgress {
	/** Original file name */
	fileName: string;
	/** Current file state */
	state: FileProgressState;
	/** Percent 0-100 (bytes-based when uploading; reflects compression progress when compressing; 100 on "done") */
	percent: number;
	/** Original file size in bytes */
	sizeBytes: number;
	/** Bytes uploaded so far (uploading phase only) */
	bytesUploaded?: number;
	/** Media type */
	mediaType: "IMAGE" | "VIDEO";
	/** Human-readable error message if state === "failed" */
	error?: string;
}

export interface UploadProgress {
	/** Total number of files (current batch + queued) */
	total: number;
	/** Number of uploaded files */
	completed: number;
	/** Currently uploading file */
	current?: string;
	/** Number of files waiting in queue */
	queued: number;
	/** Current phase */
	phase:
		| "validating"
		| "compressing"
		| "generating-thumbnails"
		| "uploading"
		| "finalizing"
		| "done";
	/** Per-file progress entries (opt-in, keeps the total stable even after failures) */
	files?: FileProgress[];
	/** Total bytes to upload across all files in the active session */
	bytesTotal?: number;
	/** Bytes uploaded so far across all files in the active session */
	bytesUploaded?: number;
	/** Estimated bytes-per-second over a sliding window (uploading phase only) */
	bytesPerSecond?: number;
	/** Estimated seconds until completion (uploading phase only). null when unknown */
	etaSeconds?: number | null;
}

export interface FailedUpload {
	/** Name of the file that failed */
	fileName: string;
	/** Human-readable French error message (toast-ready) */
	error: string;
	/** The original File so the caller can retry */
	file: File;
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
	/** Cancel a single queued or in-flight video file (no-op if already done/failed/uploading-image-batch) */
	cancelOne: (fileName: string) => void;
	/** Re-upload all files currently in the failedFiles list */
	retryFailed: () => Promise<MediaUploadResult[]>;
	/** Re-upload a single previously failed file (by reference) */
	retrySingle: (file: File) => Promise<MediaUploadResult | null>;
	/** Clear the failedFiles list (after user dismisses the error banner) */
	clearFailed: () => void;
	/** Whether an upload is in progress (including queued files) */
	isUploading: boolean;
	/** Current progress */
	progress: UploadProgress | null;
	/** Number of files waiting in queue */
	queuedCount: number;
	/** Files that failed during the last upload session — empty after retryFailed/clearFailed */
	failedFiles: FailedUpload[];
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
