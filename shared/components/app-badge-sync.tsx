"use client";

import { useAppBadge } from "@/shared/hooks/use-app-badge";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";

/**
 * Syncs the cart item count to the PWA app icon badge (Badging API).
 * Renders nothing — purely a side-effect component.
 */
export function AppBadgeSync() {
	const cartCount = useBadgeCountsStore((state) => state.cartCount);
	useAppBadge(cartCount);
	return null;
}
