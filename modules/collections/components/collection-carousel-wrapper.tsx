"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import {
	memo,
	useCallback,
	useEffect,
	useRef,
	useSyncExternalStore,
	type ReactNode,
} from "react";

// ============================================================================
// Types
// ============================================================================

interface CollectionCarouselWrapperProps {
	children: ReactNode;
	className?: string;
	showArrows?: boolean;
	showDots?: boolean;
}

interface CarouselArrowButtonProps {
	direction: "left" | "right";
	onClick: () => void;
	disabled: boolean;
}

interface CarouselDotsProps {
	totalDots: number;
	activeIndex: number;
	onDotClick: (index: number) => void;
}

interface CarouselState {
	activeIndex: number;
	totalItems: number;
}

// État initial pour SSR (doit être stable/cached pour éviter boucle infinie)
const INITIAL_STATE: CarouselState = { activeIndex: 0, totalItems: 0 };

// ============================================================================
// Store externe pour le carousel (pattern useSyncExternalStore)
// ============================================================================

function createCarouselStore() {
	let state: CarouselState = { activeIndex: 0, totalItems: 0 };
	const listeners = new Set<() => void>();

	return {
		getState: () => state,
		setState: (newState: Partial<CarouselState>) => {
			const nextState = { ...state, ...newState };
			// Évite les re-renders inutiles si l'état n'a pas changé
			if (
				nextState.activeIndex === state.activeIndex &&
				nextState.totalItems === state.totalItems
			) {
				return;
			}
			state = nextState;
			listeners.forEach((listener) => listener());
		},
		subscribe: (listener: () => void) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		reset: () => {
			state = { activeIndex: 0, totalItems: 0 };
		},
	};
}

// ============================================================================
// CarouselArrowButton
// ============================================================================

const CarouselArrowButton = memo(function CarouselArrowButton({
	direction,
	onClick,
	disabled,
}: CarouselArrowButtonProps) {
	const Icon = direction === "left" ? ChevronLeft : ChevronRight;
	const positionClass = direction === "left" ? "left-4" : "right-4";
	const label =
		direction === "left"
			? "Voir les collections précédentes"
			: "Voir les collections suivantes";

	return (
		<Button
			variant="outline"
			size="icon"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"absolute top-[40%] -translate-y-1/2 z-20",
				positionClass,
				"hidden lg:flex",
				"opacity-0 group-hover/carousel:opacity-100 group-focus-within/carousel:opacity-100",
				"rounded-full bg-card/95 backdrop-blur-sm",
				"border border-primary/20",
				"shadow-lg hover:shadow-xl",
				"text-foreground/70",
				"hover:bg-primary/10 hover:text-primary hover:border-primary/40 hover:scale-105",
				"disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100",
				"transition-all duration-300 ease-out"
			)}
			aria-label={label}
		>
			<Icon className="size-5" />
		</Button>
	);
});

// ============================================================================
// CarouselDots - 1 dot = 1 item
// ============================================================================

const CarouselDots = memo(function CarouselDots({
	totalDots,
	activeIndex,
	onDotClick,
}: CarouselDotsProps) {
	const prefersReducedMotion = useReducedMotion();

	if (totalDots <= 1) return null;

	return (
		<div
			className="flex flex-col items-center gap-1 pt-4 lg:hidden"
			role="tablist"
			aria-label="Navigation du carousel"
		>
			<div className="flex justify-center">
				{Array.from({ length: totalDots }, (_, index) => (
					<button
						key={index}
						type="button"
						role="tab"
						aria-selected={index === activeIndex}
						aria-label={`Aller à la collection ${index + 1}`}
						onClick={() => onDotClick(index)}
						className={cn(
							"relative w-11 h-11 flex items-center justify-center",
							"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:rounded-full"
						)}
					>
						<span
							className={cn(
								"rounded-full",
								!prefersReducedMotion && "transition-all duration-300 ease-out",
								index === activeIndex
									? "h-2 w-8 sm:h-2.5 sm:w-10 bg-primary shadow-md"
									: "h-2 w-2 sm:h-2.5 sm:w-2.5 bg-muted-foreground/50 hover:bg-muted-foreground/70"
							)}
						/>
					</button>
				))}
			</div>
			<span className="text-xs text-muted-foreground sr-only sm:not-sr-only">
				{activeIndex + 1} sur {totalDots}
			</span>
			<div className="sr-only" aria-live="polite" aria-atomic="true">
				Collection {activeIndex + 1} sur {totalDots}
			</div>
		</div>
	);
});

// ============================================================================
// CollectionCarouselWrapper - Pattern useSyncExternalStore (React 18/19)
// ============================================================================

