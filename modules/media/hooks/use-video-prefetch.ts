"use client";

import { useEffect, useRef } from "react";
import type { ProductMedia } from "../types/product-media.types";

interface UsePrefetchVideosOptions {
	/** Médias de la galerie */
	medias: ProductMedia[];
	/** Index actuel dans le carousel */
	currentIndex: number;
	/** Nombre de slides à prefetch avant et après l'index actuel */
	prefetchRange?: number;
	/** Activer le prefetch */
	enabled?: boolean;
}

/**
 * Hook pour prefetch intelligent des métadonnées vidéo dans un carousel
 *
 * Stratégie de prefetch :
 * 1. Identifie les vidéos adjacentes (N-1, N+1)
 * 2. Crée des éléments <video preload="metadata"> cachés
 * 3. Précharge uniquement les métadonnées (pas la vidéo complète)
 * 4. Nettoie automatiquement les vidéos non adjacentes
 */
export function usePrefetchVideos({
	medias,
	currentIndex,
	prefetchRange = 1,
	enabled = true,
}: UsePrefetchVideosOptions) {
	const prefetchedVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!enabled || medias.length === 0) return;

		// Calculer les index à prefetch (avec wrap pour carousel circulaire)
		const indicesToPrefetch: number[] = [];
		for (let i = 1; i <= prefetchRange; i++) {
			indicesToPrefetch.push((currentIndex + i) % medias.length);
			indicesToPrefetch.push((currentIndex - i + medias.length) % medias.length);
		}

		// URLs des vidéos à précharger
		const videoUrlsToPrefetch = new Set<string>();

		for (const index of indicesToPrefetch) {
			const media = medias[index];
			if (media?.mediaType === "VIDEO" && media.url) {
				videoUrlsToPrefetch.add(media.url);
			}
		}

		// Créer les éléments video pour précharger les métadonnées
		for (const url of videoUrlsToPrefetch) {
			if (prefetchedVideosRef.current.has(url)) continue;

			const video = document.createElement("video");
			video.preload = "metadata";
			video.src = url;
			video.muted = true;
			video.style.display = "none";
			video.setAttribute("aria-hidden", "true");

			// Pas besoin d'ajouter au DOM pour le preload
			prefetchedVideosRef.current.set(url, video);
		}

		// Cleanup: supprimer les vidéos qui ne sont plus adjacentes
		for (const [url, video] of prefetchedVideosRef.current) {
			if (!videoUrlsToPrefetch.has(url)) {
				video.src = "";
				video.load();
				prefetchedVideosRef.current.delete(url);
			}
		}

		return () => {
			// Cleanup au unmount
			for (const [, video] of prefetchedVideosRef.current) {
				video.src = "";
				video.load();
			}
			prefetchedVideosRef.current.clear();
		};
	}, [medias, currentIndex, prefetchRange, enabled]);
}
