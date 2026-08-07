"use client";

import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
	window.addEventListener("scroll", onStoreChange, { passive: true });
	return () => window.removeEventListener("scroll", onStoreChange);
}

/**
 * Détecte si on a scrollé au-delà d'un seuil.
 *
 * Utilise un scroll listener passif plutôt qu'IntersectionObserver pour garantir
 * un état initial correct même quand threshold > hauteur du viewport.
 *
 * ⚠️ `useSyncExternalStore` et non `useState` + `useEffect` : c'est la primitive
 * de la maison pour un signal navigateur (`use-media-query`, `use-mobile`,
 * `use-touch-device`, `visual-viewport-bridge`), et elle donne gratuitement ce
 * que l'effet devait rattraper à la main — la lecture de `window.scrollY` au
 * PREMIER rendu client (page déjà défilée au montage, ou restauration de scroll
 * après navigation arrière) au lieu d'un `false` corrigé après paint.
 *
 * @param threshold - Seuil de scroll en pixels (défaut: 10)
 * @returns true si scrollY > threshold
 */
export function useIsScrolled(threshold: number = 10): boolean {
	return useSyncExternalStore(
		subscribe,
		() => window.scrollY > threshold,
		() => false,
	);
}
