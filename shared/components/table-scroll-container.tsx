"use client";

import { cn } from "@/shared/utils/cn";
import { ReactNode, useEffect, useRef, useState } from "react";

interface TableScrollContainerProps {
	children: ReactNode;
	className?: string;
}

/**
 * Container pour tables avec indicateurs de scroll horizontal
 * Affiche des gradients pour indiquer qu'il y a plus de contenu
 * visible uniquement sur mobile/tablet
 */
export function TableScrollContainer({ children, className }: TableScrollContainerProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;

		const updateScrollIndicators = () => {
			const { scrollLeft, scrollWidth, clientWidth } = el;
			setCanScrollLeft(scrollLeft > 0);
			setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
		};

		updateScrollIndicators();

		el.addEventListener("scroll", updateScrollIndicators, { passive: true });
		window.addEventListener("resize", updateScrollIndicators);

		const resizeObserver = new ResizeObserver(updateScrollIndicators);
		resizeObserver.observe(el);

		return () => {
			el.removeEventListener("scroll", updateScrollIndicators);
			window.removeEventListener("resize", updateScrollIndicators);
			resizeObserver.disconnect();
		};
	}, []);

	return (
		<div className={cn("relative", className)}>
			{/* Indicateur scroll gauche */}
			<div
				className={cn(
					"pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-4",
					"from-background bg-linear-to-r to-transparent",
					"transition-opacity duration-200",
					"lg:hidden", // Visible uniquement sur mobile/tablet
					canScrollLeft ? "opacity-100" : "opacity-0",
				)}
				aria-hidden="true"
			/>

			{/* Container scrollable */}
			<div
				ref={scrollRef}
				className="focus-visible:ring-ring overflow-x-auto focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
				// eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable container needs keyboard access
				tabIndex={0}
				role="region"
				aria-label="Tableau avec scroll horizontal"
			>
				{children}
			</div>

			{/* Indicateur scroll droite */}
			<div
				className={cn(
					"pointer-events-none absolute top-0 right-0 bottom-0 z-10 w-4",
					"from-background bg-linear-to-l to-transparent",
					"transition-opacity duration-200",
					"lg:hidden", // Visible uniquement sur mobile/tablet
					canScrollRight ? "opacity-100" : "opacity-0",
				)}
				aria-hidden="true"
			/>

			{/* Message pour lecteurs d'écran */}
			{(canScrollLeft || canScrollRight) && (
				<span className="sr-only">Faites défiler horizontalement pour voir plus de colonnes</span>
			)}
		</div>
	);
}
