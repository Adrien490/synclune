export type RecentlyViewedProduct = {
	slug: string
	title: string
	price: number
	image: { url: string; blurDataUrl: string | null } | null
}

export type QuickSearchCollection = {
	slug: string
	name: string
	productCount: number
	image: { url: string; blurDataUrl: string | null } | null
}

export type QuickSearchProductType = {
	slug: string
	label: string
}

export const QUICK_SEARCH_DIALOG_ID = "quick-search"

/** CSS selector for focusable elements inside the search results area */
export const FOCUSABLE_SELECTOR =
	'button:not([disabled]):not([aria-disabled="true"]), a:not([disabled]):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"]):not([type="search"])'

/** Max matched collections shown in search results */
export const MAX_MATCHED_COLLECTIONS = 2

/** Max matched product types shown in search results */
export const MAX_MATCHED_TYPES = 2

/** Number of skeleton rows in the loading state */
export const SKELETON_ROWS = 4

/** Minimum query length to trigger a search */
export const MIN_SEARCH_LENGTH = 2

/** Debounce delay (ms) for the live search input */
export const SEARCH_DEBOUNCE_MS = 300
