"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
	window.addEventListener("online", callback);
	window.addEventListener("offline", callback);
	return () => {
		window.removeEventListener("online", callback);
		window.removeEventListener("offline", callback);
	};
}

function getSnapshot() {
	return navigator.onLine;
}

function getServerSnapshot() {
	return true;
}

/**
 * SSR-safe reactive online status via `useSyncExternalStore`.
 *
 * - Client: tracks the `online` / `offline` events on window.
 * - SSR: assumes online (safest default to avoid false-negative alerts pre-hydration).
 *
 * @returns `true` when the browser reports connectivity, `false` when offline.
 */
export function useOnlineStatus() {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
