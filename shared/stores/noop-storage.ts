import type { StateStorage } from "zustand/middleware";

/**
 * No-op storage for SSR (when localStorage is not available).
 * Used by cookie-consent store's persist middleware.
 */
export const noopStorage: StateStorage = {
	getItem: () => null,
	setItem: () => {},
	removeItem: () => {},
};
