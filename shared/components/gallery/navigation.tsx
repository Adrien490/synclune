"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "@/shared/hooks";

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
					"absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10",
					"size-12 md:size-11 rounded-full bg-primary",
					"shadow-lg hover:shadow-xl text-primary-foreground",
					"hover:bg-primary/90",
					scaleClass,
					"hidden sm:flex sm:opacity-0 sm:group-hover:opacity-100",
					transitionClass
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
					"absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10",
					"size-12 md:size-11 rounded-full bg-primary",
					"shadow-lg hover:shadow-xl text-primary-foreground",
					"hover:bg-primary/90",
					scaleClass,
					"hidden sm:flex sm:opacity-0 sm:group-hover:opacity-100",
					transitionClass
				)}
				onClick={onNext}
				aria-label="Image suivante"
			>
				<ChevronRight className="size-5" aria-hidden="true" />
			</Button>
		</>
	);
}
