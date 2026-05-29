export type RecentlyViewedProduct = {
	slug: string;
	title: string;
	price: number;
	image: { url: string; blurDataUrl: string | null } | null;
};

export type QuickSearchCollection = {
	slug: string;
	name: string;
	productCount: number;
	image: { url: string; blurDataUrl: string | null } | null;
};

export type QuickSearchProductType = {
	slug: string;
	label: string;
};

export const QUICK_SEARCH_DIALOG_ID = "quick-search";

/**
 * CSS selector for arrow-key-navigable elements inside the results area.
 *
 * Scoped to `[role="option"]` so ↑/↓ roving traverses *only* the selectable
 * options (products, collection/category cards, recent searches, recently
 * viewed, spell suggestion, "view all results"). Auxiliary controls — per-item
 * delete (×), "Effacer", "Voir toutes les collections", "Réessayer" — are
 * deliberately excluded: they are NOT options and stay reachable via Tab (real
 * focus). This prevents the roving highlight from landing on invisible /
 * unstyled controls (the × buttons are `md:opacity-0` until hover/focus).
 */
export const FOCUSABLE_SELECTOR = '[role="option"]:not([aria-disabled="true"])';

/** Max matched collections shown in search results */
export const MAX_MATCHED_COLLECTIONS = 2;

/** Max matched product types shown in search results */
export const MAX_MATCHED_TYPES = 2;

/** Number of skeleton rows in the loading state */
export const SKELETON_ROWS = 4;

/** Minimum query length to trigger a search (aligned with FUZZY_MIN_LENGTH) */
export const MIN_SEARCH_LENGTH = 3;

/** Debounce delay (ms) for the live search input */
export const SEARCH_DEBOUNCE_MS = 300;

/** Downward swipe distance (px) from the mobile header that dismisses the dialog */
export const SWIPE_CLOSE_THRESHOLD_PX = 80;

/** Dampening applied to an upward (over-)drag so it feels rubber-banded */
export const SWIPE_RUBBER_BAND_FACTOR = 0.3;

/** Interval (ms) between animated placeholder rotations */
export const PLACEHOLDER_CYCLE_MS = 3000;

/** Branded error type replacing the raw "error" string literal */
export type QuickSearchError = { type: "error" };

/** ID for the results container (used by aria-controls) */
export const RESULTS_CONTAINER_ID = "qs-results";
