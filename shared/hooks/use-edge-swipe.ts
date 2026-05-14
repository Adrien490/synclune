"use client";

import { useEffect, useEffectEvent } from "react";

/** Horizontal distance (px) that fully arms the swipe; also the trigger threshold. */
const SWIPE_THRESHOLD_PX = 30;

interface UseEdgeSwipeOptions {
	/** Bord déclencheur (mobile-native). @default "left" */
	side?: "left" | "right";
	/** Largeur max (px) en-dessous de laquelle le hook est actif. @default 1024 */
	maxWidth?: number;
	/**
	 * Callback fired during the drag with a 0–1 value (|dx| / threshold).
	 * Called with 0 when the gesture is cancelled or completed. Lets callers
	 * render a rubber-band preview (cf. EdgeSwipeIndicator).
	 */
	onProgress?: (progress: number) => void;
}

/**
 * Detect swipe-from-edge to trigger an action (mobile native UX pattern).
 *
 * - `side: "left"` (default) : swipe from left edge → trigger (drawer/menu open).
 * - `side: "right"` : swipe from right edge vers la gauche → trigger
 *   (utile pour exit gestures, ex: sortir du mode sélection).
 *
 * @param onTrigger - Callback when a valid edge swipe is detected
 * @param isActive - When `true`, the hook is **disabled** (gesture skipped) —
 *                   typique pour "skip when target already open" ou "skip hors mode".
 *                   Note : sémantique invariante des deux côtés (active = disabled).
 * @param options   - side / maxWidth / onProgress
 */
export function useEdgeSwipe(
	onTrigger: () => void,
	isActive: boolean,
	maxWidthOrOptions: number | UseEdgeSwipeOptions = 1024,
	onProgressArg?: (progress: number) => void,
) {
	// Backward-compat overload : ancienne signature `(fn, isOpen, maxWidth, onProgress)`.
	const opts: UseEdgeSwipeOptions =
		typeof maxWidthOrOptions === "number"
			? { maxWidth: maxWidthOrOptions, onProgress: onProgressArg }
			: maxWidthOrOptions;

	const { side = "left", maxWidth = 1024, onProgress } = opts;

	const onTriggerStable = useEffectEvent(onTrigger);
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
			if (isActive || mql.matches) return;
			const touch = e.touches[0];
			if (!touch) return;
			const winWidth = window.innerWidth;
			const startsAtEdge = side === "left" ? touch.clientX <= 20 : touch.clientX >= winWidth - 20;
			if (startsAtEdge) {
				startX = touch.clientX;
				startY = touch.clientY;
				tracking = true;
			}
		}

		function onTouchMove(e: TouchEvent) {
			if (!tracking) return;
			const touch = e.touches[0];
			if (!touch) return;
			// Progress direction : left → dx positif ; right → dx négatif (vers la gauche)
			const rawDx = touch.clientX - startX;
			const dx = side === "left" ? rawDx : -rawDx;
			const dy = Math.abs(touch.clientY - startY);

			// Cancel if vertical movement dominates (user is scrolling)
			if (dy > dx) {
				tracking = false;
				emitProgress(0);
				return;
			}

			emitProgress(Math.min(1, Math.max(0, dx / SWIPE_THRESHOLD_PX)));

			// Trigger when horizontal swipe exceeds threshold (snappy native feel).
			if (dx > SWIPE_THRESHOLD_PX) {
				tracking = false;
				emitProgress(0);
				onTriggerStable();
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
	}, [isActive, maxWidth, side]);
}
