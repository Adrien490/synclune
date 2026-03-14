"use client";

import { useEffect, useRef } from "react";

/**
 * Detect swipe-from-left-edge to trigger an action (mobile native UX pattern).
 *
 * @param onOpen - Callback when a valid edge swipe is detected
 * @param isOpen - Whether the target is already open (skips tracking when true)
 * @param maxWidth - Media query breakpoint in px — disabled above this width (default 1024)
 */
export function useEdgeSwipe(onOpen: () => void, isOpen: boolean, maxWidth = 1024) {
	const onOpenRef = useRef(onOpen);
	useEffect(() => {
		onOpenRef.current = onOpen;
	});

	useEffect(() => {
		if (typeof window === "undefined") return;
		const mql = window.matchMedia(`(min-width: ${maxWidth}px)`);

		let startX = 0;
		let startY = 0;
		let tracking = false;

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
				return;
			}

			// Trigger open when horizontal swipe exceeds 50px
			if (dx > 50) {
				tracking = false;
				onOpenRef.current();
			}
		}

		function onTouchEnd() {
			tracking = false;
		}

		document.addEventListener("touchstart", onTouchStart, { passive: true });
		document.addEventListener("touchmove", onTouchMove, { passive: true });
		document.addEventListener("touchend", onTouchEnd, { passive: true });

		return () => {
			document.removeEventListener("touchstart", onTouchStart);
			document.removeEventListener("touchmove", onTouchMove);
			document.removeEventListener("touchend", onTouchEnd);
		};
	}, [isOpen, maxWidth]);
}
