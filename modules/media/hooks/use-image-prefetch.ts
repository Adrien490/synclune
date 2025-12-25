"use client";

import { useEffect } from "react";

interface UsePrefetchImagesOptions {
	/** URLs des images à prefetch */
	imageUrls: string[];
	/** Index actuel dans le carousel */
	currentIndex: number;
	/** Nombre d'images à prefetch avant et après l'index actuel */
	prefetchRange?: number;
	/** Activer le prefetch (désactiver si préfère économiser la bande passante) */
	enabled?: boolean;
}

/**
 * Polyfill pour requestIdleCallback (Safari, Edge < 79)
 * Utilise setTimeout comme fallback avec priorité basse
 */
const requestIdleCallbackPolyfill =
	typeof window !== "undefined" && "requestIdleCallback" in window
		? window.requestIdleCallback
		: (callback: IdleRequestCallback, options?: IdleRequestOptions) => {
				const start = Date.now();
				return setTimeout(() => {
					callback({
						didTimeout: false,
						timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
					});
				}, 1) as unknown as number;
			};

const cancelIdleCallbackPolyfill =
	typeof window !== "undefined" && "cancelIdleCallback" in window
		? window.cancelIdleCallback
		: (id: number) => clearTimeout(id);

/**
 * Hook pour prefetch intelligent des images dans un carousel
 *
 * Stratégie de prefetch (Next.js 16 + React 19 best practices) :
 * 1. Prefetch images adjacentes (suivante + précédente)
 * 2. Utilise requestIdleCallback pour ne pas bloquer le main thread (avec polyfill Safari)
 * 3. Crée des éléments <link rel="prefetch"> dans le <head>
 * 4. Nettoie automatiquement les prefetch inutilisés
 * 5. Protection SSR (vérifie window)
 * 6. Sécurité XSS (pas d'injection dans querySelector)
 *
 * @example
 * usePrefetchImages({
 *   imageUrls: gallery.map(img => img.url),
 *   currentIndex: 2,
 *   prefetchRange: 2, // Prefetch 2 images avant et après
 * })
 */
export function usePrefetchImages({
	imageUrls,
	currentIndex,
	prefetchRange = 1,
	enabled = true,
}: UsePrefetchImagesOptions) {
	useEffect(() => {
		// Protection SSR : vérifier que window existe
		if (typeof window === "undefined") return;
		if (!enabled || imageUrls.length === 0) return;

		// Calculer les index à prefetch (avec wrap pour carousel circulaire)
		const indicesToPrefetch: number[] = [];
		for (let i = 1; i <= prefetchRange; i++) {
			// Images suivantes
			indicesToPrefetch.push((currentIndex + i) % imageUrls.length);
			// Images précédentes
			indicesToPrefetch.push(
				(currentIndex - i + imageUrls.length) % imageUrls.length
			);
		}

		// Utiliser requestIdleCallback avec polyfill pour Safari
		const prefetchId = requestIdleCallbackPolyfill(
			() => {
				for (const index of indicesToPrefetch) {
					const imageUrl = imageUrls[index];
					if (!imageUrl) continue;

					// Sécurité : vérifier si déjà prefetch sans injection SQL/XSS
					// On récupère tous les links et on filtre en JS plutôt que via querySelector avec interpolation
					const allGalleryLinks = Array.from(
						document.querySelectorAll<HTMLLinkElement>(
							'link[rel="prefetch"][data-prefetched-by="gallery"]'
						)
					);

					const existingLink = allGalleryLinks.find((link) => link.href === imageUrl);
					if (existingLink) continue;

					// Créer link prefetch
					const link = document.createElement("link");
					link.rel = "prefetch";
					link.as = "image";
					link.href = imageUrl;
					link.dataset.prefetchedBy = "gallery";

					document.head.appendChild(link);
				}

				// Cleanup: supprimer les anciens prefetch qui ne sont plus adjacents
				const allPrefetchLinks = Array.from(
					document.querySelectorAll<HTMLLinkElement>(
						'link[rel="prefetch"][data-prefetched-by="gallery"]'
					)
				);

				const currentUrls = new Set(
					indicesToPrefetch.map((i) => imageUrls[i]).filter(Boolean)
				);

				for (const link of allPrefetchLinks) {
					if (!currentUrls.has(link.href)) {
						link.remove();
					}
				}
			},
			{ timeout: 1000 }
		);

		return () => {
			cancelIdleCallbackPolyfill(prefetchId);
		};
	}, [imageUrls, currentIndex, prefetchRange, enabled]);
}
