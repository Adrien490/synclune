/**
 * Centralized constants for media management (images and videos)
 */

// ============================================================================
// MEDIA LIMITS PER ITEM
// ============================================================================

/** Maximum number of media per product/SKU (total) */
export const MAX_MEDIA_PER_ITEM = 6;

/** Maximum number of media in SKU gallery (excluding primary image) */
export const MAX_GALLERY_MEDIA = 5;

// ============================================================================
// SUPPORTED EXTENSIONS
// ============================================================================

/** Supported video extensions */
export const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".avi"] as const;

/** Supported image extensions */
export const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"] as const;

// ============================================================================
// MIME TYPES
// ============================================================================

/** Video MIME types */
export const VIDEO_MIME_TYPES = [
	"video/mp4",
	"video/webm",
	"video/quicktime",
	"video/x-msvideo",
] as const;

/** Image MIME types */
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
// THUMBNAIL MIGRATION SCRIPT CONFIGURATION
// ============================================================================

/** Allowed UploadThing domains for downloading */
export const ALLOWED_UPLOADTHING_DOMAINS = [
	"utfs.io",
	"uploadthing.com",
	"ufs.sh",
] as const;

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

/** Type for thumbnail sizes */
export type ThumbnailSize = "MEDIUM";

// ============================================================================
// CONFIGURATION THUMBNAILS CLIENT-SIDE (Canvas API)
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
// IMAGE DOWNLOADER CONFIGURATION
// ============================================================================

/**
 * Configuration for the image download service.
 * Shared download/retry defaults also used by THUMBHASH_CONFIG.
 */
export const IMAGE_DOWNLOADER_CONFIG = {
	/** Download timeout (ms) */
	DOWNLOAD_TIMEOUT_MS: 30_000,
	/** Maximum image size (bytes) - 20 MB */
	MAX_IMAGE_SIZE: 20 * 1024 * 1024,
	/** Maximum number of retries */
	MAX_RETRIES: 3,
	/** Base delay between retries (ms) */
	RETRY_BASE_DELAY_MS: 1_000,
	/** User-Agent for requests */
	USER_AGENT: "Synclune-ImageDownloader/1.0",
} as const;

// ============================================================================
// THUMBHASH CONFIGURATION (2025 STANDARD - RECOMMENDED)
// ============================================================================

/**
 * Configuration for ThumbHash placeholder generation
 *
 * ThumbHash is the 2025 standard, created by the author of esbuild:
 * - Ultra-compact: ~25 bytes (vs ~200-300 bytes for plaiceholder)
 * - Transparency support (alpha channel)
 * - Automatically encodes aspect ratio
 * - Better color fidelity than BlurHash
 *
 * Download/retry values are sourced from IMAGE_DOWNLOADER_CONFIG
 * to keep a single source of truth.
 *
 * @see https://evanw.github.io/thumbhash/
 */
export const THUMBHASH_CONFIG = {
	/** Timeout for image download (ms) */
	downloadTimeout: IMAGE_DOWNLOADER_CONFIG.DOWNLOAD_TIMEOUT_MS,
	/** Max image size in bytes */
	maxImageSize: IMAGE_DOWNLOADER_CONFIG.MAX_IMAGE_SIZE,
	/** Max resize dimension (pixels) - ThumbHash limits to 100x100 */
	maxSize: 100,
	/** Number of retries before failure */
	maxRetries: IMAGE_DOWNLOADER_CONFIG.MAX_RETRIES,
	/** Base delay for exponential backoff (ms) */
	retryBaseDelay: IMAGE_DOWNLOADER_CONFIG.RETRY_BASE_DELAY_MS,
	/** Pause between batches (ms) - migration script only */
	batchDelay: 500,
	/** Allowed domains for downloading */
	allowedDomains: ALLOWED_UPLOADTHING_DOMAINS,
} as const;

// ============================================================================
// UI INTERACTION DELAYS
// ============================================================================

/**
 * UI interaction delays for media components
 * Used in media-upload-grid, lightbox, etc.
 */
export const UI_DELAYS = {
	/** Display duration for "long press" hint (ms) */
	HINT_DISAPPEAR_MS: 4000,
	/** Mobile long press activation delay (ms) */
	LONG_PRESS_ACTIVATION_MS: 250,
	/** Movement tolerance during long press (px) */
	LONG_PRESS_TOLERANCE_PX: 5,
	/** Minimum distance to activate drag (px) */
	DRAG_ACTIVATION_DISTANCE_PX: 8,
	/** Double-tap delay for zoom (ms) */
	DOUBLE_TAP_DELAY_MS: 300,
	/** Double-click delay for zoom (ms) */
	DOUBLE_CLICK_DELAY_MS: 300,
	/** Lightbox fade animation duration (ms) */
	ANIMATION_FADE_MS: 350,
	/** Lightbox swipe animation duration (ms) */
	ANIMATION_SWIPE_MS: 300,
	/** Delay before video frame stabilization (ms) */
	VIDEO_FRAME_STABILIZATION_MS: 50,
} as const;

// ============================================================================
// LIGHTBOX CONFIGURATION
// ============================================================================

/**
 * Lightbox component configuration (yet-another-react-lightbox)
 */
export const LIGHTBOX_CONFIG = {
	/** Maximum zoom ratio (3x) */
	MAX_ZOOM_PIXEL_RATIO: 3,
	/** Zoom multiplier (2x per action) */
	ZOOM_IN_MULTIPLIER: 2,
	/** Max stops for double-click zoom */
	DOUBLE_CLICK_MAX_STOPS: 2,
	/** Keyboard move distance (px) */
	KEYBOARD_MOVE_DISTANCE: 50,
	/** Scroll wheel zoom distance factor */
	WHEEL_ZOOM_DISTANCE_FACTOR: 100,
	/** Pinch zoom distance factor */
	PINCH_ZOOM_DISTANCE_FACTOR: 100,
	/** Number of images to preload in carousel */
	CAROUSEL_PRELOAD: 2,
	/** Counter position (bottom offset in px) */
	COUNTER_BOTTOM_OFFSET: 16,
	/** Backdrop opacity (rgba) */
	BACKDROP_OPACITY: 0.95,
	/** Backdrop blur intensity (px) */
	BACKDROP_BLUR: 20,
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
} as const

