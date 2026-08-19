/**
 * Thumbnail generation, video processing, and migration configuration
 */

import { MAX_UPLOAD_SIZE_VIDEO } from "./upload-size-limits.constants";

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
 * Used in utils/video-thumbnail.ts
 */
export const VIDEO_EVENT_TIMEOUTS = {
	/** Default timeout for video events (ms) */
	DEFAULT_MS: 5000,
	/** Timeout for the loadedmetadata event (ms) */
	LOADED_METADATA_MS: 10000,
	/** Timeout for the seeked event (ms) */
	SEEKED_MS: 5000,
} as const;

// ⚠️ `ALLOWED_UPLOADTHING_DOMAINS` a été retiré : c'était la 3ᵉ copie
// (divergente) de l'allowlist de domaines, jamais lue par la moindre garde —
// la SSOT est `UPLOADTHING_DOMAINS` (shared/lib/media-validation.ts), la
// défense réelle `isValidUploadThingUrl`.
