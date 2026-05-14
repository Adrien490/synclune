"use client";

import { useEffect, useEffectEvent } from "react";

/** Horizontal distance (px) that fully arms the swipe; also the trigger threshold. */
const SWIPE_THRESHOLD_PX = 30;

/**
 * Detect swipe-from-left-edge to trigger an action (mobile native UX pattern).
 *
 * @param onOpen - Callback when a valid edge swipe is detected
 * @param isOpen - Whether the target is already open (skips tracking when true)
 * @param maxWidth - Media query breakpoint in px — disabled above this width (default 1024)
 * @param onProgress - Optional callback fired during the drag with a 0–1 value (dx / threshold).
 *                     Called with 0 when the gesture is cancelled or completed. Lets callers
 *                     render a rubber-band preview (cf. EdgeSwipeIndicator).
 */
export function useEdgeSwipe(
	onOpen: () => void,
	isOpen: boolean,
	maxWidth = 1024,
	onProgress?: (progress: number) => void,
) {
	const onOpenStable = useEffectEvent(onOpen);
	const onProgressStable = useEffectEvent((progress: number) => {
		onProgress?.(progress);
	});

	useEffect(() => {
		if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
		// WCAG 2.3.3 — users who prefer reduced motion skip gesture-triggered animations
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const mql = window.matchMedia(`(min-width: ${maxWidth}px)`);

		let startX = 0;
		let startY = 0;
		let tracking = false;
		let lastProgress = 0;

		function emitProgress(progress: number) {
			if (progress === lastProgress) return;
			lastProgress = progress;
			onProgressStable(progress);
		}

		function onTouchStart(e: TouchEvent) {
			if (isOpen || mql.matches) return;
			const touch = e.touches[0];
			if (!touch) return;
			// Only track touches starting within 20px of the left edge
			if (touch.clientX <= 20) {
				startX = touch.clientX;
				startY = touch.clientY;
				tracking = true;
			}
		}

		function onTouchMove(e: TouchEvent) {
			if (!tracking) return;
			const touch = e.touches[0];
			if (!touch) return;
			const dx = touch.clientX - startX;
			const dy = Math.abs(touch.clientY - startY);

			// Cancel if vertical movement dominates (user is scrolling)
			if (dy > dx) {
				tracking = false;
				emitProgress(0);
				return;
			}

			emitProgress(Math.min(1, Math.max(0, dx / SWIPE_THRESHOLD_PX)));

			// Trigger open when horizontal swipe exceeds threshold.
			// Lowered from 50 → 30 for snappier native feel (iOS/Android drawer parity).
			if (dx > SWIPE_THRESHOLD_PX) {
				tracking = false;
				emitProgress(0);
				onOpenStable();
			}
		}

		function onTouchEnd() {
			if (tracking) emitProgress(0);
			tracking = false;
		}

		document.addEventListener("touchstart", onTouchStart, { passive: true });
		document.addEventListener("touchmove", onTouchMove, { passive: true });
		document.addEventListener("touchend", onTouchEnd, { passive: true });
		document.addEventListener("touchcancel", onTouchEnd, { passive: true });

		return () => {
			document.removeEventListener("touchstart", onTouchStart);
			document.removeEventListener("touchmove", onTouchMove);
			document.removeEventListener("touchend", onTouchEnd);
			document.removeEventListener("touchcancel", onTouchEnd);
		};
	}, [isOpen, maxWidth]);
}
