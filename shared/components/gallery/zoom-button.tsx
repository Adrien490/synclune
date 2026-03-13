"use client";

import { ZoomIn } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "motion/react";

let lightboxPrefetched = false;
function prefetchLightbox() {
	if (lightboxPrefetched) return;
	lightboxPrefetched = true;
	void import("@/modules/media/components/media-lightbox");
}

interface GalleryZoomButtonProps {
	onOpen: () => void;
}

export function GalleryZoomButton({ onOpen }: GalleryZoomButtonProps) {
	const prefersReduced = useReducedMotion();

	return (
		<button
			type="button"
			onClick={onOpen}
			onMouseEnter={prefetchLightbox}
			onFocus={prefetchLightbox}
			className={cn(
				"absolute top-4 right-4 z-20 hidden sm:flex",
				"bg-black/60 text-white backdrop-blur-sm",
				"size-11 rounded-full shadow-lg",
				"items-center justify-center hover:bg-black/80",
				!prefersReduced && "transition-[transform,opacity] active:scale-95",
				"sm:opacity-0 sm:group-hover:opacity-100",
				"focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2",
			)}
			aria-label="Zoomer l'image en plein écran"
		>
			<ZoomIn className="size-5" aria-hidden="true" />
		</button>
	);
}
