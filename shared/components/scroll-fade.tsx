"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/shared/utils/cn";

type ScrollAxis = "horizontal" | "vertical" | "both";

interface ScrollFadeProps {
	children: ReactNode;
	className?: string;
	rootClassName?: string;
	hideScrollbar?: boolean;
	axis?: ScrollAxis;
	/**
	 * Tailwind class used as the gradient start color for edge fades.
	 * Default `from-background` matches shadcn's page surface; override with
	 * `from-muted`, `from-card`, etc. when the container sits on a different
	 * surface (e.g. admin menu sheet on `bg-muted`).
	 */
	fadeFromClass?: string;
	/**
	 * When provided, the scroll container itself becomes a keyboard-focusable
	 * landmark: `role="region"`, `tabIndex={0}`, an `aria-label`, and a visible
	 * focus ring. Use it for scrollable content WITHOUT focusable children
	 * (charts, KPI grids) so keyboard users can scroll with the arrow keys.
	 * Leave it undefined for carousels of links/buttons — their children are
	 * already in the tab order and an extra tab stop would be redundant.
	 */
	scrollRegionLabel?: string;
}

export default function ScrollFade({
	children,
	className,
	rootClassName,
	hideScrollbar = true,
	axis = "horizontal",
	fadeFromClass = "from-background",
	scrollRegionLabel,
}: ScrollFadeProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const contentRef = useRef<HTMLDivElement | null>(null);

	// Raw, axis-independent overflow flags. Storing booleans (instead of the
	// raw scroll metrics) lets React bail out of re-renders while scrolling:
	// a render only happens when a threshold is actually crossed. Axis gating
	// is applied at render time so the measurement stays prop-independent.
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);
	const [canScrollUp, setCanScrollUp] = useState(false);
	const [canScrollDown, setCanScrollDown] = useState(false);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		// Feature check pour anciens navigateurs
		if (typeof ResizeObserver === "undefined") return;

		let rafId: number | null = null;

		const measure = () => {
			rafId = null;
			const el = containerRef.current;
			if (!el) return;

			const { scrollLeft, scrollTop, scrollWidth, scrollHeight, clientWidth, clientHeight } = el;

			setCanScrollLeft(scrollLeft > 0);
			// -1 compensates for sub-pixel rounding between scrollWidth and clientWidth + scrollLeft
			setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < Math.floor(scrollWidth - 1));
			setCanScrollUp(scrollTop > 0);
			// -1 compensates for sub-pixel rounding between scrollHeight and clientHeight + scrollTop
			setCanScrollDown(Math.ceil(scrollTop + clientHeight) < Math.floor(scrollHeight - 1));
		};

		// Coalesce bursts of scroll/resize events into a single layout read
		// per animation frame.
		const scheduleMeasure = () => {
			if (rafId !== null) return;
			rafId = requestAnimationFrame(measure);
		};

		container.addEventListener("scroll", scheduleMeasure, { passive: true });

		const ro = new ResizeObserver(scheduleMeasure);
		if (contentRef.current) ro.observe(contentRef.current);
		ro.observe(container);

		window.addEventListener("resize", scheduleMeasure, { passive: true });

		// Initial measurement (post-mount). The one-frame delay is absorbed by
		// the overlays' opacity transition — fades ease in rather than pop.
		scheduleMeasure();

		return () => {
			container.removeEventListener("scroll", scheduleMeasure);
			window.removeEventListener("resize", scheduleMeasure);
			ro.disconnect();
			if (rafId !== null) cancelAnimationFrame(rafId);
		};
	}, []);

	// Axis gating happens at render time: the measurement above is
	// prop-independent, so an `axis` change re-derives the fades without a
	// re-measure (and the ResizeObserver still catches any layout shift).
	const horizontal = axis === "horizontal" || axis === "both";
	const vertical = axis === "vertical" || axis === "both";
	const showLeft = horizontal && canScrollLeft;
	const showRight = horizontal && canScrollRight;
	const showTop = vertical && canScrollUp;
	const showBottom = vertical && canScrollDown;
	const hasOverflow = showLeft || showRight || showTop || showBottom;

	// Grouped, conditional a11y props: when a label is given the scroll
	// container itself becomes the focusable landmark (see prop JSDoc).
	const scrollRegionProps = scrollRegionLabel
		? { role: "region" as const, "aria-label": scrollRegionLabel, tabIndex: 0 }
		: undefined;

	return (
		<div className={cn("relative h-full", rootClassName)} data-testid="scroll-fade-root">
			{hasOverflow && (
				<span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
					Faites défiler pour voir plus de contenu
				</span>
			)}
			<div
				ref={containerRef}
				data-slot="scroll-fade-container"
				data-testid="scroll-fade-container"
				{...scrollRegionProps}
				className={cn(
					hideScrollbar &&
						"[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
					axis === "horizontal" && "w-full overflow-x-auto overflow-y-hidden",
					axis === "vertical" && "h-full overflow-x-hidden overflow-y-auto",
					axis === "both" && "overflow-auto",
					scrollRegionLabel &&
						"focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
					className,
				)}
			>
				<div
					ref={contentRef}
					className={cn(
						axis === "horizontal" && "w-fit min-w-full",
						axis === "vertical" && "h-fit",
						axis === "both" && "h-fit w-fit min-w-full",
					)}
				>
					{children}
				</div>
			</div>

			{/* Edge fades are always mounted and toggled via opacity so they ease
			    in/out instead of popping when a scroll threshold is crossed. */}
			{horizontal && (
				<div
					aria-hidden="true"
					className={cn(
						"pointer-events-none absolute top-0 left-0 z-10 h-full w-10 bg-linear-to-r to-transparent transition-opacity duration-200",
						fadeFromClass,
						showLeft ? "opacity-100" : "opacity-0",
					)}
				/>
			)}

			{horizontal && (
				<div
					aria-hidden="true"
					className={cn(
						"pointer-events-none absolute top-0 right-0 z-10 h-full w-10 bg-linear-to-l to-transparent transition-opacity duration-200",
						fadeFromClass,
						showRight ? "opacity-100" : "opacity-0",
					)}
				/>
			)}

			{vertical && (
				<div
					aria-hidden="true"
					className={cn(
						"pointer-events-none absolute top-0 left-0 z-10 h-10 w-full bg-linear-to-b to-transparent transition-opacity duration-200",
						fadeFromClass,
						showTop ? "opacity-100" : "opacity-0",
					)}
				/>
			)}

			{vertical && (
				<div
					aria-hidden="true"
					className={cn(
						"pointer-events-none absolute bottom-0 left-0 z-10 h-10 w-full bg-linear-to-t to-transparent transition-opacity duration-200",
						fadeFromClass,
						showBottom ? "opacity-100" : "opacity-0",
					)}
				/>
			)}
		</div>
	);
}
