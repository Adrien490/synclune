"use client";

import { cn } from "@/shared/utils/cn";
import { type ReactNode, useEffect, useRef, useState } from "react";

interface TableScrollContainerProps {
	children: ReactNode;
	className?: string;
	/**
	 * Nom accessible de la région scrollable (`aria-label` du `role=region`).
	 * À aligner sur le `caption` de la `<Table>` enfant pour que les screen
	 * readers annoncent le bon contexte (« Liste des commandes » plutôt que le
	 * fallback générique).
	 */
	label?: string;
	/**
	 * Borne la hauteur du conteneur et active le scroll vertical interne, ce qui
	 * permet à un `<thead>` en `position: sticky` de coller.
	 *
	 * Nécessaire parce que `overflow-x: auto` fait déjà de ce conteneur un
	 * contexte de défilement : un `<thead>` sticky s'y ancre, pas au scroll de la
	 * page. Sans hauteur bornée, il n'y a jamais de défilement interne et le
	 * sticky ne se déclenche donc jamais.
	 */
	maxHeightClassName?: string;
}

/**
 * Container pour tables avec indicateurs de scroll horizontal
 * Affiche des gradients pour indiquer qu'il y a plus de contenu
 * visible uniquement sur mobile/tablet
 */
export function TableScrollContainer({
	children,
	className,
	label = "Tableau avec scroll horizontal",
	maxHeightClassName,
}: TableScrollContainerProps) {
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
				className={cn(
					"focus-ring overflow-x-auto",
					maxHeightClassName && `${maxHeightClassName} overflow-y-auto`,
				)}
				// Défilement horizontal jusqu'au bord gauche de l'écran, où vit le geste
				// d'ouverture du menu (`useEdgeSwipe`) : sans opt-out, faire défiler la
				// table depuis ce bord ouvrait aussi le menu.
				data-no-edge-swipe
				// eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable container needs keyboard access
				tabIndex={0}
				role="region"
				aria-label={label}
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
