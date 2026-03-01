"use client";

import { useSyncExternalStore } from "react";

const subscribeNoop = () => () => {};

/**
 * Returns false during SSR and hydration, true after mount.
 * Uses useSyncExternalStore to avoid hydration mismatch.
 */
export function useMounted(): boolean {
	return useSyncExternalStore(
		subscribeNoop,
		() => true,
		() => false,
	);
}
