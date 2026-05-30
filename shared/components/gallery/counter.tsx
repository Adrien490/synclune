"use client";

import { GalleryFractionBadge } from "./fraction-badge";

interface GalleryCounterProps {
	current: number;
	total: number;
}

/**
 * Compteur "X / N" visible (desktop, top-left).
 * Visuel only — l'annonce SR est portée par l'unique région aria-live de la galerie.
 */
export function GalleryCounter({ current, total }: GalleryCounterProps) {
	return (
		<div className="absolute top-3 left-3 z-20 hidden sm:top-4 sm:left-4 sm:block">
			<GalleryFractionBadge
				current={current}
				total={total}
				className="px-2.5 py-1 text-xs font-medium shadow-lg sm:px-3 sm:py-1.5 sm:text-sm"
			/>
		</div>
	);
}
