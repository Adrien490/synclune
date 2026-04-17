"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import {
	DEFAULT_PERIOD,
	PERIOD_SEARCH_PARAM,
	type DashboardPeriod,
} from "@/modules/dashboard/constants/period.constants";

/** Periods ordered from "shortest range" to "longest range" — swiping left → more, right → less */
const PERIOD_ORDER: readonly DashboardPeriod[] = ["7d", "30d", "month", "quarter", "year"] as const;

/** Minimum horizontal distance (px) to register as an intentional swipe */
const SWIPE_THRESHOLD = 90;

/** Maximum vertical drift (px) before the gesture is rejected as a scroll */
const VERTICAL_CANCEL = 45;

/** Minimum horizontal movement before direction lock */
const DIRECTION_LOCK = 12;

/**
 * iOS-native pattern: horizontal swipe on the dashboard content switches the active period
 * via the same URL search-param round-trip as the PeriodSelector.
 *
 * - Mobile-only (useIsMobile): desktop ignores entirely (mouse + keyboard path).
 * - Swipe **left** → next period ("7d" → "30d" → "month" → "quarter" → "year"), clamped.
 * - Swipe **right** → previous period.
 * - Cancels if vertical movement dominates (user is scrolling the page).
 * - **Does NOT fire** when the gesture starts inside an element marked with
 *   `data-no-swipe-nav` — used to exclude Row 1 KPIs snap-x horizontal scroll.
 * - Haptic `selection` at threshold crossing (hint), not on every touchmove.
 */
export function DashboardPeriodSwipeWrapper({ children }: { children: React.ReactNode }) {
	const isMobile = useIsMobile();
	const containerRef = useRef<HTMLDivElement>(null);
	const router = useRouter();
	const searchParams = useSearchParams();

	useEffect(() => {
		const el = containerRef.current;
		if (!el || !isMobile) return;

		let startX = 0;
		let startY = 0;
		let tracking = false;
		let directionLocked: "horizontal" | null = null;
		let hapticFired = false;

		function reset() {
			tracking = false;
			directionLocked = null;
			hapticFired = false;
		}

		function onStart(e: TouchEvent) {
			const touch = e.touches[0];
			if (!touch) return;
			// Skip the gesture if the touch target is inside an opted-out region
			// (e.g. the Row 1 snap-x horizontal scroll, interactive charts, drawers).
			if (e.target instanceof Element && e.target.closest("[data-no-swipe-nav]")) {
				return;
			}
			startX = touch.clientX;
			startY = touch.clientY;
			tracking = true;
			directionLocked = null;
			hapticFired = false;
		}

		function onMove(e: TouchEvent) {
			if (!tracking) return;
			const touch = e.touches[0];
			if (!touch) return;
			const dx = touch.clientX - startX;
			const dy = Math.abs(touch.clientY - startY);

			// Cancel if vertical movement dominates (page scroll)
			if (dy > VERTICAL_CANCEL && Math.abs(dx) < dy) {
				reset();
				return;
			}

			if (directionLocked === null && Math.abs(dx) > DIRECTION_LOCK) {
				directionLocked = "horizontal";
			}

			if (directionLocked === "horizontal" && !hapticFired && Math.abs(dx) >= SWIPE_THRESHOLD) {
				triggerHaptic("selection");
				hapticFired = true;
			}
		}

		function onEnd(e: TouchEvent) {
			if (!tracking) return;
			const touch = e.changedTouches[0];
			tracking = false;
			if (!touch) return;
			const dx = touch.clientX - startX;
			directionLocked = null;
			hapticFired = false;
			if (Math.abs(dx) < SWIPE_THRESHOLD) return;

			const currentPeriod = (searchParams.get(PERIOD_SEARCH_PARAM) ??
				DEFAULT_PERIOD) as DashboardPeriod;
			const idx = PERIOD_ORDER.indexOf(currentPeriod);
			if (idx < 0) return;
			// Swipe left → next period, swipe right → previous
			const nextIdx = dx < 0 ? idx + 1 : idx - 1;
			if (nextIdx < 0 || nextIdx >= PERIOD_ORDER.length) return;
			const nextPeriod = PERIOD_ORDER[nextIdx];
			if (!nextPeriod || nextPeriod === currentPeriod) return;

			const params = new URLSearchParams(searchParams);
			if (nextPeriod === DEFAULT_PERIOD) {
				params.delete(PERIOD_SEARCH_PARAM);
			} else {
				params.set(PERIOD_SEARCH_PARAM, nextPeriod);
			}
			const query = params.toString();
			router.push(query ? `?${query}` : ".", { scroll: false });
		}

		el.addEventListener("touchstart", onStart, { passive: true });
		el.addEventListener("touchmove", onMove, { passive: true });
		el.addEventListener("touchend", onEnd, { passive: true });
		el.addEventListener("touchcancel", reset, { passive: true });

		return () => {
			el.removeEventListener("touchstart", onStart);
			el.removeEventListener("touchmove", onMove);
			el.removeEventListener("touchend", onEnd);
			el.removeEventListener("touchcancel", reset);
		};
	}, [isMobile, router, searchParams]);

	return (
		<div ref={containerRef} data-testid="dashboard-period-swipe">
			{children}
		</div>
	);
}
