import { useEffect } from "react";

import { useOverlayStackStore } from "@/shared/stores/use-overlay-stack-store";

/**
 * Registers a modal overlay (Sheet/Drawer/AlertDialog Content) in the global
 * overlay stack on mount and unregisters it on unmount.
 *
 * Used by bottom-anchored UI (e.g. AdminMobileBottomBar) to auto-hide while
 * any overlay is open, freeing the bottom edge for sticky drawer footers
 * (Apply / Save / Confirm buttons) — native iOS/Android pattern.
 *
 * Mount = open: Radix/Vaul portals only mount Content while the overlay is
 * open, so we don't need to track the `open` prop separately.
 *
 * Pass `enabled=false` to opt out (e.g. onboarding welcome sheet that should
 * not collapse the bottom-bar behind it).
 */
export function useRegisterOverlay(enabled: boolean = true) {
	useEffect(() => {
		if (!enabled) return;
		const { push, pop } = useOverlayStackStore.getState();
		push();
		return pop;
	}, [enabled]);
}
