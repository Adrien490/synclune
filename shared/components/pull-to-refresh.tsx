"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useReducedMotion } from "motion/react";

import { useIsTouchDevice } from "@/shared/hooks/use-touch-device";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

/** Pixels to pull before the refresh triggers */
const TRIGGER_DISTANCE = 70;
/** Maximum drag distance (px) — beyond this, resistance kicks in */
const MAX_DISTANCE = 120;
/** Vertical scroll position (px) below which the gesture arms */
const ARM_SCROLL_THRESHOLD = 4;
/** Max time (ms) PTR waits for a page-level refresh handler before falling back to router.refresh() alone */
const PAGE_HANDLER_TIMEOUT = 1500;

/**
 * Event name dispatched by PullToRefresh when the gesture fires.
 * Pages can listen via `window.addEventListener("admin:pull-to-refresh", e => e.detail.waitFor(promise))`
 * to register custom refresh logic (e.g. server-action cache invalidation) that PTR will await
 * before running `router.refresh()`. A fallback timeout prevents a stuck handler from blocking UX.
 */
const PULL_TO_REFRESH_EVENT = "admin:pull-to-refresh" as const;

export interface PullToRefreshEventDetail {
	waitFor: (promise: Promise<void>) => void;
}

/**
 * Native-feel pull-to-refresh indicator for touch devices.
 *
 * - Only activates when the page is at scrollY ≈ 0 (no conflict with content scroll)
 * - Triggers `router.refresh()` (RSC revalidate) on release past threshold
 * - Haptic feedback at threshold + on fire
 * - Disabled for reduced-motion users (keeps functional but skips rubber-band animation)
 * - Dormant on non-touch devices (desktop users have browser reload)
 *
 * Mounted at the shop layout root; low runtime cost (passive touch listeners).
 */
export function PullToRefresh() {
	const router = useRouter();
	const isTouch = useIsTouchDevice();
	const prefersReducedMotion = useReducedMotion();

	const [pullDistance, setPullDistance] = useState(0);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [hasReachedThreshold, setHasReachedThreshold] = useState(false);

	const startYRef = useRef<number | null>(null);
	const isTrackingRef = useRef(false);

	useEffect(() => {
		if (!isTouch) return;
		if (typeof window === "undefined") return;

		function handleTouchStart(e: TouchEvent) {
			// Only arm when user starts pulling from the very top
			if (window.scrollY > ARM_SCROLL_THRESHOLD) return;
			const touch = e.touches[0];
			if (!touch) return;
			startYRef.current = touch.clientY;
			isTrackingRef.current = true;
		}

		function handleTouchMove(e: TouchEvent) {
			if (!isTrackingRef.current || startYRef.current == null) return;
			if (window.scrollY > ARM_SCROLL_THRESHOLD) {
				isTrackingRef.current = false;
				setPullDistance(0);
				return;
			}
			const touch = e.touches[0];
			if (!touch) return;
			const delta = touch.clientY - startYRef.current;
			if (delta <= 0) {
				setPullDistance(0);
				return;
			}
			// Resistance curve: delta up to MAX_DISTANCE, sqrt easing beyond
			const eased =
				delta < MAX_DISTANCE ? delta : MAX_DISTANCE + Math.sqrt(delta - MAX_DISTANCE) * 4;
			setPullDistance(eased);

			const reached = eased >= TRIGGER_DISTANCE;
			setHasReachedThreshold((prev) => {
				if (reached && !prev) triggerHaptic("selection");
				return reached;
			});
		}

		function handleTouchEnd() {
			if (!isTrackingRef.current) return;
			isTrackingRef.current = false;
			const wasOverThreshold = pullDistance >= TRIGGER_DISTANCE;
			setPullDistance(0);
			setHasReachedThreshold(false);
			if (wasOverThreshold && !isRefreshing) {
				setIsRefreshing(true);
				triggerHaptic("medium");
				// Give the spinner a minimum 400ms visual presence — feels intentional
				const minDelay = new Promise<void>((resolve) => setTimeout(resolve, 400));

				// Let pages register a custom async refresh (e.g. cache invalidation).
				// Falls back to router.refresh() alone if no listener or timeout exceeded.
				const pageHandler = new Promise<void>((resolve) => {
					let settled = false;
					const markSettled = () => {
						if (settled) return;
						settled = true;
						resolve();
					};
					const event = new CustomEvent<PullToRefreshEventDetail>(PULL_TO_REFRESH_EVENT, {
						detail: {
							waitFor: (promise) => {
								void promise.finally(markSettled);
							},
						},
					});
					window.dispatchEvent(event);
					setTimeout(markSettled, PAGE_HANDLER_TIMEOUT);
				});

				void Promise.all([minDelay, pageHandler])
					.then(() => {
						router.refresh();
						triggerHaptic("success");
					})
					.finally(() => {
						setTimeout(() => setIsRefreshing(false), 200);
					});
			}
		}

		window.addEventListener("touchstart", handleTouchStart, { passive: true });
		window.addEventListener("touchmove", handleTouchMove, { passive: true });
		window.addEventListener("touchend", handleTouchEnd, { passive: true });
		window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

		return () => {
			window.removeEventListener("touchstart", handleTouchStart);
			window.removeEventListener("touchmove", handleTouchMove);
			window.removeEventListener("touchend", handleTouchEnd);
			window.removeEventListener("touchcancel", handleTouchEnd);
		};
	}, [isTouch, pullDistance, isRefreshing, router]);

	if (!isTouch) return null;

	const isVisible = pullDistance > 0 || isRefreshing;
	const translateY = isRefreshing ? 40 : Math.min(pullDistance * 0.55, 60);
	const progress = Math.min(pullDistance / TRIGGER_DISTANCE, 1);

	return (
		<div
			aria-hidden={!isRefreshing}
			role="status"
			aria-live="polite"
			className={cn(
				"pointer-events-none fixed top-[env(safe-area-inset-top,0)] left-1/2 z-50 -translate-x-1/2",
				"flex items-center justify-center",
				isVisible ? "opacity-100" : "opacity-0",
			)}
			style={{
				transform: `translate3d(-50%, ${translateY}px, 0)`,
				transition: prefersReducedMotion
					? "opacity 150ms ease"
					: "transform 200ms cubic-bezier(0.22, 1, 0.36, 1), opacity 150ms ease",
			}}
		>
			<div
				className={cn(
					"bg-background/95 border-border/60 flex size-10 items-center justify-center rounded-full border shadow-lg backdrop-blur-md",
					hasReachedThreshold && !isRefreshing && "border-primary/60",
				)}
			>
				<RefreshCw
					className={cn(
						"size-4 transition-colors",
						hasReachedThreshold ? "text-primary" : "text-muted-foreground",
						isRefreshing && !prefersReducedMotion && "animate-spin",
					)}
					style={
						!isRefreshing && !prefersReducedMotion
							? { transform: `rotate(${progress * 270}deg)`, transition: "transform 80ms linear" }
							: undefined
					}
					aria-hidden="true"
				/>
			</div>
			{isRefreshing && <span className="sr-only">Actualisation de la page en cours</span>}
		</div>
	);
}
