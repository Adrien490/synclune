// Constants
export { FAB_KEYS, type FabKey, getFabCookieName } from "./constants";

// Cache
export { FAB_CACHE_TAGS, getFabInvalidationTags } from "./constants/cache";

// Components
export { Fab, type FabProps } from "./components/fab";
export {
	SpeedDialFab,
	type SpeedDialFabProps,
	type SpeedDialAction,
} from "./components/speed-dial-fab";

// Hook
export { useFabVisibility } from "./hooks/use-fab-visibility";

// Note: getFabVisibility is NOT exported here to avoid Client Component import issues.
// Import directly from "@/shared/features/fab/data/get-fab-visibility" in Server Components.
