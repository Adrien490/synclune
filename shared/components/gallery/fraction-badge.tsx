"use client";

import { cn } from "@/shared/utils/cn";

interface GalleryFractionBadgeProps {
	current: number;
	total: number;
	/** Classes de positionnement/échelle (le badge ne se positionne pas lui-même) */
	className?: string;
	/** Séparateur entre current et total (" / " desktop, "/" compact mobile) */
	separator?: string;
}

/**
 * Badge visuel "X / N" partagé (pill verre dépoli).
 * Purement décoratif : l'annonce lecteur d'écran est portée par l'unique
 * région `sr-only` aria-live de la galerie (cf. gallery.tsx). aria-hidden ici.
 */
export function GalleryFractionBadge({
	current,
	total,
	className,
	separator = " / ",
}: GalleryFractionBadgeProps) {
	return (
		<div
			className={cn("rounded-full bg-black/60 text-white tabular-nums backdrop-blur-sm", className)}
			aria-hidden="true"
		>
			{current + 1}
			{separator}
			{total}
		</div>
	);
}
