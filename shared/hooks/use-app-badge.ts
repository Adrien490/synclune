"use client";

import { useEffect } from "react";

/**
 * Hook to update the PWA app icon badge (Badging API).
 * Shows a count badge on the installed app icon (e.g. cart items).
 * Silently no-ops on unsupported browsers.
 */
export function useAppBadge(count: number) {
	useEffect(() => {
		if (!("setAppBadge" in navigator)) return;

		if (count > 0) {
			navigator.setAppBadge(count).catch(() => {});
		} else {
			navigator.clearAppBadge().catch(() => {});
		}
	}, [count]);
}
