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
export function TableScrollContainer({
	children,
	className,
}: TableScrollContainerProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);

	const updateScrollIndicators = () => {
		const el = scrollRef.current;
		if (!el) return;

		const { scrollLeft, scrollWidth, clientWidth } = el;
		setCanScrollLeft(scrollLeft > 0);
		setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
	};

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;

		updateScrollIndicators();

		el.addEventListener("scroll", updateScrollIndicators, { passive: true });
		window.addEventListener("resize", updateScrollIndicators);

		// Observer pour détecter les changements de contenu
		const resizeObserver = new ResizeObserver(updateScrollIndicators);
		resizeObserver.observe(el);

		return () => {
			el.removeEventListener("scroll", updateScrollIndicators);
			window.removeEventListener("resize", updateScrollIndicators);
			resizeObserver.disconnect();
		};
	}, [updateScrollIndicators]);

	return (
		<div className={cn("relative", className)}>
			{/* Indicateur scroll gauche */}
			<div
				className={cn(
					"absolute left-0 top-0 bottom-0 w-4 pointer-events-none z-10",
					"bg-linear-to-r from-background to-transparent",
					"transition-opacity duration-200",
					"lg:hidden", // Visible uniquement sur mobile/tablet
					canScrollLeft ? "opacity-100" : "opacity-0"
				)}
				aria-hidden="true"
			/>

			{/* Container scrollable */}
			<div
				ref={scrollRef}
				className="overflow-x-auto"
				tabIndex={0}
				role="region"
				aria-label="Tableau avec scroll horizontal"
			>
				{children}
			</div>

			{/* Indicateur scroll droite */}
			<div
				className={cn(
					"absolute right-0 top-0 bottom-0 w-4 pointer-events-none z-10",
					"bg-linear-to-l from-background to-transparent",
					"transition-opacity duration-200",
					"lg:hidden", // Visible uniquement sur mobile/tablet
					canScrollRight ? "opacity-100" : "opacity-0"
				)}
				aria-hidden="true"
			/>

			{/* Message pour lecteurs d'écran */}
			{(canScrollLeft || canScrollRight) && (
				<span className="sr-only">
					Faites défiler horizontalement pour voir plus de colonnes
				</span>
			)}
		</div>
	);
}
