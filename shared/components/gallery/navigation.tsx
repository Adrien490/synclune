"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "motion/react";

interface GalleryNavigationProps {
	onPrev: () => void;
	onNext: () => void;
}

export function GalleryNavigation({ onPrev, onNext }: GalleryNavigationProps) {
	const prefersReduced = useReducedMotion();
	// Utilise uniquement les propriétés composables (transform, opacity)
	const transitionClass = prefersReduced ? "" : "transition-[transform,opacity] duration-300";
	const scaleClass = prefersReduced ? "" : "hover:scale-105 active:scale-95";

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				className={cn(
					"absolute top-1/2 left-2 z-10 -translate-y-1/2 sm:left-4",
					"bg-primary size-12 rounded-full md:size-11",
					"text-primary-foreground shadow-lg hover:shadow-xl",
					"hover:bg-primary/90",
					scaleClass,
					// Masqué-puis-révélé au survol UNIQUEMENT là où le hover existe (can-hover) :
					// sur tablette tactile ≥ sm, la flèche reste visible en permanence — le tap
					// qui déclencherait le sticky-hover ouvre la lightbox, pas la révélation.
					"sm:can-hover:opacity-0 sm:can-hover:group-hover:opacity-100 hidden sm:flex",
					// WCAG 2.4.7 — visible au focus clavier (et révélé à l'arrivée du focus dans la galerie)
					"sm:group-focus-within:opacity-100 sm:focus-visible:opacity-100",
					transitionClass,
				)}
				onClick={onPrev}
				aria-label="Image précédente"
			>
				<ChevronLeft className="size-5" aria-hidden="true" />
			</Button>
			<Button
				variant="ghost"
				size="icon"
				className={cn(
					"absolute top-1/2 right-2 z-10 -translate-y-1/2 sm:right-4",
					"bg-primary size-12 rounded-full md:size-11",
					"text-primary-foreground shadow-lg hover:shadow-xl",
					"hover:bg-primary/90",
					scaleClass,
					// Masqué-puis-révélé au survol UNIQUEMENT là où le hover existe (can-hover) :
					// sur tablette tactile ≥ sm, la flèche reste visible en permanence — le tap
					// qui déclencherait le sticky-hover ouvre la lightbox, pas la révélation.
					"sm:can-hover:opacity-0 sm:can-hover:group-hover:opacity-100 hidden sm:flex",
					// WCAG 2.4.7 — visible au focus clavier (et révélé à l'arrivée du focus dans la galerie)
					"sm:group-focus-within:opacity-100 sm:focus-visible:opacity-100",
					transitionClass,
				)}
				onClick={onNext}
				aria-label="Image suivante"
			>
				<ChevronRight className="size-5" aria-hidden="true" />
			</Button>
		</>
	);
}