export function CollectionCarouselWrapper({
	children,
	className,
	showArrows = true,
	showDots = true,
}: CollectionCarouselWrapperProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const storeRef = useRef(createCarouselStore());
	const visibilityMapRef = useRef<Map<number, number>>(new Map());

	// Refs pour éviter les race conditions scroll + IntersectionObserver
	const isScrollingRef = useRef(false);
	const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const itemCountRef = useRef(0);

	// Souscription au store avec useSyncExternalStore (évite les tearing issues)
	const { activeIndex, totalItems } = useSyncExternalStore(
		storeRef.current.subscribe,
		storeRef.current.getState,
		// SSR: retourne l'état initial (doit être stable/cached)
		() => INITIAL_STATE
	);

	// Scroll vers un item spécifique (avec protection race condition)
	const scrollToItem = useCallback((index: number) => {
		// Cancel le scroll précédent si en cours
		if (scrollTimeoutRef.current) {
			clearTimeout(scrollTimeoutRef.current);
		}

		const container = containerRef.current?.querySelector(
			"[data-carousel-scroll]"
		);
		const item = container?.querySelector(
			`[data-index="${index}"]`
		) as HTMLElement;

		if (!item) return;

		// Flag pour ignorer les updates de l'IntersectionObserver pendant le scroll
		isScrollingRef.current = true;

		item.scrollIntoView({
			behavior: "smooth",
			inline: "center",
			block: "nearest",
		});

		// Après le scroll smooth (~500ms), forcer l'index correct et réactiver l'observer
		scrollTimeoutRef.current = setTimeout(() => {
			isScrollingRef.current = false;
			storeRef.current.setState({ activeIndex: index });
		}, 500);
	}, []);

	// Navigation par flèches (utilise le store directement pour éviter les closures stales)
	const handleScrollLeft = useCallback(() => {
		const { activeIndex: currentIndex } = storeRef.current.getState();
		scrollToItem(Math.max(currentIndex - 1, 0));
	}, [scrollToItem]);

	const handleScrollRight = useCallback(() => {
		const { activeIndex: currentIndex, totalItems: total } =
			storeRef.current.getState();
		scrollToItem(Math.min(currentIndex + 1, total - 1));
	}, [scrollToItem]);

	// Navigation clavier
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			const { activeIndex: currentIndex, totalItems: total } =
				storeRef.current.getState();

			if (e.key === "ArrowLeft" && currentIndex > 0) {
				e.preventDefault();
				handleScrollLeft();
			} else if (e.key === "ArrowRight" && currentIndex < total - 1) {
				e.preventDefault();
				handleScrollRight();
			}
		},
		[handleScrollLeft, handleScrollRight]
	);

	// Cleanup du timeout au unmount
	useEffect(() => {
		return () => {
			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current);
			}
		};
	}, []);

	// Setup de l'IntersectionObserver
	useEffect(() => {
		const container = containerRef.current?.querySelector(
			"[data-carousel-scroll]"
		);
		if (!container) return;

		const items = container.querySelectorAll("[data-index]");
		const itemCount = items.length;

		// Skip si le nombre d'items n'a pas changé (évite re-création inutile de l'observer)
		if (itemCount === itemCountRef.current && itemCount > 0) return;
		itemCountRef.current = itemCount;

		// Met à jour le nombre total d'items
		storeRef.current.setState({ totalItems: itemCount });

		if (itemCount === 0) return;

		// Reset la map de visibilité
		visibilityMapRef.current.clear();

		const observer = new IntersectionObserver(
			(entries) => {
				// Ignorer les updates pendant un scroll programmatique (évite race condition)
				if (isScrollingRef.current) return;

				// Met à jour les ratios de visibilité
				for (const entry of entries) {
					const index = Number(entry.target.getAttribute("data-index"));
					if (!isNaN(index)) {
						if (entry.isIntersecting) {
							visibilityMapRef.current.set(index, entry.intersectionRatio);
						} else {
							visibilityMapRef.current.delete(index);
						}
					}
				}

				// Si map vide (momentum scroll rapide), garder l'ancien activeIndex
				if (visibilityMapRef.current.size === 0) return;

				// Trouve les items avec le plus grand ratio de visibilité
				let maxRatio = 0;
				const candidates: number[] = [];

				visibilityMapRef.current.forEach((ratio, index) => {
					if (ratio > maxRatio) {
						maxRatio = ratio;
						candidates.length = 0;
						candidates.push(index);
					} else if (ratio === maxRatio) {
						candidates.push(index);
					}
				});

				// Si plusieurs candidats avec même ratio (ex: tous visibles), prendre le médian
				const mostVisibleIndex =
					candidates[Math.floor(candidates.length / 2)] ?? 0;
				storeRef.current.setState({ activeIndex: mostVisibleIndex });
			},
			{
				root: container,
				threshold: [0, 0.25, 0.5, 0.75, 1],
			}
		);

		items.forEach((item) => observer.observe(item));

		return () => {
			observer.disconnect();
			visibilityMapRef.current.clear();
		};
	}, [children]);

	// États dérivés (calculés à chaque render, pas de state)
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
				{showArrows && (
					<CarouselArrowButton
						direction="left"
						onClick={handleScrollLeft}
						disabled={!canScrollLeft}
					/>
				)}

				{children}

				{showArrows && (
					<CarouselArrowButton
						direction="right"
						onClick={handleScrollRight}
						disabled={!canScrollRight}
					/>
				)}
			</div>

			{showDots && (
				<CarouselDots
					totalDots={totalItems}
					activeIndex={activeIndex}
					onDotClick={scrollToItem}
				/>
			)}
		</div>
	);
}
