/**
 * Thumbnail generation, video processing, and migration configuration
 */

// ============================================================================
// THUMBNAIL CONFIGURATION
// ============================================================================

/** Configuration for video thumbnail generation */
export const THUMBNAIL_CONFIG = {
	/** Size for video poster (~500px display) */
	MEDIUM: {
		width: 480,
		height: 480,
		quality: 0.85,
		format: "webp" as const,
	},
	/** Capture position: 10% of video duration */
	capturePosition: 0.1,
	/** Max position in seconds (avoids end black frames) */
	maxCaptureTime: 1,
	/** Number of retries before failure */
	maxRetries: 3,
	/** Base delay for exponential backoff (ms) */
	retryBaseDelay: 1000,

	// Timeouts for synchronous processing (service)
	/** Timeout for video download (ms) */
	downloadTimeout: 60_000,
	/** Timeout for FFmpeg commands (ms) */
	ffmpegTimeout: 30_000,
	/** Timeout for FFprobe (ms) */
	ffprobeTimeout: 10_000,

	// Limits for synchronous processing (real-time upload)
	/** Max video size for synchronous processing (50 MB) */
	maxSyncVideoSize: 50 * 1024 * 1024,
	/** Fallback duration if FFprobe fails (seconds) */
	fallbackDuration: 10,
} as const;

/** Type for thumbnail sizes */
export type ThumbnailSize = "MEDIUM";

// ============================================================================
// CLIENT-SIDE THUMBNAIL CONFIGURATION (Canvas API)
// ============================================================================

/**
 * Configuration for client-side thumbnail generation
 * Uses HTML5 Canvas API, compatible with Vercel serverless
 */
export const CLIENT_THUMBNAIL_CONFIG = {
	/** Thumbnail width in pixels */
	width: 480,
	/** JPEG quality (0-1) */
	quality: 0.8,
	/** Capture position as duration ratio (0.1 = 10%) */
	capturePosition: 0.1,
	/** Max capture time in seconds */
	maxCaptureTime: 1,
	/** Output format */
	format: "image/jpeg" as const,
	/** Blur placeholder size in pixels */
	blurSize: 8,
} as const;

// ============================================================================
// VIDEO FRAME VALIDATION
// ============================================================================

/**
 * Configuration for video frame validation
 * Used to detect black/white frames to avoid
 */
export const FRAME_VALIDATION = {
	/** RGB threshold to consider a pixel as black */
	BLACK_THRESHOLD: 15,
	/** RGB threshold to consider a pixel as white */
	WHITE_THRESHOLD: 240,
	/** Max black/white pixel ratio for a valid frame (95%) */
	INVALID_PIXEL_RATIO: 0.95,
	/** Pixel sampling factor (1 every N) - 16 = 1 pixel every 4 */
	SAMPLE_FACTOR: 16,
	/** Max sample size for validation (px) */
	MAX_SAMPLE_SIZE: 50,
} as const;

// ============================================================================
// VIDEO EVENT TIMEOUTS
// ============================================================================

/**
 * Timeouts for HTML5 video events
 * Used in use-video-thumbnail.ts
 */
export const VIDEO_EVENT_TIMEOUTS = {
	/** Default timeout for video events (ms) */
	DEFAULT_MS: 5000,
	/** Timeout for the loadedmetadata event (ms) */
	LOADED_METADATA_MS: 10000,
	/** Timeout for the seeked event (ms) */
	SEEKED_MS: 5000,
} as const;

// ============================================================================
// MIGRATION SCRIPT CONFIGURATION
// ============================================================================

/** Allowed UploadThing domains for downloading */
export const ALLOWED_UPLOADTHING_DOMAINS = ["utfs.io", "uploadthing.com", "ufs.sh"] as const;

/** Configuration for the generate-video-thumbnails.ts migration script */
export const VIDEO_MIGRATION_CONFIG = {
	/** Timeout for video download (ms) */
	downloadTimeout: 60_000,
	/** Timeout for FFmpeg commands (ms) */
	ffmpegTimeout: 30_000,
	/** Max video size in bytes (512 MB - aligned with UploadThing) */
	maxVideoSize: 512 * 1024 * 1024,
	/** Max recommended duration for product videos (seconds) */
	maxVideoDuration: 120,
	/** Allowed UploadThing domains for downloading */
	allowedDomains: ALLOWED_UPLOADTHING_DOMAINS,
	/** Timeout for video format validation with FFmpeg (ms) */
	validationTimeout: 10_000,
	/** Timeout for video info / duration extraction (ms) */
	infoTimeout: 10_000,
	/** Timeout for blur placeholder generation (ms) */
	blurTimeout: 5_000,
} as const;

// ============================================================================
// AUDIO PROCESSING CONFIGURATION
// ============================================================================

/** Configuration for video audio removal */
export const VIDEO_AUDIO_CONFIG = {
	/** Automatically strip audio during upload */
	stripAudioOnUpload: true,
	/** FFmpeg timeout for audio removal (ms) - longer due to potential re-encoding */
	stripAudioTimeout: 120_000,
} as const;
