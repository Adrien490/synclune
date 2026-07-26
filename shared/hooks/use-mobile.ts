"use client";

import { useSyncExternalStore } from "react";

import { mediaBelow } from "@/shared/constants/breakpoints";

/**
 * Media query du seuil mobile — `(width < 48rem)`, dérivée du SSOT.
 *
 * Exportée pour les utilities qui doivent interroger le même seuil hors d'un
 * composant React (ex: `shared/utils/toast.ts`). **En rem** : voir la note
 * d'architecture de `shared/constants/breakpoints.ts` — un seuil en px se
 * désynchronise des breakpoints Tailwind dès que la police racine change.
 */
export const MOBILE_MEDIA_QUERY = mediaBelow("md");

/**
 * Hook pour detecter si l'ecran est en mode mobile (largeur < 48rem, soit 768px
 * a police racine par defaut)
 *
 * Difference avec useIsTouchDevice:
 * - useIsMobile: detecte la LARGEUR d'ecran (responsive layout)
 * - useIsTouchDevice: detecte la CAPACITE tactile (interactions)
 *
 * Exemples:
 * - iPad Pro paysage: useIsMobile=false (1024px), useIsTouchDevice=true
 * - Laptop petit ecran: useIsMobile=true, useIsTouchDevice=false
 *
 * Cas d'usage:
 * - Adapter le nombre de colonnes d'une grille
 * - Changer la taille des polices
 * - Afficher/masquer des elements selon la taille
 *
 * Implementation:
 * - useSyncExternalStore (React 19) pour SSR-safe
 * - Reactif aux changements de taille (resize, rotation)
 * - Fallback SSR: false (desktop par defaut)
 *
 * @returns true si ecran < 48rem, false sinon
 */
export function useIsMobile() {
	return useSyncExternalStore(
		// Subscribe: écoute les changements de media query
		(listener) => {
			const mql = window.matchMedia(MOBILE_MEDIA_QUERY);
			mql.addEventListener("change", listener);
			return () => mql.removeEventListener("change", listener);
		},
		// getSnapshot: uses matchMedia for consistency with the subscribe method
		() => window.matchMedia(MOBILE_MEDIA_QUERY).matches,
		// getServerSnapshot: fallback SSR (false = desktop par défaut)
		() => false,
	);
}
