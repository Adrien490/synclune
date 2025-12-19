"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { ChevronLeft, ChevronRight, MoveHorizontal } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

// ============================================================================
// Types
// ============================================================================

interface CollectionCarouselWrapperProps {
	children: ReactNode;
	className?: string;
	showArrows?: boolean;
	showDots?: boolean;
}

// ============================================================================
// CollectionCarouselWrapper
// ============================================================================

export function CollectionCarouselWrapper({
	children,
	className,
	showArrows = true,
	showDots = true,
}: CollectionCarouselWrapperProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const isScrollingRef = useRef(false);
	const prefersReducedMotion = useReducedMotion();

	const [activeIndex, setActiveIndex] = useState(0);
	const [totalItems, setTotalItems] = useState(0);

	// Scroll vers un item
	const scrollToItem = (index: number) => {
		const container = containerRef.current?.querySelector("[data-carousel-scroll]");
		const item = container?.querySelector(`[data-index="${index}"]`) as HTMLElement;
		if (!item || !container) return;

		isScrollingRef.current = true;
		item.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });

		// scrollend event (moderne) + fallback
		const onScrollEnd = () => {
			isScrollingRef.current = false;
			setActiveIndex(index);
			container.removeEventListener("scrollend", onScrollEnd);
		};
		container.addEventListener("scrollend", onScrollEnd, { once: true });
		setTimeout(() => {
			container.removeEventListener("scrollend", onScrollEnd);
			isScrollingRef.current = false;
			setActiveIndex(index);
		}, 600);
	};

	// Navigation
	const scrollLeft = () => {
		if (!isScrollingRef.current && activeIndex > 0) {
			scrollToItem(activeIndex - 1);
		}
	};

	const scrollRight = () => {
		if (!isScrollingRef.current && activeIndex < totalItems - 1) {
			scrollToItem(activeIndex + 1);
		}
	};

	// Clavier
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "ArrowLeft") {
			e.preventDefault();
			scrollLeft();
		} else if (e.key === "ArrowRight") {
			e.preventDefault();
			scrollRight();
		} else if (e.key === "Home") {
			e.preventDefault();
			scrollToItem(0);
		} else if (e.key === "End") {
			e.preventDefault();
			scrollToItem(totalItems - 1);
		}
	};

	// Setup scroll tracking
	useEffect(() => {
		const container = containerRef.current?.querySelector("[data-carousel-scroll]");
		if (!container) return;

		const items = container.querySelectorAll("[data-index]");
		setTotalItems(items.length);
		if (items.length === 0) return;

		const handleScroll = () => {
			if (isScrollingRef.current) return;

			const containerRect = container.getBoundingClientRect();
			const containerCenter = containerRect.left + containerRect.width / 2;

			let closestIndex = 0;
			let closestDistance = Infinity;

			items.forEach((item, index) => {
				const rect = item.getBoundingClientRect();
				const itemCenter = rect.left + rect.width / 2;
				const distance = Math.abs(itemCenter - containerCenter);
				if (distance < closestDistance) {
					closestDistance = distance;
					closestIndex = index;
				}
			});

			setActiveIndex(closestIndex);
		};

		// Throttle RAF
		let ticking = false;
		const onScroll = () => {
			if (!ticking) {
				requestAnimationFrame(() => {
					handleScroll();
					ticking = false;
				});
				ticking = true;
			}
		};

		container.addEventListener("scroll", onScroll, { passive: true });
		handleScroll(); // Initial

		return () => container.removeEventListener("scroll", onScroll);
	}, [children]);

	const canScrollLeft = activeIndex > 0;
	const canScrollRight = activeIndex < totalItems - 1;

	return (
		<div
			ref={containerRef}
			className={cn(
				"group/carousel outline-none",
				"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-lg",
				className
			)}
			tabIndex={0}
			role="region"
			aria-label="Carousel de collections"
			aria-roledescription="carousel"
			onKeyDown={handleKeyDown}
		>
			<div className="relative">
				{/* Flèche gauche */}
				{showArrows && (
					<Button
						variant="outline"
						size="icon"
						onClick={scrollLeft}
						disabled={!canScrollLeft}
						className={cn(
							"absolute left-4 top-[40%] -translate-y-1/2 z-20",
							"hidden md:flex",
							"opacity-30 group-hover/carousel:opacity-100 group-focus-within/carousel:opacity-100",
							// Forme et fond primary
							"rounded-full bg-primary",
							// Ombres
							"shadow-lg hover:shadow-xl",
							// Couleurs
							"border-0 text-primary-foreground",
							"hover:bg-primary/90 hover:scale-105",
							// États disabled
							"disabled:opacity-40 disabled:pointer-events-none",
							"transition-all duration-300"
						)}
						aria-label="Voir les collections précédentes"
					>
						<ChevronLeft className="size-5" />
					</Button>
				)}

				{children}

				{/* Flèche droite */}
				{showArrows && (
					<Button
						variant="outline"
						size="icon"
						onClick={scrollRight}
						disabled={!canScrollRight}
						className={cn(
							"absolute right-4 top-[40%] -translate-y-1/2 z-20",
							"hidden md:flex",
							"opacity-30 group-hover/carousel:opacity-100 group-focus-within/carousel:opacity-100",
							// Forme et fond primary
							"rounded-full bg-primary",
							// Ombres
							"shadow-lg hover:shadow-xl",
							// Couleurs
							"border-0 text-primary-foreground",
							"hover:bg-primary/90 hover:scale-105",
							// États disabled
							"disabled:opacity-40 disabled:pointer-events-none",
							"transition-all duration-300"
						)}
						aria-label="Voir les collections suivantes"
					>
						<ChevronRight className="size-5" />
					</Button>
				)}

				{/* Indicateur de scroll (mobile uniquement, disparaît après 3s) */}
				{totalItems > 1 && !prefersReducedMotion && (
					<div
						className="absolute right-6 top-1/2 -translate-y-1/2 z-10 md:hidden pointer-events-none animate-[scroll-hint-fade_3s_ease-out_forwards]"
						aria-hidden="true"
					>
						<div className="flex items-center gap-1.5 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md border border-border/50 animate-[swipe-hint_1s_ease-in-out_3]">
							<MoveHorizontal className="size-4 text-muted-foreground" />
							<span className="text-xs text-muted-foreground font-medium">
								Glisser
							</span>
						</div>
					</div>
				)}
			</div>

			{/* Dots (mobile) */}
			{showDots && totalItems > 1 && (
				<div
					className="flex flex-col items-center gap-1 pt-4 md:hidden"
					role="tablist"
					aria-label="Navigation du carousel"
				>
					<div className="flex justify-center">
						{Array.from({ length: totalItems }, (_, index) => (
							<button
								key={index}
								type="button"
								role="tab"
								aria-selected={index === activeIndex}
								aria-label={`Aller à la collection ${index + 1}`}
								onClick={() => scrollToItem(index)}
								className={cn(
									"relative w-11 h-11 flex items-center justify-center",
									"active:scale-95 transition-transform duration-100",
									"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:rounded-full"
								)}
							>
								<span
									className={cn(
										"rounded-full",
										!prefersReducedMotion && "transition-all duration-150 ease-out",
										index === activeIndex
											? "h-2 w-8 sm:h-2.5 sm:w-10 bg-primary shadow-md"
											: "h-2 w-2 sm:h-2.5 sm:w-2.5 bg-muted-foreground/50 hover:bg-muted-foreground/70"
									)}
								/>
							</button>
						))}
					</div>
					<span className="text-xs text-muted-foreground/70">
						{activeIndex + 1} sur {totalItems}
					</span>
				</div>
			)}

			{/* Live region accessibilité */}
			<div className="sr-only" aria-live="polite" aria-atomic="true">
				Collection {activeIndex + 1} sur {totalItems}
			</div>
		</div>
	);
}
