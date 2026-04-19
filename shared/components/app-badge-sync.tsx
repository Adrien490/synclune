"use client";

import { useEffect } from "react";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";

/**
 * Syncs the cart item count to the PWA app icon badge (Badging API).
 * Renders nothing — purely a side-effect component.
 * Silently no-ops on unsupported browsers.
 */
export function AppBadgeSync() {
	const cartCount = useBadgeCountsStore((state) => state.cartCount);

	useEffect(() => {
		if (!("setAppBadge" in navigator)) return;

		if (cartCount > 0) {
			navigator.setAppBadge(cartCount).catch(() => {});
		} else {
			navigator.clearAppBadge().catch(() => {});
		}
	}, [cartCount]);

	return null;
}
