"use client";

interface EdgeSwipeIndicatorProps {
	/** 0–1 swipe progress from `useEdgeSwipe`'s onProgress callback. */
	progress: number;
	/** Hide entirely when the sheet is already open. */
	hidden?: boolean;
}

/**
 * iOS-native rubber-band preview rendered on the left edge while the user is
 * dragging from offscreen. Drives opacity from the swipe progress so the user
 * sees something is happening before the threshold (30px) is crossed.
 *
 * Hidden on desktop (`lg:hidden`) and under prefers-reduced-motion
 * (`motion-reduce:hidden`) since the underlying gesture is itself skipped
 * for those users (cf. useEdgeSwipe WCAG 2.3.3 guard).
 */
export function EdgeSwipeIndicator({ progress, hidden = false }: EdgeSwipeIndicatorProps) {
	if (hidden) return null;
	return (
		<div
			aria-hidden="true"
			className="from-primary/40 pointer-events-none fixed inset-y-0 left-0 z-(--z-overlay) w-1 bg-linear-to-r to-transparent transition-opacity duration-75 ease-out motion-reduce:hidden lg:hidden"
			style={{ opacity: progress }}
		/>
	);
}
