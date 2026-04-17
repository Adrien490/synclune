"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useEdgeSwipe } from "@/shared/hooks/use-edge-swipe";
import { triggerHaptic } from "@/shared/hooks/use-haptic";

function subscribeStandalone(listener: () => void) {
	const mql = window.matchMedia("(display-mode: standalone)");
	mql.addEventListener("change", listener);
	return () => mql.removeEventListener("change", listener);
}

function getStandaloneSnapshot() {
	return window.matchMedia("(display-mode: standalone)").matches;
}

function getStandaloneServerSnapshot() {
	return false;
}

/**
 * Enables swipe-from-left-edge → `router.back()` navigation in PWA standalone mode.
 *
 * In browser tabs, iOS Safari and Android Chrome provide native edge-swipe back —
 * adding a custom listener would double-fire. In standalone (installed PWA) mode
 * the native gesture is suppressed, so we reinstate it here.
 *
 * - Only active when `display-mode: standalone` matches
 * - Disabled above 1024px viewport (desktop keyboard-first) — gated by useEdgeSwipe
 * - Haptic "light" on trigger
 * - Zero cost when inactive (hook bails out early)
 */
export function SwipeBackProvider() {
	const router = useRouter();
	const isStandalone = useSyncExternalStore(
		subscribeStandalone,
		getStandaloneSnapshot,
		getStandaloneServerSnapshot,
	);

	useEdgeSwipe(() => {
		triggerHaptic("light");
		router.back();
	}, !isStandalone);

	return null;
}
