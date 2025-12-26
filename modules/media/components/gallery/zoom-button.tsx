"use client";

import { ZoomIn } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "@/shared/hooks";

interface GalleryZoomButtonProps {
	onOpen: () => void;
}

export function GalleryZoomButton({ onOpen }: GalleryZoomButtonProps) {
	const prefersReduced = useReducedMotion();

	return (
		<button
			type="button"
			onClick={onOpen}
			className={cn(
				"hidden sm:flex absolute top-4 right-4 z-20",
				"bg-black/60 backdrop-blur-sm text-white",
				"px-2.5 py-1.5 rounded-full text-sm font-medium shadow-lg",
				"items-center gap-1.5 hover:bg-black/80",
				!prefersReduced && "active:scale-95 transition-all",
				"sm:opacity-0 sm:group-hover:opacity-100",
				"focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white"
			)}
			aria-label="Zoomer l'image en plein écran"
		>
			<ZoomIn className="w-4 h-4" />
			<span>Zoomer</span>
		</button>
	);
}
