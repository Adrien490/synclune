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

/** CSS selector for focusable elements inside the search results area */
export const FOCUSABLE_SELECTOR =
	'button:not([disabled]):not([aria-disabled="true"]), a:not([disabled]):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"]):not([type="search"])';

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
