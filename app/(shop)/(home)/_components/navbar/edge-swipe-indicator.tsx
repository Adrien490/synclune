"use client";

import type { Ref } from "react";

interface EdgeSwipeIndicatorProps {
	/**
	 * Le parent écrit `style.opacity` (0–1) sur ce nœud depuis le `onProgress` de
	 * `useEdgeSwipe`. ⚠️ Volontairement PAS une prop `progress` : `onProgress` tire
	 * une fois par `touchmove`, donc la faire transiter par un `useState` re-rendait
	 * tout le `MenuSheet` à chaque frame du geste — pour une seule opacité inline.
	 * Même arbitrage que `quick-search-dialog.tsx`, qui écrit `style.transform`
	 * sur un ref pour la même raison.
	 */
	ref?: Ref<HTMLDivElement>;
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
export function EdgeSwipeIndicator({ ref, hidden = false }: EdgeSwipeIndicatorProps) {
	if (hidden) return null;
	return (
		<div
			ref={ref}
			aria-hidden="true"
			className="from-primary/40 pointer-events-none fixed inset-y-0 left-0 z-(--z-overlay) w-1 bg-linear-to-r to-transparent transition-opacity duration-75 ease-out motion-reduce:hidden lg:hidden"
			style={{ opacity: 0 }}
		/>
	);
}
