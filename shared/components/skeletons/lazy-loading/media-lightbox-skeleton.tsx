"use client";

import { Loader2 } from "lucide-react";

/**
 * Skeleton de chargement pour le Media Lightbox
 * Affiche un overlay sombre avec spinner centre
 */
export function MediaLightboxSkeleton() {
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
			role="status"
			aria-busy="true"
			aria-label="Chargement de la galerie"
		>
			<Loader2 className="size-8 text-white animate-spin" />
			<span className="sr-only">Chargement de la galerie...</span>
		</div>
	);
}
