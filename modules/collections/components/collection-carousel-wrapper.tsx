"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";

// ============================================================================
// Utils
// ============================================================================

/**
 * Throttle helper pour limiter les appels fréquents
 */
function throttle<T extends (...args: unknown[]) => void>(fn: T, ms: number) {
	let lastCall = 0;
	return (...args: Parameters<T>) => {
		const now = Date.now();
		if (now - lastCall >= ms) {
			lastCall = now;
			fn(...args);
		}
	};
}

// ============================================================================
// Types
// ============================================================================

interface CollectionCarouselWrapperProps {
	children: ReactNode;
	/** Classes additionnelles pour le container */
	className?: string;
	/** Afficher les flèches de navigation (desktop uniquement) */
	showArrows?: boolean;
	/** Afficher les indicateurs de position (dots) */
	showDots?: boolean;
}

interface CarouselArrowButtonProps {
	direction: "left" | "right";
	onClick: () => void;
	disabled: boolean;
}

// ============================================================================
// CarouselArrowButton - Composant interne réutilisable
// ============================================================================

function CarouselArrowButton({
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
				// Position absolue - centrée sur la zone image des cards (aspect-square = ~40% de la hauteur totale)
				"absolute top-[40%] -translate-y-1/2 z-20",
				positionClass,
				// Caché sur mobile/tablet, visible desktop uniquement
				"hidden lg:flex",
				// Caché par défaut, visible au survol du groupe
				"opacity-0 group-hover/carousel:opacity-100 group-focus-within/carousel:opacity-100",
				// Style avec fond card et bordure dorée
				"rounded-full bg-card border-2 border-secondary",
				// Shadow pour profondeur
				"shadow-lg hover:shadow-xl",
				// Icône dorée (secondary)
				"text-secondary",
				// Hover state - fond doré avec texte contrasté
				"hover:bg-secondary hover:text-secondary-foreground hover:scale-105",
				// Disabled state - visible mais atténué
				"disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100",
				// Transition fluide
				"transition-all duration-300 ease-out"
			)}
			aria-label={label}
		>
			<Icon className="h-6 w-6" />
		</Button>
	);
}

// ============================================================================
// CarouselDots - Indicateurs de position
// ============================================================================

interface CarouselDotsProps {
	totalDots: number;
	activeIndex: number;
	onDotClick: (index: number) => void;
}

function CarouselDots({ totalDots, activeIndex, onDotClick }: CarouselDotsProps) {
	if (totalDots <= 1) return null;

	return (
		<div
			className="flex flex-col items-center gap-1 pt-4"
			role="tablist"
			aria-label="Navigation du carousel"
		>
			{/* Dots avec touch targets 44x44px (a11y mobile) */}
			<div className="flex justify-center">
				{Array.from({ length: totalDots }, (_, index) => (
					<button
						key={index}
						type="button"
						role="tab"
						aria-selected={index === activeIndex}
						aria-label={`Aller à la page ${index + 1}`}
						onClick={() => onDotClick(index)}
						className={cn(
							// Touch target 44x44px pour accessibilité mobile
							"relative w-11 h-11 flex items-center justify-center",
							"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:rounded-full"
						)}
					>
						{/* Dot visuel interne */}
						<span
							className={cn(
								"rounded-full transition-all duration-300 ease-out",
								index === activeIndex
									? "w-6 h-2 bg-primary"
									: "w-2 h-2 bg-muted-foreground/50 hover:bg-muted-foreground/70"
							)}
						/>
					</button>
				))}
			</div>
			{/* Indicateur de page pour orientation (sr-only sur mobile, visible desktop) */}
			<span className="text-xs text-muted-foreground sr-only sm:not-sr-only">
				{activeIndex + 1} sur {totalDots}
			</span>
		</div>
	);
}

// ============================================================================
// CollectionCarouselWrapper - Composant principal
// ============================================================================

/**
 * Wrapper client-side pour la navigation du carousel de collections
 *
 * Gère :
 * - Les flèches de navigation prev/next (desktop uniquement)
 * - L'état disabled des boutons selon la position de scroll
 * - Le scroll programmatique smooth basé sur la largeur des cards
 * - Les indicateurs de position (dots) cliquables
 *
 * Pattern : Le contenu reste en Server Component, seul le wrapper est client
 */
