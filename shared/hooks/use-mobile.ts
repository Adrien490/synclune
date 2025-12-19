import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Hook pour detecter si l'ecran est en mode mobile (largeur < 768px)
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
 * @returns true si ecran < 768px, false sinon
 */
export function useIsMobile() {
	return useSyncExternalStore(
		// Subscribe: écoute les changements de media query
		(listener) => {
			const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
			mql.addEventListener("change", listener);
			return () => mql.removeEventListener("change", listener);
		},
		// getSnapshot: retourne la valeur côté client
		() => window.innerWidth < MOBILE_BREAKPOINT,
		// getServerSnapshot: fallback SSR (false = desktop par défaut)
		() => false
	);
}
