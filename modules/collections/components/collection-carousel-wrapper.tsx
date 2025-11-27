"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

interface CollectionCarouselWrapperProps {
	children: ReactNode;
	/** Classes additionnelles pour le container */
	className?: string;
	/** Afficher les flèches de navigation (desktop uniquement) */
	showArrows?: boolean;
}

/**
 * Wrapper client-side pour la navigation du carousel de collections
 *
 * Gère :
 * - Les flèches de navigation prev/next (desktop uniquement)
 * - L'état disabled des boutons selon la position de scroll
 * - Le scroll programmatique smooth
 *
 * Pattern : Le contenu reste en Server Component, seul le wrapper est client
 */
export function CollectionCarouselWrapper({
	children,
	className,
	showArrows = true,
}: CollectionCarouselWrapperProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);

	/**
	 * Vérifie la position de scroll et met à jour l'état des boutons
	 */
	const checkScrollPosition = () => {
		const container = scrollContainerRef.current;

		if (!container) return;

		const { scrollLeft, scrollWidth, clientWidth } = container;

		// Peut scroller à gauche si on n'est pas au début
		setCanScrollLeft(scrollLeft > 0);

		// Peut scroller à droite si on n'est pas à la fin (avec marge de 10px)
		setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
	};

	/**
	 * Scroll vers la gauche (environ 300px)
	 */
	const scrollLeft = () => {
		scrollContainerRef.current?.scrollBy({
			left: -300,
			behavior: "smooth",
		});
	};

	/**
	 * Scroll vers la droite (environ 300px)
	 */
	const scrollRight = () => {
		scrollContainerRef.current?.scrollBy({
			left: 300,
			behavior: "smooth",
		});
	};

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

		// Listen to resize (pour recalculer si la taille change)
		const resizeObserver = new ResizeObserver(checkScrollPosition);
		resizeObserver.observe(container);

		return () => {
			container.removeEventListener("scroll", checkScrollPosition);
			resizeObserver.disconnect();
		};
	}, []);

	return (
		<div ref={containerRef} className={cn("relative group/carousel", className)}>
			{/* Flèche gauche - Desktop uniquement, visible au survol */}
			{showArrows && (
				<Button
				variant="outline"
				size="icon"
				onClick={scrollLeft}
				disabled={!canScrollLeft}
				className={cn(
					// Position absolue - centrée verticalement, à l'intérieur du container
					"absolute left-4 top-[45%] -translate-y-1/2 z-20",
					// Caché sur mobile/tablet, visible desktop uniquement
					"hidden lg:flex",
					// Caché par défaut, visible au survol du groupe
					"opacity-0 group-hover/carousel:opacity-100",
					// Style simple avec fond card et bordure dorée
					"rounded-full bg-card border-2 border-secondary",
					// Shadow pour profondeur
					"shadow-lg hover:shadow-xl",
					// Icône dorée (secondary)
					"text-secondary",
					// Hover state - fond doré avec texte contrasté
					"hover:bg-secondary hover:text-secondary-foreground hover:scale-105",
					// Cursor pointer pour indiquer l'interactivité
					"cursor-pointer",
					// Disabled state - reste caché même au survol
					"disabled:opacity-0 disabled:cursor-not-allowed disabled:hover:scale-100",
					// Transition fluide
					"transition-all duration-300 ease-out"
				)}
				aria-label="Voir les collections précédentes"
			>
				<ChevronLeft className="h-6 w-6" />
			</Button>
			)}

			{/* Contenu du carousel (Server Component) */}
			{children}

			{/* Flèche droite - Desktop uniquement, visible au survol */}
			{showArrows && (
				<Button
				variant="outline"
				size="icon"
				onClick={scrollRight}
				disabled={!canScrollRight}
				className={cn(
					// Position absolue - centrée verticalement, à l'intérieur du container
					"absolute right-4 top-[45%] -translate-y-1/2 z-20",
					// Caché sur mobile/tablet, visible desktop uniquement
					"hidden lg:flex",
					// Caché par défaut, visible au survol du groupe
					"opacity-0 group-hover/carousel:opacity-100",
					// Style simple avec fond card et bordure dorée
					"rounded-full bg-card border-2 border-secondary",
					// Shadow pour profondeur
					"shadow-lg hover:shadow-xl",
					// Icône dorée (secondary)
					"text-secondary",
					// Hover state - fond doré avec texte contrasté
					"hover:bg-secondary hover:text-secondary-foreground hover:scale-105",
					// Cursor pointer pour indiquer l'interactivité
					"cursor-pointer",
					// Disabled state - reste caché même au survol
					"disabled:opacity-0 disabled:cursor-not-allowed disabled:hover:scale-100",
					// Transition fluide
					"transition-all duration-300 ease-out"
				)}
				aria-label="Voir les collections suivantes"
			>
				<ChevronRight className="h-6 w-6" />
			</Button>
			)}
		</div>
	);
}
