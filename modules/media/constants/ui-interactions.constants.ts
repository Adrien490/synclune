/**
 * UI interaction delays and lightbox configuration
 */

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
