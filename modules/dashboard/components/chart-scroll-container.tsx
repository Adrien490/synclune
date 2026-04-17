"use client";

import ScrollFade from "@/shared/components/scroll-fade";

interface ChartScrollContainerProps {
	children: React.ReactNode;
	/** Accessible label for the chart region */
	"aria-label"?: string;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Container for charts and any horizontally-scrollable dashboard content.
 *
 * Wraps content in ScrollFade so that, when the inner content overflows the
 * viewport (typically on mobile where charts have a min-width), gradient edge
 * indicators appear on the left/right to signal scrollable content.
 * On desktop where content fits, no fade is shown — natural rendering.
 */
export function ChartScrollContainer({
	children,
	"aria-label": ariaLabel = "Zone de graphique",
	className,
}: ChartScrollContainerProps) {
	return (
		<div role="region" aria-label={ariaLabel} className={className} data-no-swipe-nav>
			<ScrollFade axis="horizontal">{children}</ScrollFade>
		</div>
	);
}
