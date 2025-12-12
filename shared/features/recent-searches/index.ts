// Constants
export {
	RECENT_SEARCHES_COOKIE_NAME,
	RECENT_SEARCHES_MAX_ITEMS,
	RECENT_SEARCHES_MIN_LENGTH,
} from "./constants"

// Data - Import directly from ./data/get-recent-searches for Server Components
// (Cannot be re-exported here due to "use cache" directive incompatibility with Client Components)

// Actions
export { addRecentSearch } from "./actions/add-recent-search"
export { clearRecentSearches } from "./actions/clear-recent-searches"
export { removeRecentSearch } from "./actions/remove-recent-search"

// Hooks
export { useAddRecentSearch } from "./hooks/use-add-recent-search"
export { useRemoveRecentSearch } from "./hooks/use-remove-recent-search"
export { useClearRecentSearches } from "./hooks/use-clear-recent-searches"