export function CollectionCarouselWrapper({
	children,
	className,
	showArrows = true,
	showDots = true,
}: CollectionCarouselWrapperProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);
	const [totalDots, setTotalDots] = useState(0);
	const [hasInteracted, setHasInteracted] = useState(false);

	/**
	 * Calcule le scroll amount basé sur la largeur d'une card + gap
	 * Note: Les flèches sont visibles uniquement sur lg: donc on utilise gap-6 (24px)
	 */
	const getScrollAmount = useCallback(() => {
		const container = scrollContainerRef.current;
		if (!container) return 320;

		const card = container.querySelector('[role="listitem"]') as HTMLElement;
		if (!card) return 320;

		// Lecture du gap depuis le computed style pour plus de précision
		const computedGap = parseFloat(getComputedStyle(container).gap) || 24;
		return card.offsetWidth + computedGap;
	}, []);

	/**
	 * Calcule le nombre de dots et l'index actif
	 */
	const updateDotsState = useCallback(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		const scrollAmount = getScrollAmount();
		const { scrollLeft, scrollWidth, clientWidth } = container;

		// Nombre total de "pages" scrollables
		const totalScrollable = scrollWidth - clientWidth;
		const dots = Math.max(1, Math.ceil(totalScrollable / scrollAmount));
		setTotalDots(dots);

		// Index actif basé sur la position de scroll
		const currentIndex = Math.round(scrollLeft / scrollAmount);
		setActiveIndex(Math.min(currentIndex, dots - 1));
	}, [getScrollAmount]);

	/**
	 * Vérifie la position de scroll et met à jour l'état des boutons
	 */
	const checkScrollPosition = useCallback(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		const { scrollLeft, scrollWidth, clientWidth } = container;

		// Peut scroller à gauche si on n'est pas au début
		setCanScrollLeft(scrollLeft > 0);

		// Peut scroller à droite si on n'est pas à la fin (avec marge de 10px)
		setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

		// Mettre à jour les dots
		updateDotsState();
	}, [updateDotsState]);

	/**
	 * Scroll vers la gauche (une card)
	 */
	const handleScrollLeft = useCallback(() => {
		scrollContainerRef.current?.scrollBy({
			left: -getScrollAmount(),
			behavior: "smooth",
		});
	}, [getScrollAmount]);

	/**
	 * Scroll vers la droite (une card)
	 */
	const handleScrollRight = useCallback(() => {
		scrollContainerRef.current?.scrollBy({
			left: getScrollAmount(),
			behavior: "smooth",
		});
	}, [getScrollAmount]);

	/**
	 * Scroll vers un dot spécifique
	 */
	const handleDotClick = useCallback(
		(index: number) => {
			const container = scrollContainerRef.current;
			if (!container) return;

			const scrollAmount = getScrollAmount();
			container.scrollTo({
				left: index * scrollAmount,
				behavior: "smooth",
			});
		},
		[getScrollAmount]
	);

	/**
	 * Handler navigation clavier (ArrowLeft/ArrowRight)
	 */
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "ArrowLeft" && canScrollLeft) {
				e.preventDefault();
				handleScrollLeft();
			} else if (e.key === "ArrowRight" && canScrollRight) {
				e.preventDefault();
				handleScrollRight();
			}
		},
		[canScrollLeft, canScrollRight, handleScrollLeft, handleScrollRight]
	);

	/**
	 * Throttled version de checkScrollPosition pour ResizeObserver
	 */
	const throttledCheck = useMemo(
		() => throttle(checkScrollPosition, 100),
		[checkScrollPosition]
	);

	/**
	 * Setup des event listeners sur le scroll container
	 */
	useEffect(() => {
		const container = containerRef.current?.querySelector(
			"[data-carousel-scroll]"
		) as HTMLDivElement | null;

		scrollContainerRef.current = container;

		if (!container) return;

		// Check initial position
		checkScrollPosition();

		// Listen to scroll events
		container.addEventListener("scroll", checkScrollPosition);

		// Listen to resize (throttled pour performance)
		const resizeObserver = new ResizeObserver(throttledCheck);
		resizeObserver.observe(container);

		return () => {
			container.removeEventListener("scroll", checkScrollPosition);
			resizeObserver.disconnect();
		};
	}, [checkScrollPosition, throttledCheck]);

	/**
	 * Marquer comme interagi au premier scroll/touch (désactive le hint swipe)
	 */
	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container || hasInteracted) return;

		const handleFirstInteraction = () => {
			setHasInteracted(true);
		};

		container.addEventListener("scroll", handleFirstInteraction, {
			passive: true,
			once: true,
		});
		container.addEventListener("touchstart", handleFirstInteraction, {
			passive: true,
			once: true,
		});

		return () => {
			container.removeEventListener("scroll", handleFirstInteraction);
			container.removeEventListener("touchstart", handleFirstInteraction);
		};
	}, [hasInteracted]);

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
			data-swipe-hint={!hasInteracted ? "true" : undefined}
		>
			{/* Container pour le carousel + flèches (les flèches sont centrées sur cette zone) */}
			<div className="relative">
				{/* Flèche gauche */}
				{showArrows && (
					<CarouselArrowButton
						direction="left"
						onClick={handleScrollLeft}
						disabled={!canScrollLeft}
					/>
				)}

				{/* Contenu du carousel (Server Component) */}
				{children}

				{/* Flèche droite */}
				{showArrows && (
					<CarouselArrowButton
						direction="right"
						onClick={handleScrollRight}
						disabled={!canScrollRight}
					/>
				)}
			</div>

			{/* Indicateurs de position (dots) - en dehors du container des flèches */}
			{showDots && (
				<CarouselDots
					totalDots={totalDots}
					activeIndex={activeIndex}
					onDotClick={handleDotClick}
				/>
			)}
		</div>
	);
}
