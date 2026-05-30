"use client";

import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "motion/react";
import { GalleryFractionBadge } from "./fraction-badge";

interface GalleryDotsProps {
	current: number;
	total: number;
	onSelect: (index: number) => void;
}

export function GalleryDots({ current, total, onSelect }: GalleryDotsProps) {
	const prefersReduced = useReducedMotion();

	// >5 images = fraction counter (ultra compact, visuel only)
	if (total > 5) {
		return (
			<div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 touch-manipulation sm:hidden">
				<GalleryFractionBadge
					current={current}
					total={total}
					className="px-2.5 py-1 text-xs font-medium"
					separator="/"
				/>
			</div>
		);
	}

	// ≤5 images = dots compacts (pager tactile) avec touch targets WCAG (44px minimum).
	// role="group" et non "tablist" : la bande de vignettes est l'unique tablist canonique
	// (évite deux jeux d'onglets identiques pour les lecteurs d'écran).
	return (
		<div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 touch-manipulation sm:hidden">
			<div
				className="flex touch-manipulation items-center gap-1 rounded-full bg-black/50 px-1 py-0.5 backdrop-blur-sm"
				role="group"
				aria-label="Navigation galerie"
			>
				{Array.from({ length: total }).map((_, i) => (
					<button
						key={i}
						type="button"
						onClick={() => onSelect(i)}
						aria-label={`Image ${i + 1} sur ${total}`}
						aria-current={i === current ? "true" : undefined}
						className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50 focus-visible:outline-none"
					>
						<span
							className={cn(
								"rounded-full",
								!prefersReduced && "transition-all duration-200",
								i === current ? "size-2.5 bg-white ring-1 ring-white/50" : "size-2 bg-white/80",
							)}
						/>
					</button>
				))}
			</div>
		</div>
	);
}
