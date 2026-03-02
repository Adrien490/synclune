import type { StateStorage } from "zustand/middleware";

/**
 * No-op storage for SSR (when localStorage is not available).
 * Shared between cookie-consent and install-prompt stores.
 */
export const noopStorage: StateStorage = {
	getItem: () => null,
	setItem: () => {},
	removeItem: () => {},
};
